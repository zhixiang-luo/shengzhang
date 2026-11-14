package com.shengzhang.screencapture

import android.content.Context

enum class CaptureStage { SETUP, WINDOW, SCREENSHOT, CLOUD, SAVE, FINISHED }
enum class CaptureDiagnostic(val stage: CaptureStage, val message: String) {
  ERROR_ANDROID_VERSION(CaptureStage.SETUP, "截图识别需要 Android 11 及以上"),
  ERROR_DEVICE_LOCKED(CaptureStage.SETUP, "请先解锁并打开微信或支付宝付款详情"),
  ERROR_CONFIGURATION(CaptureStage.SETUP, "请先打开声账，完成快捷记账设置"),
  ERROR_CLOUD_DISABLED(CaptureStage.SETUP, "云端识别已关闭，请在声账设置中开启"),
  ERROR_LEDGER_NOT_READY(CaptureStage.SETUP, "账本尚未准备好，请打开声账后重试"),
  ERROR_EXPIRED(CaptureStage.WINDOW, "本次记账已过期，请重新触发"),
  ERROR_SYSTEM_PANEL(CaptureStage.WINDOW, "控制中心尚未收起，请回到付款详情重新触发"),
  ERROR_WINDOW_UNCONFIRMED(CaptureStage.WINDOW, "未能确认当前付款窗口，请停留在详情页后重试"),
  ERROR_UNSUPPORTED_APP(CaptureStage.WINDOW, "请在微信或支付宝付款详情触发快捷记账"),
  ERROR_WINDOW_CHANGED(CaptureStage.WINDOW, "页面已切换，请回到付款详情重新触发"),
  ERROR_SCREENSHOT_SECURE(CaptureStage.SCREENSHOT, "此页面不允许截图，可试微信钱包里的账单详情，或手动记账"),
  ERROR_SCREENSHOT_INTERVAL(CaptureStage.SCREENSHOT, "截图过于频繁，请稍等后重试"),
  ERROR_SCREENSHOT_PERMISSION(CaptureStage.SCREENSHOT, "截图权限暂不可用，请重新开启无障碍服务"),
  ERROR_SCREENSHOT_WINDOW(CaptureStage.SCREENSHOT, "截图窗口已失效，请回到付款详情重新触发"),
  ERROR_SCREENSHOT(CaptureStage.SCREENSHOT, "截图失败，请回到付款详情重试"),
  ERROR_SCREENSHOT_DECODE(CaptureStage.SCREENSHOT, "截图无法读取，请回到付款详情重试"),
  ERROR_OVERLAY(CaptureStage.SCREENSHOT, "无法显示记账卡，请检查无障碍服务后重试"),
  ERROR_NETWORK(CaptureStage.CLOUD, "网络连接失败，请检查网络后重试，也可以手动补齐"),
  ERROR_CLOUD_TIMEOUT(CaptureStage.CLOUD, "识别超时，请检查网络后重试"),
  ERROR_CLOUD_QUOTA(CaptureStage.CLOUD, "云端识别暂时受限，可直接填写金额和分类后保存，稍后再试"),
  ERROR_CLOUD_UNAVAILABLE(CaptureStage.CLOUD, "云端识别暂不可用，请稍后重试"),
  ERROR_CLOUD_IMAGE_REJECTED(CaptureStage.CLOUD, "云端未能处理截图，请回到付款详情重试"),
  ERROR_CLOUD_HTTP(CaptureStage.CLOUD, "云端识别失败，请稍后重试，也可以手动补齐"),
  ERROR_CLOUD_RESPONSE(CaptureStage.CLOUD, "识别结果异常，请重试或手动补齐"),
  ERROR_CLOUD_AMOUNT_NOT_READ(CaptureStage.CLOUD, "云端未读到金额，请核对后手动补齐"),
  ERROR_CLOUD_AMOUNT_UNVERIFIED(CaptureStage.CLOUD, "云端未能核对金额，请核对页面后手动补齐"),
  ERROR_CLOUD_BLOCKED(CaptureStage.CLOUD, "当前交易不支持快捷记账，请关闭后手动记账"),
  ERROR_SAVE(CaptureStage.SAVE, "保存失败，内容已保留，请稍后再试"),
  SUCCESS_RECOGNIZED(CaptureStage.FINISHED, "识别完成，请核对记账卡"),
  SUCCESS_SAVED(CaptureStage.FINISHED, "这笔收好了")
}

class OverlayCloudException(val diagnostic: CaptureDiagnostic) : IllegalStateException(diagnostic.message)

/** Only finite codes, source labels and numeric image metadata enter these preferences. */
object CaptureDiagnostics {
  private fun prefs(context: Context) = context.getSharedPreferences("screen-capture-diagnostics", Context.MODE_PRIVATE)
  fun message(context: Context): String? = prefs(context).getString("code", null)?.let { value ->
    CaptureDiagnostic.entries.find { it.name == value }?.message
  }
  fun code(context: Context): String? = prefs(context).getString("code", null)?.takeIf { value ->
    CaptureDiagnostic.entries.any { it.name == value }
  }
  fun clear(context: Context) { prefs(context).edit().clear().apply() }
  fun record(context: Context, diagnostic: CaptureDiagnostic, sourcePackage: String? = null,
    width: Int? = null, height: Int? = null, encodedBytes: Int? = null) {
    prefs(context).edit().apply {
      putString("code", diagnostic.name)
      putString("stage", diagnostic.stage.name)
      putString("source", when (sourcePackage) {
        "com.tencent.mm" -> "wechat"
        "com.eg.android.AlipayGphone" -> "alipay"
        else -> "unknown"
      })
      width?.takeIf { it > 0 }?.let { putInt("width", it) }
      height?.takeIf { it > 0 }?.let { putInt("height", it) }
      encodedBytes?.takeIf { it > 0 }?.let { putInt("encodedBytes", it) }
      apply()
    }
  }
}
