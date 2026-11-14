package com.shengzhang.screencapture

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log

/**
 * Structural diagnostics for a debug installation only. No window titles,
 * node text, screenshots, bill fields, or unrelated package names are logged.
 */
object CaptureWindowTrace {
  const val TAG = "ShengzhangCapture"

  private fun enabled(context: Context): Boolean =
    (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

  fun event(context: Context, eventType: Int, windowId: Int, sourcePackage: String?, ownPackage: String) {
    if (!enabled(context)) return
    val type = when (eventType) {
      android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> "state"
      android.view.accessibility.AccessibilityEvent.TYPE_WINDOWS_CHANGED -> "windows"
      else -> "other"
    }
    Log.d(TAG, "event type=$type id=$windowId source=${label(sourcePackage, ownPackage)}")
  }

  fun attempt(context: Context, generation: Long, attempt: Int, observation: CaptureWindowObservation,
    stable: Boolean, shadeRequested: Boolean, shadeAccepted: Boolean) {
    if (!enabled(context)) return
    val ownPackage = context.packageName
    val windows = observation.snapshots.joinToString("|") { window ->
      val flags = "${if (window.active) "a" else "-"}${if (window.focused) "f" else "-"}"
      "${window.id}:${window.role.name.lowercase()}:$flags:L${window.layer}:${label(window.rootPackage, ownPackage)}"
    }
    val active = observation.activeRoot?.let { "${it.id}:${label(it.packageName, ownPackage)}" } ?: "none"
    Log.d(TAG, "attempt generation=$generation index=$attempt windows=[$windows] activeRoot=$active" +
      " selection=${selectionName(observation.selection)} stable=$stable" +
      " shadeRequested=$shadeRequested shadeAccepted=$shadeAccepted")
  }

  fun displayFallback(context: Context, generation: Long, ocrTrusted: Boolean?, encodedBytes: Int? = null) {
    if (!enabled(context)) return
    Log.d(TAG, "display_fallback generation=$generation ocrTrusted=$ocrTrusted encodedBytes=$encodedBytes")
  }

  /** Always-on, structure-only breadcrumbs so a release build can be debugged live. */
  fun saveRequested(context: Context, generation: Long) {
    Log.i(TAG, "save requested generation=$generation")
  }

  fun saveResult(context: Context, result: String) {
    Log.i(TAG, "save result=$result")
  }

  fun cancelled(context: Context, reason: String) {
    Log.i(TAG, "cancelled reason=$reason")
  }

  fun label(value: String?, ownPackage: String): String = when {
    value.isNullOrBlank() -> "none"
    value == "com.tencent.mm" -> "wechat"
    value == "com.eg.android.AlipayGphone" -> "alipay"
    value == "com.android.systemui" -> "systemui"
    value == ownPackage -> "shengzhang"
    else -> "other"
  }

  private fun selectionName(selection: CaptureWindowSelection): String = when (selection) {
    is CaptureWindowSelection.Ready -> "ready"
    CaptureWindowSelection.SystemPanel -> "system_panel"
    CaptureWindowSelection.OtherApp -> "other_app"
    CaptureWindowSelection.Unconfirmed -> "unconfirmed"
  }
}
