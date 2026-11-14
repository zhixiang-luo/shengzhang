package com.shengzhang.screencapture

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt

object CaptureImageProcessor {
  fun decode(file: File): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    require(bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth <= 10000 && bounds.outHeight <= 10000) { "图片尺寸不支持" }
    require(bounds.outWidth.toLong() * bounds.outHeight <= 40_000_000L) { "图片像素过大" }
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / sample > 2400) sample *= 2
    return requireNotNull(BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample })) { "图片无法读取" }
  }

  fun export(file: File): Map<String, String> {
    val source = decode(file)
    try {
      return mapOf("mimeType" to "image/jpeg", "base64" to Base64.encodeToString(encodeJpeg(source), Base64.NO_WRAP))
    } finally { source.recycle() }
  }

  /** The accessibility path stays in memory; no new screenshot file or pending RN draft. */
  fun encodeJpeg(source: Bitmap): ByteArray {
    val scale = 1600.0 / max(source.width, source.height)
    val bitmap = if (scale < 1) Bitmap.createScaledBitmap(source, (source.width * scale).roundToInt(), (source.height * scale).roundToInt(), true) else source
    try {
      val bytes = ByteArrayOutputStream().use { stream ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, stream)
        stream.toByteArray()
      }
      require(bytes.size <= 2_000_000) { "图片过大，请裁剪后重新分享" }
      return bytes
    } finally {
      if (bitmap !== source) bitmap.recycle()
    }
  }
}
