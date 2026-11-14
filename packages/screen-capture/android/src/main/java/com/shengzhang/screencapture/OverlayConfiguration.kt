package com.shengzhang.screencapture

import android.content.Context
import android.content.pm.ApplicationInfo
import android.net.Uri
import java.io.File
import java.net.URI

data class OverlaySettings(val apiBaseUrl: String, val databasePath: String, val installationId: String, val cloudEnabled: Boolean)

/** Contains configuration and consent only. Bill fields and images never enter preferences. */
object OverlayConfiguration {
  private const val STORE = "screen-overlay-configuration"
  private fun prefs(context: Context) = context.getSharedPreferences(STORE, Context.MODE_PRIVATE)

  fun read(context: Context): OverlaySettings? {
    val values = prefs(context)
    val api = values.getString("apiBaseUrl", null) ?: return null
    val path = values.getString("databasePath", null) ?: return null
    val installation = values.getString("installationId", null) ?: return null
    return OverlaySettings(api, path, installation, values.getBoolean("cloudEnabled", false))
  }

  fun configure(context: Context, values: Map<String, Any?>) {
    val api = validateApi(context, values["apiBaseUrl"] as? String ?: "")
    val path = privateDatabaseFile(context, values["databasePath"] as? String ?: "").absolutePath
    val installation = values["installationId"] as? String ?: ""
    require(installation.length in 16..200) { "快捷记账标识无效，请重新打开声账设置" }
    val enabled = values["cloudEnabled"] as? Boolean ?: false
    if (read(context) == OverlaySettings(api, path, installation, enabled)) return
    check(prefs(context).edit().putString("apiBaseUrl", api).putString("databasePath", path)
      .putString("installationId", installation).putBoolean("cloudEnabled", enabled).commit()) { "快捷记账配置保存失败" }
    BillCaptureAccessibilityService.instance?.configurationChanged()
  }

  fun cloudEnabled(context: Context): Boolean = prefs(context).getBoolean("cloudEnabled", false)

  fun setCloudEnabled(context: Context, enabled: Boolean) {
    if (cloudEnabled(context) == enabled) return
    check(prefs(context).edit().putBoolean("cloudEnabled", enabled).commit()) { "云端授权保存失败" }
    BillCaptureAccessibilityService.instance?.configurationChanged()
  }

  fun floatingEnabled(context: Context): Boolean {
    // Retire the old entry point even when an upgraded installation saved true.
    prefs(context).edit().remove("floatingButtonEnabled").apply()
    return false
  }

  @Suppress("UNUSED_PARAMETER")
  fun setFloatingEnabled(context: Context, enabled: Boolean) { floatingEnabled(context) }

  fun privateDatabaseFile(context: Context, path: String): File {
    val uri = Uri.parse(path)
    require(uri.scheme == null || uri.scheme == "file") { "账本路径无效，请重新打开声账" }
    val file = File(if (uri.scheme == "file") requireNotNull(uri.path) else path).canonicalFile
    // This is Expo SQLite's actual default directory. No database is created or migrated here.
    val expected = File(File(context.filesDir, "SQLite"), "shengzhang.db").canonicalFile
    require(file == expected && file.isFile) { "账本尚未准备好，请先打开声账完成初始化" }
    return file
  }

  private fun validateApi(context: Context, value: String): String {
    val uri = runCatching { URI(value) }.getOrNull()
    require(uri != null && uri.host != null && uri.userInfo == null && uri.query == null && uri.fragment == null) { "识别服务地址无效" }
    val localDebug = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0 &&
      uri.scheme == "http" && uri.host in listOf("localhost", "127.0.0.1", "10.0.2.2", "::1")
    require(uri.scheme == "https" || localDebug) { "识别服务需要 HTTPS 地址" }
    return value.trimEnd('/')
  }
}
