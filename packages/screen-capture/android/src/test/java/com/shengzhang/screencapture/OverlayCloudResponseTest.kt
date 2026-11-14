package com.shengzhang.screencapture

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class OverlayCloudResponseTest {
  private fun response(amount: Any? = null, issue: Any? = null): JSONObject = JSONObject().put("captureId", "capture").put("bill",
    JSONObject().put("type", "expense").put("amountMinor", amount ?: JSONObject.NULL)
      .put("amountEvidence", "实付 ¥12.34").put("merchant", JSONObject.NULL).put("item", JSONObject.NULL)
      .put("categoryId", JSONObject.NULL).put("occurredAt", JSONObject.NULL).put("blockingReason", JSONObject.NULL)
      .apply { if (issue != null) put("amountIssue", issue) })

  @Test fun oldGatewayCanOmitIssueWithoutRecoveringAnAmountFromItsEvidence() {
    val bill = OverlayCloudResponse.decode(response(), "capture", emptyList())
    assertNull(bill.amountMinor)
    assertNull(bill.amountIssue)
    assertEquals("", OverlayBillRules.mergeCloud(OverlayDraft(), bill, emptyList()).amount)
  }

  @Test fun unreadAndUnverifiedAmountsKeepDistinctReasonsAndRemainEmpty() {
    listOf("not_read", "unverified").forEach { issue ->
      val bill = OverlayCloudResponse.decode(response(issue = issue), "capture", emptyList())
      assertNull(bill.amountMinor)
      assertEquals(issue, bill.amountIssue)
      assertEquals("", OverlayBillRules.mergeCloud(OverlayDraft(), bill, emptyList()).amount)
    }
  }

  @Test fun recognizedAmountDoesNotCarryAnInapplicableMissingAmountReason() {
    val bill = OverlayCloudResponse.decode(response(1234, "unverified"), "capture", emptyList())
    assertEquals(1234, bill.amountMinor)
    assertNull(bill.amountIssue)
  }

  @Test fun blockingStillClearsAmountAndCannotBeMisreportedAsAmountNotRead() {
    val json = response(1234, "unverified")
    json.getJSONObject("bill").put("blockingReason", "交易尚未完成")
    val bill = OverlayCloudResponse.decode(json, "capture", emptyList())
    assertNull(bill.amountMinor)
    assertNull(bill.amountIssue)
    assertEquals("交易尚未完成", bill.blockingReason)
  }

  @Test fun unknownIssueDoesNotEscapeTheResponseBoundary() {
    assertThrows(IllegalArgumentException::class.java) {
      OverlayCloudResponse.decode(response(issue = "arbitrary returned text"), "capture", emptyList())
    }
  }

  @Test fun captureMismatchAndFractionalMinorAmountAreRejected() {
    assertThrows(IllegalArgumentException::class.java) { OverlayCloudResponse.decode(response(1234), "different", emptyList()) }
    assertThrows(IllegalArgumentException::class.java) { OverlayCloudResponse.decode(response(12.34), "capture", emptyList()) }
  }
}
