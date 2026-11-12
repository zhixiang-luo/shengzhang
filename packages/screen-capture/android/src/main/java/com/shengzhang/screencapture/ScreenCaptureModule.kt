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
import kotlin.coroutines.resume

class ScreenCaptureModule : Module() {
  private val context
    get() = appContext.applicationContext

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
      context.startActivity(intent)
    }

    AsyncFunction("requestQuickSettingsTile").Coroutine {
      val manager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.getSystemService(StatusBarManager::class.java)
      } else {
        null
      }
      if (manager == null) {
        false
      } else {
        suspendCancellableCoroutine { continuation ->
          manager.requestAddTileService(
            ComponentName(context, BillCaptureTileService::class.java),
            context.getString(R.string.screen_capture_tile_label),
            Icon.createWithResource(context, R.drawable.ic_screen_capture_tile),
            context.mainExecutor,
            Consumer { result ->
              val added =
                result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED ||
                  result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED
              if (continuation.isActive) continuation.resume(added)
            }
          )
        }
      }
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
}
