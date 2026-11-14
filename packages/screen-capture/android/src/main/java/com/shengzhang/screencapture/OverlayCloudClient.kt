package com.shengzhang.screencapture

import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.time.ZoneId
import java.util.concurrent.atomic.AtomicBoolean

class OverlayCloudClient {
  private val cancelled = AtomicBoolean(false)
  @Volatile private var connection: HttpURLConnection? = null

  fun cancel() { cancelled.set(true); connection?.disconnect() }

  fun parse(settings: OverlaySettings, task: OverlayTask, jpeg: ByteArray, categories: List<OverlayCategory>, active: () -> Boolean): OverlayCloudBill {
    fun ensureActive() { check(!cancelled.get() && active()) { "本次识别已取消" } }
    ensureActive()
    require(settings.cloudEnabled) { "云端识别已关闭，请在声账中开启" }
    require(jpeg.size in 1..2_000_000) { "图片过大，请重新触发记账" }
    val body = JSONObject().put("captureId", task.captureId).put("installationId", settings.installationId)
      .put("consent", true).put("capturedAt", java.time.Instant.ofEpochMilli(task.createdAt).toString())
      .put("timezone", ZoneId.systemDefault().id)
      .put("categories", JSONArray().apply {
        categories.take(160).forEach { put(JSONObject().put("id", it.id).put("name", it.name.take(40)).put("type", it.type)) }
      }).put("image", JSONObject().put("mimeType", "image/jpeg").put("base64", Base64.encodeToString(jpeg, Base64.NO_WRAP)))
      .toString().toByteArray(Charsets.UTF_8)
    ensureActive()
    val http = try { URL(settings.apiBaseUrl + "/v1/screen-bill/parse").openConnection() as HttpURLConnection }
      catch (_: IOException) { throw OverlayCloudException(CaptureDiagnostic.ERROR_NETWORK) }
    connection = http
    try {
      http.requestMethod = "POST"; http.connectTimeout = 15_000; http.readTimeout = 45_000
      http.instanceFollowRedirects = false; http.doOutput = true
      http.setRequestProperty("Content-Type", "application/json")
      http.setRequestProperty("Accept", "application/json")
      http.setRequestProperty("X-Screen-Bill-Diagnostics", "1")
      http.setFixedLengthStreamingMode(body.size)
      ensureActive()
      http.outputStream.use { stream ->
        var offset = 0
        while (offset < body.size) {
          ensureActive()
          val count = minOf(16_384, body.size - offset)
          stream.write(body, offset, count); offset += count
        }
      }
      ensureActive()
      val status = http.responseCode
      if (status !in 200..299) {
        throw OverlayCloudException(when (status) {
          429 -> CaptureDiagnostic.ERROR_CLOUD_QUOTA
          503 -> CaptureDiagnostic.ERROR_CLOUD_UNAVAILABLE
          400, 413 -> CaptureDiagnostic.ERROR_CLOUD_IMAGE_REJECTED
          else -> CaptureDiagnostic.ERROR_CLOUD_HTTP
        })
      }
      val bytes = ByteArrayOutputStream()
      http.inputStream.use { input ->
        val buffer = ByteArray(4096)
        while (true) {
          ensureActive()
          val count = input.read(buffer)
          if (count < 0) break
          require(bytes.size() + count <= 32_768) { "识别结果异常，请重试" }
          bytes.write(buffer, 0, count)
        }
      }
      ensureActive()
      return OverlayCloudResponse.decode(JSONObject(bytes.toString("UTF-8")), task.captureId, categories)
    } catch (_: SocketTimeoutException) {
      throw OverlayCloudException(CaptureDiagnostic.ERROR_CLOUD_TIMEOUT)
    } catch (_: IOException) {
      throw OverlayCloudException(CaptureDiagnostic.ERROR_NETWORK)
    } catch (error: OverlayCloudException) {
      throw error
    } catch (_: Exception) {
      throw OverlayCloudException(CaptureDiagnostic.ERROR_CLOUD_RESPONSE)
    } finally { http.disconnect(); connection = null }
  }

}
