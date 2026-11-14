package com.shengzhang.screencapture

import org.junit.Assert.*
import org.junit.Test

class OverlayBillRulesTest {
  @Test fun decimalAmountsKeepExactCents() {
    assertEquals(2658, OverlayBillRules.parseAmount("26.58"))
    assertEquals(1, OverlayBillRules.parseAmount("０．０１"))
    assertEquals(99999999, OverlayBillRules.parseAmount("999999.99"))
  }

  @Test fun unknownZeroNegativeAndRoundedAmountsCannotSave() {
    listOf("", "0", "0.00", "-1", "1.001", "1e3", "1,000", "1000000").forEach {
      assertNull("Must reject $it", OverlayBillRules.parseAmount(it))
    }
  }

  @Test fun cloudAmountsMustBePositiveWholeCents() {
    assertEquals(2658, OverlayBillRules.validatedAmount(2658L))
    listOf(null, 0, -1, 26.58, 100000000L, "2658").forEach {
      assertNull(OverlayBillRules.validatedAmount(it))
    }
  }

  @Test fun offsetDatesAreStoredAsUtcWithMilliseconds() {
    assertEquals("2026-11-13T04:35:20.000Z", OverlayBillRules.utcDate("2026-11-13T12:35:20+08:00"))
    assertEquals("2026-11-13T04:35:20.123Z", OverlayBillRules.utcDate("2026-11-13T04:35:20.123Z"))
  }

  @Test fun ambiguousOrInvalidDatesCannotBeAccepted() {
    listOf("2026-11-13T12:35:20", "2026-02-30T12:00:00+08:00", "yesterday", "").forEach {
      assertNull(OverlayBillRules.utcDate(it))
    }
  }

  @Test fun categoryRootDoesNotSilentlySelectFirstChild() {
    assertEquals(OverlayCategorySelection("food", null), OverlayBillRules.categorySelection("food", "expense", categories))
    assertEquals(OverlayCategorySelection("food", "lunch"), OverlayBillRules.categorySelection("lunch", "expense", categories))
  }

  @Test fun archivedWrongTypeOrOrphanCategoriesCannotSave() {
    listOf("archived", "salary", "orphan", "unknown").forEach {
      assertNull(OverlayBillRules.categorySelection(it, "expense", categories))
    }
  }

  @Test fun newTaskAndCancellationRejectEarlierCallbacks() {
    val gate = OverlayTaskGate()
    val first = gate.start("first", 1000)
    assertTrue(gate.isCurrent(first, 1001))
    val next = gate.start("next", 1002)
    assertFalse(gate.isCurrent(first, 1003))
    assertTrue(gate.isCurrent(next, 1003))
    gate.cancel()
    assertFalse(gate.isCurrent(next, 1004))
  }

  @Test fun expiredTaskCannotUploadOrWrite() {
    val gate = OverlayTaskGate()
    val task = gate.start("capture", 1000)
    assertTrue(gate.isCurrent(task, 300999))
    assertFalse(gate.isCurrent(task, 301000))
    assertFalse(gate.isCurrent(task, 999))
  }

  @Test fun blockedResultCannotBeSavedEvenAfterMissingFieldsWereEdited() {
    val blocked = OverlayDraft(amount = "26.58", categoryId = "food", occurredAt = "2026-11-13T12:35:20+08:00",
      blockingReason = "交易尚未完成", edited = setOf(OverlayField.AMOUNT, OverlayField.CATEGORY))
    assertFalse(OverlayBillRules.canSave(blocked, categories))
    assertTrue(OverlayBillRules.canSave(blocked.copy(blockingReason = null), categories))
  }

  @Test fun retryDoesNotReplaceEditedAmountContentTypeCategoryOrTime() {
    val edited = OverlayDraft("18.20", "手动备注", "income", "salary", "2026-11-12T04:00:00.000Z", false,
      edited = OverlayField.entries.toSet())
    val bill = OverlayCloudBill(2658, "expense", "商户", "午餐", "2026-11-13T04:35:20.000Z", "food", null)
    assertEquals(edited, OverlayBillRules.mergeCloud(edited, bill, categories))
  }

  @Test fun cloudBlockedReasonStillAppliesToAnEditedDraft() {
    val edited = OverlayDraft(amount = "18.20", edited = setOf(OverlayField.AMOUNT))
    val bill = OverlayCloudBill(null, "expense", null, null, null, null, "付款失败")
    assertEquals("付款失败", OverlayBillRules.mergeCloud(edited, bill, categories).blockingReason)
  }

  @Test fun retryFillsOnlyFieldsTheUserHasNotEdited() {
    val edited = OverlayDraft("18.20", "手动备注", occurredAt = "2026-11-12T04:00:00.000Z",
      edited = setOf(OverlayField.AMOUNT, OverlayField.NOTE))
    val bill = OverlayCloudBill(2658, "income", "商户", "午餐", "2026-11-13T04:35:20.000Z", "salary", null)
    val result = OverlayBillRules.mergeCloud(edited, bill, categories)
    assertEquals("18.20", result.amount)
    assertEquals("手动备注", result.note)
    assertEquals("income", result.type)
    assertEquals("salary", result.categoryId)
    assertEquals("2026-11-13T04:35:20.000Z", result.occurredAt)
    assertFalse(result.defaultTime)
  }

  @Test fun manuallyChosenCategoryAlsoProtectsItsTypeFromAnOppositeCloudResult() {
    val draft = OverlayDraft(type = "expense", categoryId = "food", edited = setOf(OverlayField.CATEGORY))
    val bill = OverlayCloudBill(2658, "income", null, null, null, "salary", null)
    val result = OverlayBillRules.mergeCloud(draft, bill, categories)
    assertEquals("expense", result.type)
    assertEquals("food", result.categoryId)
    assertEquals("26.58", result.amount)
  }

  @Test fun missingCategoryUsesOnlyTheMatchingOtherRoot() {
    val available = categories + listOf(OverlayCategory("expense-other", "其他", "expense", null),
      OverlayCategory("other-child", "其他", "expense", "expense-other"), OverlayCategory("income-other", "其他", "income", null))
    val bill = OverlayCloudBill(2658, "expense", null, null, null, null, null)
    assertEquals("expense-other", OverlayBillRules.mergeCloud(OverlayDraft(), bill, available).categoryId)
    assertEquals("income-other", OverlayBillRules.mergeCloud(OverlayDraft(), bill.copy(type = "income"), available).categoryId)
    assertNull(OverlayBillRules.mergeCloud(OverlayDraft(), bill, categories).categoryId)
  }

  @Test fun retryWithoutTimeUsesTheCaptureTimeInsteadOfAnOlderCloudGuess() {
    val draft = OverlayDraft(occurredAt = "2026-11-10T04:00:00.000Z", defaultTime = false,
      capturedAt = "2026-11-13T04:35:20.000Z")
    val bill = OverlayCloudBill(2658, "expense", null, null, null, "food", null)
    val result = OverlayBillRules.mergeCloud(draft, bill, categories)
    assertEquals("2026-11-13T04:35:20.000Z", result.occurredAt)
    assertTrue(result.defaultTime)
  }

  private val categories = listOf(
    OverlayCategory("food", "餐饮", "expense", null),
    OverlayCategory("lunch", "午餐", "expense", "food"),
    OverlayCategory("salary", "工资", "income", null),
    OverlayCategory("archived", "旧分类", "expense", null, true),
    OverlayCategory("orphan", "无父分类", "expense", "missing")
  )
}
