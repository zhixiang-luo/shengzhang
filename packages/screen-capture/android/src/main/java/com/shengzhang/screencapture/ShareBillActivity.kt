package com.shengzhang.screencapture

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import java.io.File
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

/** Receives only the image deliberately shared by the user; no gallery permission. */
class ShareBillActivity : Activity() {
  private val cancelled = AtomicBoolean(false)
  private var importThread: Thread? = null

  override fun onDestroy() {
    cancelled.set(true)
    importThread?.interrupt()
    super.onDestroy()
  }

  private fun ensureActive() {
    check(!cancelled.get() && !Thread.currentThread().isInterrupted) { "导入已取消" }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (savedInstanceState != null || intent.action != Intent.ACTION_SEND || intent.type?.startsWith("image/") != true) {
      finish()
      return
    }
    val uri = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java) else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
    }
    if (uri?.scheme != "content") {
      Toast.makeText(this, "请从系统分享面板发送一张图片", Toast.LENGTH_SHORT).show()
      finish()
      return
    }
    importThread = Thread {
      val captureId = UUID.randomUUID().toString()
      val incoming = File(cacheDir, "bill-import-$captureId")
      var output: File? = null
      try {
        ensureActive()
        contentResolver.openInputStream(uri).use { input ->
          requireNotNull(input) { "图片无法读取" }
          incoming.outputStream().use { stream ->
            val buffer = ByteArray(8192)
            var total = 0
            while (true) {
              ensureActive()
              val count = input.read(buffer)
              if (count < 0) break
              total += count
              require(total <= 8_000_000) { "图片过大" }
              stream.write(buffer, 0, count)
            }
          }
        }
        ensureActive()
        val bitmap = CaptureImageProcessor.decode(incoming)
        val destination = PendingCaptureStore.stagingScreenshotFile(this, captureId)
        output = destination
        try { destination.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) } } finally { bitmap.recycle() }
        ensureActive()
        check(PendingCaptureStore.write(this, PendingCapture(captureId, System.currentTimeMillis(), "unknown", "", destination.absolutePath, "shared_image")))
        ensureActive()
        runOnUiThread {
          if (cancelled.get() || isFinishing || isDestroyed) {
            PendingCaptureStore.clear(this, captureId)
          } else {
            launchConfirmationScreen(this, captureId)
          }
          finish()
        }
      } catch (_: Exception) {
        output?.delete()
        PendingCaptureStore.clear(this, captureId)
        runOnUiThread {
          if (!cancelled.get() && !isFinishing && !isDestroyed) Toast.makeText(this, "图片无法读取或尺寸过大，请重新截图分享", Toast.LENGTH_LONG).show()
          finish()
        }
      } finally {
        incoming.delete()
      }
    }.also { it.start() }
  }
}
