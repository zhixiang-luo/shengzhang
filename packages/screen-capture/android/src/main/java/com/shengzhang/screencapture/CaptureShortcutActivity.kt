package com.shengzhang.screencapture

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast

/** A launcher/OEM action only. It finishes before requesting the underlying payment window. */
class CaptureShortcutActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val service = BillCaptureAccessibilityService.instance
    finish()
    @Suppress("DEPRECATION")
    overridePendingTransition(0, 0)
    if (savedInstanceState != null) return
    if (service == null) {
      Toast.makeText(applicationContext, "请先在声账设置中开启无障碍快捷记账", Toast.LENGTH_LONG).show()
      return
    }
    Handler(Looper.getMainLooper()).postDelayed({
      if (BillCaptureAccessibilityService.instance === service) service.beginCapture()
    }, 380L)
  }
}

object CaptureShortcuts {
  private const val ID = "screen-bill-capture"

  fun captureIntent(context: Context): Intent = Intent(context, CaptureShortcutActivity::class.java).apply {
    action = "com.shengzhang.screencapture.CAPTURE"
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
  }

  private fun shortcut(context: Context): ShortcutInfo {
    val builder = ShortcutInfo.Builder(context, ID)
      .setShortLabel("快捷记账").setLongLabel("声账快捷记账")
      .setIcon(Icon.createWithResource(context, R.drawable.ic_screen_capture_tile))
      .setIntent(captureIntent(context))
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.component?.let { builder.setActivity(it) }
    return builder.build()
  }

  fun publish(context: Context) {
    runCatching { context.getSystemService(ShortcutManager::class.java)?.addDynamicShortcuts(listOf(shortcut(context))) }
  }

  fun requestPin(context: Context): Boolean {
    publish(context)
    val manager = context.getSystemService(ShortcutManager::class.java) ?: return false
    if (!manager.isRequestPinShortcutSupported) return false
    return manager.requestPinShortcut(shortcut(context), null)
  }
}
