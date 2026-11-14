package com.shengzhang.screencapture

enum class TilePresenceSignal { ADDED, REMOVED, LISTENING, CLICKED, REQUEST_ADDED, REQUEST_ALREADY_ADDED, REQUEST_DECLINED }
object TilePresenceRules {
  fun next(current: Boolean?, signal: TilePresenceSignal): Boolean? = when (signal) {
    TilePresenceSignal.REMOVED -> false
    TilePresenceSignal.REQUEST_DECLINED -> current
    else -> true
  }
}

/** Retries a failed shade dismissal without issuing one global action per poll. */
class CaptureShadeRetry(private val retryEveryAttempts: Int = 4) {
  private var lastRequestedAttempt: Int? = null

  init {
    require(retryEveryAttempts > 0)
  }

  fun shouldRequest(selection: CaptureWindowSelection, attempt: Int): Boolean {
    if (selection != CaptureWindowSelection.SystemPanel) return false
    val last = lastRequestedAttempt
    if (last != null && attempt - last < retryEveryAttempts) return false
    lastRequestedAttempt = attempt
    return true
  }
}

/** A pending IME request may be issued once the attached editor owns focus in a focused window. */
class EditorImeRequest {
  private var pending = true
  fun ready(attached: Boolean, windowFocused: Boolean, editorFocused: Boolean): Boolean {
    if (!pending || !attached || !windowFocused || !editorFocused) return false
    pending = false
    return true
  }
  fun cancel() { pending = false }
}
