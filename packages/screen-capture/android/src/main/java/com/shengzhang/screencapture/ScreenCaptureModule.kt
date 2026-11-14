package com.shengzhang.screencapture

import android.app.StatusBarManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.function.Consumer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

class ScreenCaptureModule : Module() {
  private val context
    get() = appContext.applicationContext

  private val screenBillSavedListener: () -> Unit = {
    sendEvent(ScreenBillEvents.SAVED, emptyMap<String, Any?>())
  }

  override fun definition() = ModuleDefinition {
    Name("ScreenCapture")
    Events(ScreenBillEvents.SAVED)

    OnCreate {
      ScreenBillEvents.attach(screenBillSavedListener)
    }

    OnDestroy {
      ScreenBillEvents.detach(screenBillSavedListener)
    }

    AsyncFunction("getScreenCaptureStatus") {
      val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
      mapOf(
        "supported" to supported,
        "platform" to "android",
        "androidApi" to Build.VERSION.SDK_INT,
        "accessibilityEnabled" to isAccessibilityServiceEnabled(),
        "accessibilityConnected" to (BillCaptureAccessibilityService.instance != null),
        "tileSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N),
        "autoAddTileSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU),
        "tileAdded" to TilePresenceStore.read(context),
        "imageExportSupported" to true,
        "overlaySupported" to supported,
        "floatingButtonEnabled" to OverlayConfiguration.floatingEnabled(context),
        "overlayCloudEnabled" to OverlayConfiguration.cloudEnabled(context),
        "lastCaptureMessage" to CaptureDiagnostics.message(context),
        "lastCaptureCode" to CaptureDiagnostics.code(context),
        "reason" to if (supported) null else "付款页识别需要 Android 11 及以上"
      )
    }

    AsyncFunction("configureScreenOverlay") { values: Map<String, Any?> ->
      OverlayConfiguration.configure(context, values)
      CaptureShortcuts.publish(context)
    }

    AsyncFunction("setScreenOverlayCloudEnabled") { enabled: Boolean ->
      OverlayConfiguration.setCloudEnabled(context, enabled)
    }

    AsyncFunction("setScreenFloatingButtonEnabled") { enabled: Boolean ->
      OverlayConfiguration.setFloatingEnabled(context, enabled)
    }

    AsyncFunction("requestCaptureShortcut") {
      CaptureShortcuts.requestPin(context)
    }

    AsyncFunction("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("requestQuickSettingsTile").Coroutine<Boolean> {
      requestQuickSettingsTile()
    }

    AsyncFunction("getPendingCapture") {
      PendingCaptureStore.readMap(context)
    }

    AsyncFunction("recognizeCaptureImage").Coroutine { captureId: String ->
      val capture = PendingCaptureStore.read(context)
      require(capture?.captureId == captureId) { "待处理账单已失效" }
      val path = capture.screenshotPath
      if (path == null) "" else ScreenOcrProcessor.recognize(File(path))
    }

    AsyncFunction("prepareCaptureImage").Coroutine { captureId: String ->
      withContext(Dispatchers.IO) {
        val capture = PendingCaptureStore.read(context)
        require(capture?.captureId == captureId) { "待处理账单已失效" }
        val path = requireNotNull(capture.screenshotPath) { "没有可用截图，请重新触发快捷记账" }
        CaptureImageProcessor.export(File(path))
      }
    }

    AsyncFunction("clearCapture") { captureId: String ->
      PendingCaptureStore.clear(context, captureId)
    }

    AsyncFunction("openConfirmation") { _: String ->
      launchConfirmationScreen(context)
    }
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    val expected = ComponentName(
      context,
      BillCaptureAccessibilityService::class.java
    )
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ).orEmpty()
    return enabled.split(':').any { value ->
      ComponentName.unflattenFromString(value) == expected
    }
  }

  private suspend fun requestQuickSettingsTile(): Boolean {
    val manager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.getSystemService(StatusBarManager::class.java)
    } else {
      null
    }
    if (manager == null) return false

    return suspendCancellableCoroutine { continuation ->
      manager.requestAddTileService(
        ComponentName(context, BillCaptureTileService::class.java),
        context.getString(R.string.screen_capture_tile_label),
        Icon.createWithResource(context, R.drawable.ic_screen_capture_tile),
        context.mainExecutor,
        Consumer { result ->
          TilePresenceStore.observe(context, when (result) {
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> TilePresenceSignal.REQUEST_ADDED
            StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> TilePresenceSignal.REQUEST_ALREADY_ADDED
            else -> TilePresenceSignal.REQUEST_DECLINED
          })
          val added =
            result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED ||
              result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED
          if (continuation.isActive) continuation.resume(added)
        }
      )
    }
  }
}
