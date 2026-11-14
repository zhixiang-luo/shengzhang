package com.shengzhang.screencapture

import org.junit.Assert.*
import org.junit.Test

class CaptureWindowRulesTest {
  private val wechat = "com.tencent.mm"
  private val alipay = "com.eg.android.AlipayGphone"
  private val sysui = "com.android.systemui"
  private fun app(id: Int, pkg: String? = null, active: Boolean = true) =
    CaptureWindowSnapshot(id, CaptureWindowRole.APPLICATION, active, active, 1, pkg)

  @Test fun activeSystemPanelBlocksEvenWhenActiveRootStillNamesPaymentApp() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    val panel = CaptureWindowSnapshot(20, CaptureWindowRole.SYSTEM, true, true, 9, sysui)
    assertEquals(CaptureWindowSelection.SystemPanel, tracker.select(listOf(app(10, wechat), panel), CaptureActiveRoot(10, wechat)))
  }

  @Test fun rootlessWechatRetainsItsOwnWindowEventWhenSystemUiEmitsANewerEvent() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    tracker.observe(20, sysui)
    val result = tracker.select(listOf(app(10)), null) as? CaptureWindowSelection.Ready
    assertNotNull(result)
    assertEquals(wechat, result?.identity?.packageName)
    assertEquals(10, result?.identity?.windowId)
  }

  @Test fun switchingToAnUnidentifiedWindowCannotBorrowAnOldPaymentAppEvent() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(listOf(app(11)), null))
  }

  @Test fun removedWindowMappingCannotIdentifyAReusedWindowId() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    tracker.select(listOf(app(11, "com.example.other")), null)
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(listOf(app(10)), null))
  }

  @Test fun currentApplicationMetadataWinsOverAnOldRootFromAnotherWindow() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    assertEquals(CaptureWindowSelection.OtherApp,
      tracker.select(listOf(app(11, "com.example.other")), CaptureActiveRoot(10, wechat)))
  }

  @Test fun rootMetadataCanIdentifyOnlyTheMatchingInteractiveApplicationWindow() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    val result = tracker.select(listOf(app(10)), CaptureActiveRoot(10, alipay)) as? CaptureWindowSelection.Ready
    assertEquals(alipay, result?.identity?.packageName)
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(emptyList(), CaptureActiveRoot(10, alipay)))
  }

  @Test fun systemEventsDoNotChangeTheSourceWindowsRevision() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    val first = tracker.select(listOf(app(10)), null)
    tracker.observe(20, sysui)
    assertEquals(first, tracker.select(listOf(app(10)), null))
    tracker.observe(10, wechat)
    assertNotEquals(first, tracker.select(listOf(app(10)), null))
  }

  @Test fun eventsWithoutAWindowIdDoNotGuessARootlessSource() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(-1, wechat)
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(listOf(app(10)), null))
  }

  @Test fun removalEventsInvalidateSourcesEvenWhenNoCaptureRanBetweenWindows() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    tracker.forget(10)
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(listOf(app(10)), null))
  }

  @Test fun anotherFocusedAccessibilityOverlayCannotBeIgnoredForDisplayCapture() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    val overlay = CaptureWindowSnapshot(20, CaptureWindowRole.ACCESSIBILITY_OVERLAY, true, true, 9, "com.example.overlay")
    assertEquals(CaptureWindowSelection.Unconfirmed, tracker.select(listOf(app(10, wechat), overlay), null))
  }

  @Test fun unknownActiveSystemWindowAlsoBlocksDisplayCapture() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    val panel = CaptureWindowSnapshot(20, CaptureWindowRole.SYSTEM, true, false, 9)
    assertEquals(CaptureWindowSelection.SystemPanel, tracker.select(listOf(app(10, wechat), panel), null))
  }

  @Test fun sourceMustRemainConfirmedForASettledIntervalBeforeCapture() {
    val stability = CaptureWindowStability()
    val selection = CaptureWindowSelection.Ready(CaptureWindowIdentity(wechat, 10, 1))
    assertNull(stability.ready(selection, 1000))
    assertNull(stability.ready(selection, 1200))
    assertEquals(selection.identity, stability.ready(selection, 1400))
  }

  @Test fun panelOrWindowChangeRestartsTheSettledInterval() {
    val stability = CaptureWindowStability()
    val first = CaptureWindowSelection.Ready(CaptureWindowIdentity(wechat, 10, 1))
    val next = CaptureWindowSelection.Ready(CaptureWindowIdentity(wechat, 10, 2))
    stability.ready(first, 1000)
    assertNull(stability.ready(CaptureWindowSelection.SystemPanel, 1300))
    assertNull(stability.ready(first, 1400))
    assertNull(stability.ready(next, 1800))
    assertEquals(next.identity, stability.ready(next, 2200))
  }

  @Test fun sameAppSameWindowStateRevisionInvalidatesTheCapturedSource() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    val before = (tracker.select(listOf(app(10)), null) as CaptureWindowSelection.Ready).identity
    tracker.observe(10, wechat)
    val after = (tracker.select(listOf(app(10)), null) as CaptureWindowSelection.Ready).identity
    assertTrue(CaptureSourceRules.eventInvalidates(before, wechat, after, "com.shengzhang.app", false))
    assertTrue(CaptureSourceRules.selectionInvalidates(before, CaptureWindowSelection.Ready(after)))
    assertFalse(tracker.unchanged(before))
  }

  @Test fun shortcutReturnCanRebindTheSourceUntilTheScreenshotExists() {
    val expected = CaptureWindowIdentity(wechat, 10, 1)
    val refreshed = CaptureWindowIdentity(wechat, 10, 2)
    assertTrue(CaptureSourceRules.rebindsBeforeCapture(expected, refreshed, captured = false))
    assertFalse(CaptureSourceRules.rebindsBeforeCapture(expected, refreshed, captured = true))
    assertFalse(CaptureSourceRules.rebindsBeforeCapture(expected, CaptureWindowIdentity(alipay, 10, 2), captured = false))
    assertFalse(CaptureSourceRules.rebindsBeforeCapture(expected, CaptureWindowIdentity(wechat, 11, 2), captured = false))
  }

  @Test fun ownOverlayKeyboardAndSystemUiEventsDoNotInvalidateTheSource() {
    val expected = CaptureWindowIdentity(wechat, 10, 1)
    val unrelatedWindow = CaptureWindowIdentity("com.other", 20, 2)
    assertFalse(CaptureSourceRules.eventInvalidates(expected, "com.shengzhang.app", unrelatedWindow, "com.shengzhang.app", false))
    assertFalse(CaptureSourceRules.eventInvalidates(expected, sysui, unrelatedWindow, "com.shengzhang.app", false))
    assertFalse(CaptureSourceRules.eventInvalidates(expected, "com.example.keyboard", unrelatedWindow, "com.shengzhang.app", true))
    assertFalse(CaptureSourceRules.selectionInvalidates(expected, CaptureWindowSelection.SystemPanel))
    assertFalse(CaptureSourceRules.selectionInvalidates(expected, CaptureWindowSelection.Unconfirmed))
  }

  @Test fun sourceCheckpointSurvivesOcclusionButNotANewSourceStateOrRemoval() {
    val tracker = CaptureWindowTracker("com.shengzhang.app")
    tracker.observe(10, wechat)
    val expected = (tracker.select(listOf(app(10)), null) as CaptureWindowSelection.Ready).identity
    tracker.observe(20, sysui)
    val panel = CaptureWindowSnapshot(20, CaptureWindowRole.SYSTEM, true, true, 9, sysui)
    tracker.select(listOf(panel), CaptureActiveRoot(20, sysui))
    assertTrue(tracker.unchanged(expected))
    assertEquals(CaptureWindowSelection.Ready(expected), tracker.select(listOf(app(10)), null))
    tracker.select(listOf(app(10, wechat)), null)
    assertTrue(tracker.unchanged(expected))
    tracker.observe(10, wechat)
    assertFalse(tracker.unchanged(expected))
    val next = (tracker.select(listOf(app(10)), null) as CaptureWindowSelection.Ready).identity
    tracker.forget(10)
    assertFalse(tracker.unchanged(next))
  }

  @Test fun lateWindowCheckCannotApplyToANewTaskWithTheSameWindow() {
    val first = OverlayTask("first", 1, 1000)
    val next = OverlayTask("next", 2, 1001)
    val source = CaptureWindowIdentity(wechat, 10, 1)
    val check = CaptureWindowCheck(first, source)
    assertTrue(check.appliesTo(first, source))
    assertFalse(check.appliesTo(next, source))
    assertFalse(check.appliesTo(null, null))
  }

  @Test fun lateWindowCheckCannotApplyAfterItsExpectedSourceWasRebound() {
    val task = OverlayTask("capture", 1, 1000)
    val oldSource = CaptureWindowIdentity(wechat, 10, 1)
    val newSource = oldSource.copy(revision = 2)
    val check = CaptureWindowCheck(task, oldSource)
    assertFalse(check.appliesTo(task, newSource))
    assertFalse(check.appliesTo(task, null))
  }

  @Test fun transientSystemImeAndOwnOverlayOcclusionDoNotEraseTheRootlessWindowsMapping() {
    listOf(CaptureWindowRole.SYSTEM to sysui, CaptureWindowRole.INPUT_METHOD to "com.example.keyboard",
      CaptureWindowRole.ACCESSIBILITY_OVERLAY to "com.shengzhang.app").forEach { (role, pkg) ->
      val tracker = CaptureWindowTracker("com.shengzhang.app")
      tracker.observe(10, wechat)
      tracker.select(listOf(app(10)), null)
      tracker.observe(20, pkg)
      tracker.select(listOf(CaptureWindowSnapshot(20, role, true, true, 9, pkg)), CaptureActiveRoot(20, pkg))
      assertEquals(CaptureWindowSelection.Ready(CaptureWindowIdentity(wechat, 10, 1)), tracker.select(listOf(app(10)), null))
    }
  }
}
