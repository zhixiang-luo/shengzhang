package com.shengzhang.screencapture

import android.app.StatusBarManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.function.Consumer
import kotlin.coroutines.resume

class ScreenCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ScreenCapture")

    AsyncFunction("getScreenCaptureStatus") {
      val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
      mapOf(
        "supported" to supported,
        "platform" to "android",
        "androidApi" to Build.VERSION.SDK_INT,
        "accessibilityEnabled" to isAccessibilityServiceEnabled(),
        "tileSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N),
        "autoAddTileSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU),
        "reason" to if (supported) null else "付款页识别需要 Android 11 及以上"
      )
    }

    AsyncFunction("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      androidContext.startActivity(intent)
    }

    AsyncFunction("requestQuickSettingsTile") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        return@AsyncFunction false
      }
      val manager = androidContext.getSystemService(StatusBarManager::class.java)
        ?: return@AsyncFunction false
      suspendCancellableCoroutine { continuation ->
        manager.requestAddTileService(
          ComponentName(androidContext, BillCaptureTileService::class.java),
          androidContext.getString(R.string.screen_capture_tile_label),
          Icon.createWithResource(androidContext, R.drawable.ic_screen_capture_tile),
          androidContext.mainExecutor,
          Consumer { result ->
            val added =
              result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED ||
                result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED
            if (continuation.isActive) continuation.resume(added)
          }
        )
      }
    }

    AsyncFunction("getPendingCapture") {
      PendingCaptureStore.readMap(androidContext)
    }

    AsyncFunction("recognizeCaptureImage") { captureId: String ->
      val capture = PendingCaptureStore.read(androidContext)
      require(capture?.captureId == captureId) { "待处理账单已失效" }
      val path = capture.screenshotPath ?: return@AsyncFunction ""
      ScreenOcrProcessor.recognize(File(path))
    }

    AsyncFunction("clearCapture") { captureId: String ->
      PendingCaptureStore.clear(androidContext, captureId)
    }

    AsyncFunction("openConfirmation") { _: String ->
      launchConfirmationScreen(androidContext)
    }
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    val expected = ComponentName(
      androidContext,
      BillCaptureAccessibilityService::class.java
    )
    val enabled = Settings.Secure.getString(
      androidContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ).orEmpty()
    return enabled.split(':').any { value ->
      ComponentName.unflattenFromString(value) == expected
    }
  }
}
