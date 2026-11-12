package com.shengzhang.screencapture

import android.graphics.BitmapFactory
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object ScreenOcrProcessor {
  private val recognizer by lazy {
    TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
  }

  suspend fun recognize(file: File): String {
    check(file.isFile) { "截图文件不存在" }
    val bitmap = BitmapFactory.decodeFile(file.absolutePath)
      ?: throw IllegalStateException("截图无法读取")
    val image = InputImage.fromBitmap(bitmap, 0)

    return suspendCancellableCoroutine { continuation ->
      continuation.invokeOnCancellation {
        if (!bitmap.isRecycled) bitmap.recycle()
      }
      recognizer.process(image)
        .addOnSuccessListener { result ->
          if (!bitmap.isRecycled) bitmap.recycle()
          if (continuation.isActive) continuation.resume(result.text)
        }
        .addOnFailureListener { error ->
          if (!bitmap.isRecycled) bitmap.recycle()
          if (continuation.isActive) continuation.resumeWithException(error)
        }
    }
  }
}
