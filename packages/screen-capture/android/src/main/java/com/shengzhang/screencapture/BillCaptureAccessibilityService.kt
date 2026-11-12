package com.shengzhang.screencapture

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityService.TakeScreenshotCallback
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import androidx.annotation.RequiresApi
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.Executors

class BillCaptureAccessibilityService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private val ioExecutor = Executors.newSingleThreadExecutor()
  private var captureStartedAt = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
    PendingCaptureStore.purgeExpired(this)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    if (instance === this) instance = null
    ioExecutor.shutdownNow()
    super.onDestroy()
  }

  fun beginCapture() {
    val now = System.currentTimeMillis()
    if (now - captureStartedAt < 1_500L) return
    captureStartedAt = now
    PendingCaptureStore.purgeExpired(this)

    handler.postDelayed({ collectCurrentWindow(attempt = 0, backSent = false) }, 240L)
  }

  private fun collectCurrentWindow(attempt: Int, backSent: Boolean) {
    val root = rootInActiveWindow
    if (root == null) {
      retryOrNotify(attempt, backSent)
      return
    }

    val packageName = root.packageName?.toString().orEmpty()
    if (packageName == SYSTEM_UI_PACKAGE) {
      recycle(root)
      if (!backSent) {
        // Only send Back while System UI owns the active window. This avoids
        // navigating away from WeChat/Alipay when a vendor already closed the shade.
        performGlobalAction(GLOBAL_ACTION_BACK)
        handler.postDelayed(
          { collectCurrentWindow(attempt = 0, backSent = true) },
          QUICK_SETTINGS_DISMISS_DELAY_MS
        )
      } else {
        retryOrNotify(attempt, backSent = true)
      }
      return
    }

    val sourceApp = when (packageName) {
      "com.tencent.mm" -> "wechat"
      "com.eg.android.AlipayGphone" -> "alipay"
      else -> "unknown"
    }
    if (sourceApp == "unknown") {
      recycle(root)
      retryOrNotify(attempt, backSent)
      return
    }
    val text = collectText(root)
    recycle(root)

    if (PaymentPageTextHeuristics.hasTrustedPaidAmount(text)) {
      finishCapture(sourceApp, text, null)
      return
    }
    captureScreenshotOrFinish(sourceApp, text)
  }

  private fun retryOrNotify(attempt: Int, backSent: Boolean) {
    if (attempt < MAX_WINDOW_ATTEMPTS) {
      handler.postDelayed(
        { collectCurrentWindow(attempt + 1, backSent) },
        WINDOW_RETRY_DELAY_MS
      )
      return
    }
    Toast.makeText(this, "没有识别到微信或支付宝付款页", Toast.LENGTH_SHORT).show()
  }

  private fun recycle(root: AccessibilityNodeInfo) {
    try {
      root.recycle()
    } catch (_: Exception) {
      // Recycling is a no-op on newer Android versions; ignore vendor-specific failures.
    }
  }

  private fun collectText(root: AccessibilityNodeInfo): String {
    val values = LinkedHashSet<String>()
    var visited = 0

    fun visit(node: AccessibilityNodeInfo?) {
      if (node == null || visited >= 260 || values.sumOf { it.length } >= 12_000) return
      visited += 1
      node.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let(values::add)
      node.contentDescription?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let(values::add)
      for (index in 0 until node.childCount) {
        val child = node.getChild(index) ?: continue
        visit(child)
        try {
          child.recycle()
        } catch (_: Exception) {
          // Ignore recycling failures from vendor accessibility implementations.
        }
      }
    }

    visit(root)
    return values.joinToString("\n")
  }

  private fun captureScreenshotOrFinish(sourceApp: String, text: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
      finishCapture(sourceApp, text, null)
      return
    }
    takeScreenshot(
      Display.DEFAULT_DISPLAY,
      mainExecutor,
      object : TakeScreenshotCallback {
        override fun onSuccess(screenshot: AccessibilityService.ScreenshotResult) {
          ioExecutor.execute { saveScreenshot(screenshot, sourceApp, text) }
        }

        override fun onFailure(errorCode: Int) {
          finishCapture(sourceApp, text, null)
        }
      }
    )
  }

  @RequiresApi(Build.VERSION_CODES.R)
  private fun saveScreenshot(
    screenshot: AccessibilityService.ScreenshotResult,
    sourceApp: String,
    text: String
  ) {
    val captureId = UUID.randomUUID().toString()
    val file = PendingCaptureStore.screenshotFile(this, captureId)
    val hardwareBuffer = screenshot.hardwareBuffer
    val bitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, screenshot.colorSpace)
    try {
      val softwareBitmap = bitmap?.copy(Bitmap.Config.ARGB_8888, false)
      if (softwareBitmap == null) {
        finishCapture(sourceApp, text, null)
        return
      }
      FileOutputStream(file).use { output ->
        softwareBitmap.compress(Bitmap.CompressFormat.PNG, 92, output)
      }
      softwareBitmap.recycle()
      finishCapture(sourceApp, text, file.absolutePath, captureId.takeIf { file.isFile })
    } catch (_: Exception) {
      file.delete()
      finishCapture(sourceApp, text, null)
    } finally {
      bitmap?.recycle()
      hardwareBuffer.close()
    }
  }

  private fun finishCapture(
    sourceApp: String,
    text: String,
    screenshotPath: String?,
    requestedCaptureId: String? = null
  ) {
    val captureId = requestedCaptureId ?: UUID.randomUUID().toString()
    val stored = PendingCaptureStore.write(
      this,
      PendingCapture(
        captureId = captureId,
        createdAt = System.currentTimeMillis(),
        sourceApp = sourceApp,
        rawText = text,
        screenshotPath = screenshotPath,
        captureMethod = if (screenshotPath == null) "accessibility" else "screenshot"
      )
    )
    if (stored) {
      handler.post { launchConfirmationScreen(this@BillCaptureAccessibilityService) }
    }
  }

  companion object {
    private const val SYSTEM_UI_PACKAGE = "com.android.systemui"
    private const val MAX_WINDOW_ATTEMPTS = 7
    private const val WINDOW_RETRY_DELAY_MS = 240L
    private const val QUICK_SETTINGS_DISMISS_DELAY_MS = 320L

    @Volatile
    var instance: BillCaptureAccessibilityService? = null
      private set
  }
}

fun launchConfirmationScreen(context: Context) {
  val intent = Intent(
    Intent.ACTION_VIEW,
    Uri.parse("shengzhang://screen-capture")
  ).apply {
    addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
    )
  }
  runCatching { context.startActivity(intent) }
}
