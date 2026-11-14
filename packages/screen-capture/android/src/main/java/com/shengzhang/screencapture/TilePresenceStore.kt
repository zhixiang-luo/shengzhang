package com.shengzhang.screencapture

import android.content.Context

/** An absent key means unknown on an upgrade; a request alone never confirms addition. */
object TilePresenceStore {
  private fun prefs(context: Context) = context.getSharedPreferences("screen-capture-tile-presence", Context.MODE_PRIVATE)

  fun read(context: Context): Boolean? = prefs(context).let {
    if (it.contains("added")) it.getBoolean("added", false) else null
  }

  @Synchronized fun observe(context: Context, signal: TilePresenceSignal) {
    val current = read(context)
    val next = TilePresenceRules.next(current, signal)
    if (next != null && next != current) prefs(context).edit().putBoolean("added", next).apply()
  }
}
