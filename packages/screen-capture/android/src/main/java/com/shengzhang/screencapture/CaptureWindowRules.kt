package com.shengzhang.screencapture

enum class CaptureWindowRole { APPLICATION, SYSTEM, INPUT_METHOD, ACCESSIBILITY_OVERLAY, OTHER }
data class CaptureWindowSnapshot(val id: Int, val role: CaptureWindowRole, val active: Boolean, val focused: Boolean,
  val layer: Int, val rootPackage: String? = null)
data class CaptureActiveRoot(val id: Int, val packageName: String)
data class CaptureWindowIdentity(val packageName: String, val windowId: Int, val revision: Long)
data class CaptureWindowObservation(
  val snapshots: List<CaptureWindowSnapshot>,
  val activeRoot: CaptureActiveRoot?,
  val selection: CaptureWindowSelection
)
sealed class CaptureWindowSelection {
  data class Ready(val identity: CaptureWindowIdentity) : CaptureWindowSelection()
  data object SystemPanel : CaptureWindowSelection()
  data object OtherApp : CaptureWindowSelection()
  data object Unconfirmed : CaptureWindowSelection()
}

/** Window metadata only; never contains text, titles, descriptions, or screenshot content. */
class CaptureWindowTracker(private val ownPackage: String) {
  private val sources = mutableMapOf<Int, CaptureWindowIdentity>()
  // Visible mappings may be pruned while SystemUI occludes an app. A bound
  // task's revision remains valid until a source state/removal actually changes it.
  private val checkpoints = mutableMapOf<Int, CaptureWindowIdentity>()
  private var revision = 0L

  @Synchronized fun observe(windowId: Int, packageName: String): CaptureWindowIdentity? {
    if (windowId < 0 || packageName.isBlank()) return null
    return CaptureWindowIdentity(packageName, windowId, ++revision).also {
      sources[windowId] = it; checkpoints[windowId] = it
    }
  }

  @Synchronized fun forget(windowId: Int) { sources.remove(windowId); checkpoints.remove(windowId) }

  @Synchronized fun unchanged(expected: CaptureWindowIdentity): Boolean = checkpoints[expected.windowId] == expected

  @Synchronized fun select(windows: List<CaptureWindowSnapshot>, activeRoot: CaptureActiveRoot?): CaptureWindowSelection {
    windows.forEach { window ->
      val pkg = window.rootPackage?.takeIf { it.isNotBlank() }
        ?: activeRoot?.takeIf { it.id == window.id }?.packageName
      if (pkg != null && sources[window.id]?.packageName != pkg) {
        val identity = checkpoints[window.id]?.takeIf { it.packageName == pkg }
          ?: CaptureWindowIdentity(pkg, window.id, ++revision).also { checkpoints[window.id] = it }
        sources[window.id] = identity
      }
    }
    val interactive = windows.filter { it.active || it.focused }.filterNot {
      it.role == CaptureWindowRole.INPUT_METHOD ||
        (it.role == CaptureWindowRole.ACCESSIBILITY_OVERLAY && sources[it.id]?.packageName == ownPackage)
    }
    if (activeRoot?.packageName == SYSTEM_UI || interactive.any {
        it.role == CaptureWindowRole.SYSTEM || sources[it.id]?.packageName == SYSTEM_UI
      }) return CaptureWindowSelection.SystemPanel
    if (interactive.any { it.role != CaptureWindowRole.APPLICATION }) return CaptureWindowSelection.Unconfirmed
    val transientCover = windows.any {
      (it.active || it.focused) && (it.role == CaptureWindowRole.INPUT_METHOD ||
        (it.role == CaptureWindowRole.ACCESSIBILITY_OVERLAY && sources[it.id]?.packageName == ownPackage))
    }
    // A temporary system/IME/own overlay may omit the underlying app from the
    // visible list. Preserve only its exact id mapping across that occlusion;
    // a real removal event or a different application still retires the mapping.
    if (!transientCover) sources.keys.retainAll(windows.map { it.id }.toSet())
    val current = interactive.filter { it.role == CaptureWindowRole.APPLICATION }
      .maxWithOrNull(compareBy<CaptureWindowSnapshot> { it.layer }.thenBy { it.focused })
      ?: return CaptureWindowSelection.Unconfirmed
    val identity = sources[current.id] ?: return CaptureWindowSelection.Unconfirmed
    return if (identity.packageName in TARGET_PACKAGES) CaptureWindowSelection.Ready(identity)
    else CaptureWindowSelection.OtherApp
  }

  companion object {
    private const val SYSTEM_UI = "com.android.systemui"
    private val TARGET_PACKAGES = setOf("com.tencent.mm", "com.eg.android.AlipayGphone")
  }
}

object CaptureSourceRules {
  fun eventInvalidates(expected: CaptureWindowIdentity, packageName: String, observed: CaptureWindowIdentity?,
    ownPackage: String, inputMethod: Boolean): Boolean = packageName.isNotBlank() && packageName != ownPackage &&
      packageName != "com.android.systemui" && !inputMethod && observed != expected

  /** A shortcut activity can make the payment app re-emit its current window before capture starts. */
  fun rebindsBeforeCapture(expected: CaptureWindowIdentity, observed: CaptureWindowIdentity?, captured: Boolean): Boolean =
    !captured && observed != null && observed.windowId == expected.windowId && observed.packageName == expected.packageName

  fun selectionInvalidates(expected: CaptureWindowIdentity, selection: CaptureWindowSelection): Boolean =
    selection == CaptureWindowSelection.OtherApp || (selection is CaptureWindowSelection.Ready &&
      selection.identity != expected)
}

data class CaptureWindowCheck(val task: OverlayTask, val source: CaptureWindowIdentity) {
  fun appliesTo(currentTask: OverlayTask?, currentSource: CaptureWindowIdentity?): Boolean = currentTask == task && currentSource == source
}

class CaptureWindowStability {
  private var candidate: CaptureWindowIdentity? = null
  private var stableSince = 0L

  fun ready(selection: CaptureWindowSelection, now: Long): CaptureWindowIdentity? {
    val identity = (selection as? CaptureWindowSelection.Ready)?.identity
    if (identity == null || identity != candidate || now < stableSince) {
      candidate = identity; stableSince = now
      return null
    }
    return identity.takeIf { now - stableSince >= 350L }
  }
}
