package com.shengzhang.screencapture

/** A saved overlay bill can finish while Android emits no AppState change to React Native. */
object ScreenBillEvents {
  const val SAVED = "onScreenBillSaved"

  @Volatile
  private var listener: (() -> Unit)? = null

  fun attach(callback: () -> Unit) {
    listener = callback
  }

  fun detach(callback: () -> Unit) {
    if (listener === callback) listener = null
  }

  fun saved() {
    val callback = listener ?: return
    runCatching { callback() }
  }
}
