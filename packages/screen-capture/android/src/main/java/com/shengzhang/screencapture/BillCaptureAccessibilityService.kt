package com.shengzhang.screencapture

import android.accessibilityservice.AccessibilityButtonController
import android.accessibilityservice.AccessibilityService
import android.app.KeyguardManager
import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import android.widget.Toast
import java.util.UUID
import java.util.concurrent.Executors

class BillCaptureAccessibilityService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private val ioExecutor = Executors.newSingleThreadExecutor()
  private val gate = OverlayTaskGate()
  @Volatile private var task: OverlayTask? = null
  @Volatile private var settings: OverlaySettings? = null
  private var categories = emptyList<OverlayCategory>()
  private var jpeg: ByteArray? = null
  @Volatile private var cloud: OverlayCloudClient? = null
  private var captureStartedAt = 0L
  private val windowTracker by lazy { CaptureWindowTracker(packageName) }
  private var expectedPackage: String? = null
  @Volatile private var expectedWindow: CaptureWindowIdentity? = null
  @Volatile private var foregroundPackage: String? = null
  private var captureWidth: Int? = null
  private var captureHeight: Int? = null
  private var captureBytes: Int? = null
  private var saving = false
  private var displayFallbackActive = false
  private val overlay by lazy { BillOverlayController(this, { cancelCurrent() }, { retryCloud() }, { save(it) }) }
  private val buttonCallback = object : AccessibilityButtonController.AccessibilityButtonCallback() {
    override fun onClicked(controller: AccessibilityButtonController) { beginCapture() }
  }
  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == Intent.ACTION_SCREEN_OFF) cancelCurrent()
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    PendingCaptureStore.purgeExpired(this)
    accessibilityButtonController.registerAccessibilityButtonCallback(buttonCallback, handler)
    val screenFilter = IntentFilter(Intent.ACTION_SCREEN_OFF)
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenReceiver, screenFilter, Context.RECEIVER_NOT_EXPORTED)
    else { @Suppress("DEPRECATION") registerReceiver(screenReceiver, screenFilter) }
    CaptureShortcuts.publish(this)
    OverlayConfiguration.floatingEnabled(this) // Remove the retired preference on upgrade.
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType !in setOf(AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED, AccessibilityEvent.TYPE_WINDOWS_CHANGED)) return
    CaptureWindowTrace.event(this, event.eventType, event.windowId, event.packageName?.toString(), packageName)
    if (task != null && getSystemService(KeyguardManager::class.java).isKeyguardLocked) {
      CaptureWindowTrace.cancelled(this, "keyguard"); cancelCurrent(); return
    }
    if (event.eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED && (event.windowChanges and AccessibilityEvent.WINDOWS_CHANGE_REMOVED) != 0) {
      windowTracker.forget(event.windowId)
      val current = task
      val source = expectedWindow
      if (current != null && source?.windowId == event.windowId) {
        cancelForWindowChange(CaptureWindowCheck(current, source)); return
      }
    }
    val packageValue = event.packageName?.toString().orEmpty()
    val inputMethod = packageValue.isNotEmpty() && packageValue != SYSTEM_UI_PACKAGE && isInputMethod(packageValue)
    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
      !inputMethod && CaptureDisplayRules.isTargetPackage(packageValue)) {
      foregroundPackage = packageValue
    }
    // Window identity only. No node text, descriptions, children, or ongoing OCR.
    if (packageValue == packageName) {
      val className = event.className?.toString().orEmpty()
      // Overlay view events belong to this package too. Main/share Activities,
      // however, mean that the user really left the original payment page.
      if (className.endsWith("MainActivity") || className.endsWith("ShareBillActivity")) {
        if (task != null) {
          CaptureWindowTrace.cancelled(this, "own_activity")
          record(CaptureDiagnostic.ERROR_WINDOW_CHANGED); cancelCurrent()
        }
      }
      return
    }
    val source = expectedWindow
    var observed: CaptureWindowIdentity? = null
    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      // An IME/SystemUI event must not advance the bound application's revision,
      // even if an OEM reports its event using the underlying window's id.
      if ((packageValue != SYSTEM_UI_PACKAGE && !inputMethod) || event.windowId != source?.windowId) {
        observed = windowTracker.observe(event.windowId, packageValue)
      }
    }
    val current = task ?: return
    if (displayFallbackActive && event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
      packageValue.isNotBlank() && !inputMethod && packageValue != SYSTEM_UI_PACKAGE &&
      packageValue != foregroundPackage) {
      cancelForFallbackWindowChange()
      return
    }
    if (event.eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED && displayFallbackActive) {
      // List churn from our own overlay, SystemUI or the IME must never cancel
      // a card that is already showing a confirmed bill.
      if (packageValue.isBlank() || packageValue == packageName ||
        packageValue == SYSTEM_UI_PACKAGE || inputMethod) return
      handler.post {
        if (!gate.isCurrent(current, System.currentTimeMillis()) || !displayFallbackActive) return@post
        if (windowSelection() != CaptureWindowSelection.Unconfirmed) cancelForFallbackWindowChange()
      }
      return
    }
    if (source == null) return
    val check = CaptureWindowCheck(current, source)
    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
      CaptureSourceRules.eventInvalidates(source, packageValue, observed, packageName, inputMethod)) {
      val rebound = observed?.takeIf {
        // Our shortcut activity briefly takes focus and makes the payment app
        // emit a fresh state event. Before the screenshot exists there is no
        // draft to protect, so bind to the newer state instead of canceling
        // what is actually the first valid view of this capture.
        CaptureSourceRules.rebindsBeforeCapture(source, it, captured = jpeg != null)
      }
      if (rebound != null) {
        expectedPackage = rebound.packageName
        expectedWindow = rebound
      } else {
        // After the screenshot, a new revision invalidates both pending cloud
        // work and the displayed draft.
        cancelForWindowChange(check)
      }
    } else if (event.eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
      handler.post {
        if (!check.appliesTo(task, expectedWindow) || !gate.isCurrent(check.task, System.currentTimeMillis())) return@post
        val selection = windowSelection()
        if (!windowTracker.unchanged(check.source) || CaptureSourceRules.selectionInvalidates(check.source, selection)) {
          cancelForWindowChange(check)
        }
      }
    }
  }

  private fun isInputMethod(value: String): Boolean = runCatching {
    val manager = getSystemService(Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
    manager.enabledInputMethodList.any { it.packageName == value }
  }.getOrDefault(false)

  override fun onInterrupt() { handler.post { cancelCurrent() } }

  override fun onDestroy() {
    if (instance === this) instance = null
    cancelCurrent()
    runCatching { accessibilityButtonController.unregisterAccessibilityButtonCallback(buttonCallback) }
    runCatching { unregisterReceiver(screenReceiver) }
    handler.removeCallbacksAndMessages(null)
    // Queued screenshot jobs own hardware buffers even when their body never runs.
    ioExecutor.shutdownNow().filterIsInstance<AutoCloseable>().forEach { runCatching { it.close() } }
    super.onDestroy()
  }

  fun configurationChanged() { handler.post { cancelCurrent() } }

  fun beginCapture() { handler.post { startCapture() } }

  private fun startCapture() {
    val now = System.currentTimeMillis()
    if (now - captureStartedAt < 700L || saving) return
    captureStartedAt = now
    cancelCurrent()
    CaptureDiagnostics.clear(this)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) { notifyFailure(CaptureDiagnostic.ERROR_ANDROID_VERSION); return }
    if (!getSystemService(PowerManager::class.java).isInteractive || getSystemService(KeyguardManager::class.java).isKeyguardLocked) {
      notifyFailure(CaptureDiagnostic.ERROR_DEVICE_LOCKED); return
    }
    val configured = OverlayConfiguration.read(this)
    if (configured == null) { notifyFailure(CaptureDiagnostic.ERROR_CONFIGURATION); return }
    if (!configured.cloudEnabled) { notifyFailure(CaptureDiagnostic.ERROR_CLOUD_DISABLED); return }
    settings = configured
    val current = gate.start(UUID.randomUUID().toString(), now)
    task = current
    PendingCaptureStore.purgeExpired(this)
    handler.postDelayed({
      if (task == current) { notifyFailure(CaptureDiagnostic.ERROR_EXPIRED); cancelCurrent() }
    }, OverlayTaskGate.MAX_AGE_MS)
    ioExecutor.execute {
      try {
        val available = OverlayLedger.readCategories(this, configured)
        handler.post {
          if (!isActive(current)) return@post
          categories = available
          collectCurrentWindow(current, 0, CaptureWindowStability(), CaptureShadeRetry(), CaptureDisplayStability())
        }
      } catch (error: Exception) {
        handler.post { failCapture(current, CaptureDiagnostic.ERROR_LEDGER_NOT_READY) }
      }
    }
  }

  private fun observeCurrentWindow(): CaptureWindowObservation {
    val snapshots = runCatching { windows.map { window ->
      val root = runCatching { window.root }.getOrNull()
      val pkg = try { runCatching { root?.packageName?.toString() }.getOrNull() } finally { root?.let { recycle(it) } }
      CaptureWindowSnapshot(window.id, when (window.type) {
        AccessibilityWindowInfo.TYPE_APPLICATION -> CaptureWindowRole.APPLICATION
        AccessibilityWindowInfo.TYPE_SYSTEM -> CaptureWindowRole.SYSTEM
        AccessibilityWindowInfo.TYPE_INPUT_METHOD -> CaptureWindowRole.INPUT_METHOD
        AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY -> CaptureWindowRole.ACCESSIBILITY_OVERLAY
        else -> CaptureWindowRole.OTHER
      }, window.isActive, window.isFocused, window.layer, pkg)
    } }.getOrDefault(emptyList())
    val root = runCatching { rootInActiveWindow }.getOrNull()
    val active = try { runCatching { root?.packageName?.toString()?.let { CaptureActiveRoot(root.windowId, it) } }.getOrNull() }
      finally { root?.let { recycle(it) } }
    return CaptureWindowObservation(snapshots, active, windowTracker.select(snapshots, active))
  }

  private fun windowSelection(): CaptureWindowSelection = observeCurrentWindow().selection

  private fun collectCurrentWindow(current: OverlayTask, attempt: Int, stability: CaptureWindowStability,
    shadeRetry: CaptureShadeRetry, displayStability: CaptureDisplayStability) {
    if (!isActive(current)) return
    val observation = observeCurrentWindow()
    val selection = observation.selection
    val identity = stability.ready(selection, SystemClock.uptimeMillis())
    val shadeRequested = shadeRetry.shouldRequest(selection, attempt)
    val shadeAccepted = if (shadeRequested) dismissNotificationShade() else false
    CaptureWindowTrace.attempt(this, current.generation, attempt, observation, identity != null,
      shadeRequested, shadeAccepted)
    if (identity != null) {
      displayFallbackActive = false
      expectedPackage = identity.packageName; expectedWindow = identity
      captureScreenshot(current, identity)
      return
    }
    if (selection == CaptureWindowSelection.Unconfirmed &&
      displayStability.ready(CaptureDisplayRules.eligible(observation), SystemClock.uptimeMillis())) {
      captureDisplayScreenshot(current)
      return
    }
    if (attempt < MAX_WINDOW_ATTEMPTS) {
      handler.postDelayed(
        { collectCurrentWindow(current, attempt + 1, stability, shadeRetry, displayStability) },
        120L
      )
    } else failCapture(current, when (selection) {
      CaptureWindowSelection.SystemPanel -> CaptureDiagnostic.ERROR_SYSTEM_PANEL
      CaptureWindowSelection.OtherApp -> CaptureDiagnostic.ERROR_UNSUPPORTED_APP
      else -> CaptureDiagnostic.ERROR_WINDOW_UNCONFIRMED
    })
  }

  private fun dismissNotificationShade(): Boolean = runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
      }
      else {
        // API 30 supports this broadcast. Sending Back could leave the payment page.
        sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
        true
      }
    }.getOrDefault(false)

  private fun sameWindow(expected: CaptureWindowIdentity): Boolean =
    (windowSelection() as? CaptureWindowSelection.Ready)?.identity == expected

  private fun captureScreenshot(current: OverlayTask, expected: CaptureWindowIdentity) {
    if (!isActive(current)) return
    if (!sameWindow(expected)) { failCapture(current, CaptureDiagnostic.ERROR_WINDOW_CHANGED); return }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
    try {
      val callback = object : TakeScreenshotCallback {
        override fun onSuccess(screenshot: ScreenshotResult) {
          if (!isActive(current) || !sameWindow(expected)) {
            screenshot.hardwareBuffer.close()
            if (isActive(current)) failCapture(current, CaptureDiagnostic.ERROR_WINDOW_CHANGED)
            return
          }
          val work = object : Runnable, AutoCloseable {
            override fun close() { screenshot.hardwareBuffer.close() }
            override fun run() {
              val buffer = screenshot.hardwareBuffer
              var hardware: Bitmap? = null
              var software: Bitmap? = null
              try {
                if (!isActive(current)) return
                val width = buffer.width; val height = buffer.height
                hardware = Bitmap.wrapHardwareBuffer(buffer, screenshot.colorSpace)
                software = hardware?.copy(Bitmap.Config.ARGB_8888, false)
                val image = CaptureImageProcessor.encodeJpeg(requireNotNull(software) { "截图无法读取，请重试" })
                handler.post {
                  if (!isActive(current)) return@post
                  if (!sameWindow(expected)) { failCapture(current, CaptureDiagnostic.ERROR_WINDOW_CHANGED); return@post }
                  jpeg = image; captureWidth = width; captureHeight = height; captureBytes = image.size
                  try { overlay.showLoading(current, categories); runCloud(current) }
                  catch (_: Exception) { failCapture(current, CaptureDiagnostic.ERROR_OVERLAY) }
                }
              } catch (_: Exception) {
                handler.post { failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT_DECODE) }
              } finally { software?.recycle(); hardware?.recycle(); close() }
            }
          }
          runCatching { ioExecutor.execute(work) }.onFailure { work.close() }
        }
        override fun onFailure(errorCode: Int) {
          failCapture(current, when (errorCode) {
            ERROR_TAKE_SCREENSHOT_SECURE_WINDOW -> CaptureDiagnostic.ERROR_SCREENSHOT_SECURE
            ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT -> CaptureDiagnostic.ERROR_SCREENSHOT_INTERVAL
            ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS -> CaptureDiagnostic.ERROR_SCREENSHOT_PERMISSION
            ERROR_TAKE_SCREENSHOT_INVALID_WINDOW -> CaptureDiagnostic.ERROR_SCREENSHOT_WINDOW
            else -> CaptureDiagnostic.ERROR_SCREENSHOT
          })
        }
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) takeScreenshotOfWindow(expected.windowId, mainExecutor, callback)
      else takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, callback)
    } catch (_: SecurityException) { failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT_PERMISSION) }
      catch (_: Exception) { failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT) }
  }

  private fun captureDisplayScreenshot(current: OverlayTask) {
    if (!isActive(current) || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
    val sourcePackage = foregroundPackage
    if (!CaptureDisplayRules.isTargetPackage(sourcePackage)) {
      failCapture(current, CaptureDiagnostic.ERROR_WINDOW_UNCONFIRMED); return
    }
    displayFallbackActive = true
    CaptureWindowTrace.displayFallback(this, current.generation, null)
    try {
      takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
        override fun onSuccess(screenshot: ScreenshotResult) {
          if (!isActive(current) || !displayFallbackActive) {
            screenshot.hardwareBuffer.close()
            return
          }
          val buffer = screenshot.hardwareBuffer
          var hardware: Bitmap? = null
          var software: Bitmap? = null
          try {
            val width = buffer.width
            val height = buffer.height
            hardware = Bitmap.wrapHardwareBuffer(buffer, screenshot.colorSpace)
            software = hardware?.copy(Bitmap.Config.ARGB_8888, false)
              ?: throw IllegalStateException("截图无法读取")
            val image = CaptureImageProcessor.encodeJpeg(software)
            handler.post {
              if (!isActive(current) || !displayFallbackActive) return@post
              expectedPackage = sourcePackage
              jpeg = image; captureWidth = width; captureHeight = height; captureBytes = image.size
              CaptureWindowTrace.displayFallback(
                this@BillCaptureAccessibilityService, current.generation, null, image.size
              )
              try {
                overlay.showLoading(current, categories)
                runCloud(current)
              } catch (_: Exception) {
                failCapture(current, CaptureDiagnostic.ERROR_OVERLAY)
              }
            }
          } catch (_: Exception) {
            handler.post { failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT_DECODE) }
          } finally {
            software?.recycle()
            hardware?.recycle()
            buffer.close()
          }
        }

        override fun onFailure(errorCode: Int) {
          failCapture(current, when (errorCode) {
            ERROR_TAKE_SCREENSHOT_SECURE_WINDOW -> CaptureDiagnostic.ERROR_SCREENSHOT_SECURE
            ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT -> CaptureDiagnostic.ERROR_SCREENSHOT_INTERVAL
            ERROR_TAKE_SCREENSHOT_NO_ACCESSIBILITY_ACCESS -> CaptureDiagnostic.ERROR_SCREENSHOT_PERMISSION
            else -> CaptureDiagnostic.ERROR_SCREENSHOT
          })
        }
      })
    } catch (_: SecurityException) {
      failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT_PERMISSION)
    } catch (_: Exception) {
      failCapture(current, CaptureDiagnostic.ERROR_SCREENSHOT)
    }
  }

  private fun retryCloud() {
    val current = task ?: return
    if (!isActive(current)) { notifyFailure(CaptureDiagnostic.ERROR_EXPIRED); cancelCurrent(); return }
    cloud?.cancel(); overlay.showRetrying(); runCloud(current)
  }

  private fun runCloud(current: OverlayTask) {
    val configured = settings ?: return
    val image = jpeg ?: return
    val client = OverlayCloudClient(); cloud = client
    handler.postDelayed({
      if (isActive(current) && cloud === client) {
        client.cancel(); cloud = null; record(CaptureDiagnostic.ERROR_CLOUD_TIMEOUT)
        overlay.showFailure(CaptureDiagnostic.ERROR_CLOUD_TIMEOUT.message)
      }
    }, 60_000L)
    ioExecutor.execute {
      try {
        val result = client.parse(configured, current, image, categories) { isActive(current) && cloud === client }
        handler.post { if (isActive(current) && cloud === client) {
          cloud = null
          record(when {
            result.blockingReason != null -> CaptureDiagnostic.ERROR_CLOUD_BLOCKED
            result.amountMinor != null -> CaptureDiagnostic.SUCCESS_RECOGNIZED
            result.amountIssue == "unverified" -> CaptureDiagnostic.ERROR_CLOUD_AMOUNT_UNVERIFIED
            else -> CaptureDiagnostic.ERROR_CLOUD_AMOUNT_NOT_READ
          })
          overlay.showResult(result)
        } }
      } catch (error: Exception) {
        handler.post { if (isActive(current) && cloud === client) {
          cloud = null
          val diagnostic = (error as? OverlayCloudException)?.diagnostic ?: CaptureDiagnostic.ERROR_CLOUD_RESPONSE
          record(diagnostic); overlay.showFailure(diagnostic.message)
        } }
      }
    }
  }

  private fun save(input: OverlaySaveInput) {
    val current = task ?: return
    val configured = settings ?: return
    if (saving || current.captureId != input.captureId) return
    saving = true; overlay.showSaving()
    CaptureWindowTrace.saveRequested(this, current.generation)
    ioExecutor.execute {
      try {
        OverlayLedger.save(this, configured, input)
        handler.post {
          ScreenBillEvents.saved()
          record(CaptureDiagnostic.SUCCESS_SAVED)
          CaptureWindowTrace.saveResult(this, "ok")
          // The row is already committed. Never leave the overlay or `saving`
          // stuck just because the source window changed while we were writing.
          if (task !== current) return@post
          notify("这笔收好了"); cancelCurrent(force = true)
        }
      } catch (error: Exception) {
        handler.post {
          CaptureWindowTrace.saveResult(this, "error")
          if (task !== current) return@post
          saving = false; record(CaptureDiagnostic.ERROR_SAVE)
          overlay.showSaveFailure(userMessage(error, CaptureDiagnostic.ERROR_SAVE.message))
        }
      }
    }
  }

  private fun isActive(current: OverlayTask): Boolean = gate.isCurrent(current, System.currentTimeMillis()) &&
    settings?.let { it.cloudEnabled && OverlayConfiguration.read(this) == it } == true && instance === this &&
    (expectedWindow?.let { windowTracker.unchanged(it) } != false)

  private fun cancelForWindowChange(check: CaptureWindowCheck) {
    if (!check.appliesTo(task, expectedWindow) || !gate.isCurrent(check.task, System.currentTimeMillis())) return
    CaptureWindowTrace.cancelled(this, "window_change")
    record(CaptureDiagnostic.ERROR_WINDOW_CHANGED); cancelCurrent()
  }

  private fun cancelForFallbackWindowChange() {
    if (task == null || !displayFallbackActive) return
    CaptureWindowTrace.cancelled(this, "fallback_window_change")
    record(CaptureDiagnostic.ERROR_WINDOW_CHANGED)
    cancelCurrent()
  }

  private fun failCapture(current: OverlayTask, diagnostic: CaptureDiagnostic) {
    if (!isActive(current)) return
    notifyFailure(diagnostic); cancelCurrent()
  }

  private fun cancelCurrent(force: Boolean = false) {
    // A confirmed save owns the card until its transaction finishes. Window
    // events may still arrive, but they must not cancel the write mid-flight.
    if (saving && !force) return
    gate.cancel(); cloud?.cancel(); cloud = null; jpeg = null; task = null; settings = null
    categories = emptyList(); expectedPackage = null; expectedWindow = null
    captureWidth = null; captureHeight = null; captureBytes = null; saving = false
    displayFallbackActive = false
    overlay.close()
  }

  private fun record(diagnostic: CaptureDiagnostic) = CaptureDiagnostics.record(this, diagnostic, expectedPackage,
    captureWidth, captureHeight, captureBytes)
  private fun notifyFailure(diagnostic: CaptureDiagnostic) { record(diagnostic); notify(diagnostic.message) }
  private fun notify(text: String) { Toast.makeText(this, text, Toast.LENGTH_LONG).show() }
  @Suppress("DEPRECATION") private fun recycle(root: AccessibilityNodeInfo) { runCatching { root.recycle() } }

  // Never display raw transport/SQLite/JSON exception bodies (which may contain data).
  private fun userMessage(error: Exception, fallback: String): String = error.message?.takeIf { it in USER_MESSAGES } ?: fallback

  companion object {
    private const val SYSTEM_UI_PACKAGE = "com.android.systemui"
    private const val MAX_WINDOW_ATTEMPTS = 24
    private val USER_MESSAGES = setOf("账本尚未准备好，请先打开声账完成初始化", "账本需要升级，请先打开声账", "分类已变更，请重新选择",
      "这笔记录已删除，请重新触发记账", "请填写大于 0 的金额", "请填写有效时间", "账本备份状态异常，请打开声账后重试",
      "云端识别暂时受限，可直接填写金额和分类后保存，稍后再试", "云端识别暂不可用，请稍后重试", "截图未能识别，请回到付款详情重试", "识别超时，请检查网络后重试",
      "识别结果异常，请重试", "识别结果不完整，请重试", "识别金额异常，请手动填写", "识别时间异常，请手动选择")
    @Volatile var instance: BillCaptureAccessibilityService? = null
      private set
  }
}

fun launchConfirmationScreen(context: Context, captureId: String? = null) {
  val uri = Uri.parse("shengzhang://screen-capture").buildUpon().apply { if (captureId != null) appendQueryParameter("captureId", captureId) }.build()
  val intent = Intent(Intent.ACTION_VIEW, uri).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
  }
  runCatching { context.startActivity(intent) }
}
