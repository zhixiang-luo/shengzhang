package com.shengzhang.screencapture

import android.content.Context
import android.net.Uri
import org.json.JSONObject
import java.io.File

data class PendingCapture(
  val captureId: String,
  val createdAt: Long,
  val sourceApp: String,
  val rawText: String,
  val screenshotPath: String?,
  val captureMethod: String
)

object PendingCaptureStore {
  const val MAX_AGE_MS = 5 * 60 * 1000L

  private fun directory(context: Context): File {
    return File(context.noBackupFilesDir, "screen-capture").apply { mkdirs() }
  }

  private fun metadataFile(context: Context) = File(directory(context), "capture.json")

  fun screenshotFile(context: Context, captureId: String): File {
    return File(directory(context), "$captureId.png")
  }

  @Synchronized
  fun write(context: Context, capture: PendingCapture): Boolean {
    purgeExpired(context)
    removeFilesExcept(context, capture.captureId)
    val json = JSONObject()
      .put("captureId", capture.captureId)
      .put("createdAt", capture.createdAt)
      .put("sourceApp", capture.sourceApp)
      .put("rawText", capture.rawText.take(12_000))
      .put("screenshotPath", capture.screenshotPath ?: JSONObject.NULL)
      .put("captureMethod", capture.captureMethod)
    return runCatching {
      metadataFile(context).writeText(json.toString())
      true
    }.getOrDefault(false)
  }

  @Synchronized
  fun read(context: Context): PendingCapture? {
    purgeExpired(context)
    val file = metadataFile(context)
    if (!file.isFile) return null

    return runCatching {
      val json = JSONObject(file.readText())
      val captureId = json.getString("captureId")
      val screenshotPath = json.optString("screenshotPath").takeIf { it.isNotBlank() }
      PendingCapture(
        captureId = captureId,
        createdAt = json.getLong("createdAt"),
        sourceApp = json.optString("sourceApp", "unknown"),
        rawText = json.optString("rawText", ""),
        screenshotPath = screenshotPath?.takeIf { File(it).isFile },
        captureMethod = json.optString("captureMethod", "accessibility")
      )
    }.getOrElse {
      clear(context)
      null
    }
  }

  fun readMap(context: Context): Map<String, Any?>? {
    val capture = read(context) ?: return null
    return mapOf(
      "captureId" to capture.captureId,
      "createdAt" to java.time.Instant.ofEpochMilli(capture.createdAt).toString(),
      "sourceApp" to capture.sourceApp,
      "rawText" to capture.rawText,
      "screenshotUri" to capture.screenshotPath?.let { Uri.fromFile(File(it)).toString() },
      "captureMethod" to capture.captureMethod
    )
  }

  @Synchronized
  fun clear(context: Context, captureId: String? = null) {
    val capture = read(context)
    if (captureId == null || capture?.captureId == captureId) {
      metadataFile(context).delete()
    }
    if (captureId == null) {
      directory(context).listFiles()?.forEach { it.delete() }
      return
    }
    screenshotFile(context, captureId).delete()
  }

  @Synchronized
  fun purgeExpired(context: Context) {
    val file = metadataFile(context)
    val now = System.currentTimeMillis()
    if (file.isFile) {
      val createdAt = runCatching { JSONObject(file.readText()).getLong("createdAt") }.getOrDefault(0L)
      if (createdAt <= 0L || now - createdAt > MAX_AGE_MS) {
        directory(context).listFiles()?.forEach { it.delete() }
        return
      }
    }

    directory(context)
      .listFiles()
      ?.filter { it != file }
      ?.filter { now - it.lastModified() > MAX_AGE_MS }
      ?.forEach { it.delete() }
  }

  private fun removeFilesExcept(context: Context, captureId: String) {
    val keepScreenshot = screenshotFile(context, captureId).name
    directory(context).listFiles()?.forEach { file ->
      if (file.name != keepScreenshot) file.delete()
    }
  }
}
