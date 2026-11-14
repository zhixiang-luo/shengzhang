package com.shengzhang.screencapture

import android.content.Context
import android.net.Uri
import android.util.AtomicFile
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

  fun stagingScreenshotFile(context: Context, captureId: String): File {
    return File(context.cacheDir, "screen-capture-$captureId.png")
  }

  @Synchronized
  fun write(context: Context, capture: PendingCapture): Boolean {
    val staged = capture.screenshotPath?.let { File(it) }
    val destination = staged?.let { screenshotFile(context, capture.captureId) }
    return try {
      // Image generation happens in cacheDir. Publish it and its metadata while
      // holding the same lock used by read/clear/purge; they never see a partial image.
      if (staged != null && destination != null) {
        require(staged.isFile) { "截图已失效" }
        if (staged.absolutePath != destination.absolutePath && !staged.renameTo(destination)) {
          staged.copyTo(destination, overwrite = true)
        }
      }
      val json = JSONObject()
        .put("captureId", capture.captureId)
        .put("createdAt", capture.createdAt)
        .put("sourceApp", capture.sourceApp)
        .put("rawText", capture.rawText.take(12_000))
        .put("screenshotPath", destination?.absolutePath ?: JSONObject.NULL)
        .put("captureMethod", capture.captureMethod)
      val atomic = AtomicFile(metadataFile(context))
      val stream = atomic.startWrite()
      try {
        stream.write(json.toString().toByteArray(Charsets.UTF_8))
        atomic.finishWrite(stream)
      } catch (error: Exception) {
        atomic.failWrite(stream)
        throw error
      }
      removeFilesExcept(context, capture.captureId)
      true
    } catch (_: Exception) {
      destination?.delete()
      false
    } finally {
      if (staged?.absolutePath != destination?.absolutePath) staged?.delete()
    }
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
    if (captureId == null) {
      directory(context).listFiles()?.forEach { it.delete() }
      return
    }
    val capture = read(context)
    if (capture?.captureId == captureId) {
      metadataFile(context).delete()
    }
    screenshotFile(context, captureId).delete()
  }

  @Synchronized
  fun purgeExpired(context: Context) {
    val file = metadataFile(context)
    val now = System.currentTimeMillis()
    context.cacheDir.listFiles()
      ?.filter { it.name.startsWith("screen-capture-") || it.name.startsWith("bill-import-") }
      ?.filter { now - it.lastModified() > MAX_AGE_MS }
      ?.forEach { it.delete() }
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
      if (file.name != keepScreenshot && file.name != "capture.json") file.delete()
    }
  }
}
