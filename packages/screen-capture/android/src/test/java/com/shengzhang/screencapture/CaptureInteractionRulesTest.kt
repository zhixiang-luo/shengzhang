package com.shengzhang.screencapture

import org.junit.Assert.*
import org.junit.Test

class CaptureInteractionRulesTest {
  @Test fun tileLifecycleConfirmsPresenceAndRemovalRestoresTheUnaddedState() {
    assertEquals(true, TilePresenceRules.next(null, TilePresenceSignal.ADDED))
    assertEquals(false, TilePresenceRules.next(true, TilePresenceSignal.REMOVED))
    assertEquals(true, TilePresenceRules.next(false, TilePresenceSignal.LISTENING))
    assertEquals(true, TilePresenceRules.next(null, TilePresenceSignal.CLICKED))
  }

  @Test fun acceptedAndAlreadyPresentRequestsBothConfirmAnAddedTile() {
    assertEquals(true, TilePresenceRules.next(null, TilePresenceSignal.REQUEST_ADDED))
    assertEquals(true, TilePresenceRules.next(false, TilePresenceSignal.REQUEST_ALREADY_ADDED))
  }

  @Test fun decliningARequestDoesNotEraseConfirmedOrUnknownTilePresence() {
    assertEquals(true, TilePresenceRules.next(true, TilePresenceSignal.REQUEST_DECLINED))
    assertEquals(false, TilePresenceRules.next(false, TilePresenceSignal.REQUEST_DECLINED))
    assertNull(TilePresenceRules.next(null, TilePresenceSignal.REQUEST_DECLINED))
  }

  @Test fun shadeDismissalIsRetriedAfterAFailedGlobalAction() {
    val retry = CaptureShadeRetry()
    assertTrue(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 0))
    assertFalse(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 1))
    assertFalse(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 3))
    assertTrue(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 4))
    assertTrue(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 8))
  }

  @Test fun shadeRetryDoesNotRunForAnotherWindowSelection() {
    val retry = CaptureShadeRetry()
    assertFalse(retry.shouldRequest(CaptureWindowSelection.OtherApp, 0))
    assertFalse(retry.shouldRequest(CaptureWindowSelection.Unconfirmed, 1))
    assertTrue(retry.shouldRequest(CaptureWindowSelection.SystemPanel, 2))
  }

  @Test fun keyboardWaitsForWindowFocusEvenWhenEditorIsAlreadyAttachedAndFocused() {
    val request = EditorImeRequest()
    assertFalse(request.ready(true, false, true))
    assertTrue(request.ready(true, true, true))
    assertFalse(request.ready(true, true, true))
  }

  @Test fun keyboardWaitsForAttachmentAndEditorFocus() {
    val request = EditorImeRequest()
    assertFalse(request.ready(false, true, true))
    assertFalse(request.ready(true, true, false))
    assertTrue(request.ready(true, true, true))
  }

  @Test fun leavingTheEditorCancelsItsPendingKeyboardRequest() {
    val request = EditorImeRequest()
    request.cancel()
    assertFalse(request.ready(true, true, true))
  }
}
