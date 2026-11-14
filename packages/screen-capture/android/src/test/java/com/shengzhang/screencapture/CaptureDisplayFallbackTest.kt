package com.shengzhang.screencapture

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CaptureDisplayFallbackTest {
  private val wechat = "com.tencent.mm"
  private val sysui = "com.android.systemui"

  @Test fun windowlessWechatWithOnlyInactiveSystemChromeIsEligible() {
    val observation = CaptureWindowObservation(
      listOf(
        CaptureWindowSnapshot(1, CaptureWindowRole.SYSTEM, false, false, 0, sysui),
        CaptureWindowSnapshot(2, CaptureWindowRole.SYSTEM, false, false, 1)
      ),
      null,
      CaptureWindowSelection.Unconfirmed
    )
    assertTrue(CaptureDisplayRules.eligible(observation))
  }

  @Test fun anyApplicationOrInteractiveSystemWindowBlocksDisplayFallback() {
    val application = CaptureWindowSnapshot(3, CaptureWindowRole.APPLICATION, true, true, 2, wechat)
    val panel = CaptureWindowSnapshot(4, CaptureWindowRole.SYSTEM, true, true, 9, sysui)
    val base = CaptureWindowSnapshot(1, CaptureWindowRole.SYSTEM, false, false, 0, sysui)
    assertFalse(CaptureDisplayRules.eligible(
      CaptureWindowObservation(listOf(base, application), null, CaptureWindowSelection.Ready(
        CaptureWindowIdentity(wechat, 3, 1)
      ))
    ))
    assertFalse(CaptureDisplayRules.eligible(
      CaptureWindowObservation(listOf(base, panel), CaptureActiveRoot(4, sysui), CaptureWindowSelection.SystemPanel)
    ))
  }

  @Test fun anotherApplicationRootWithoutWindowsIsNotSilentlyTrusted() {
    val observation = CaptureWindowObservation(
      emptyList(),
      CaptureActiveRoot(7, "com.example.other"),
      CaptureWindowSelection.Unconfirmed
    )
    assertFalse(CaptureDisplayRules.eligible(observation))
  }

  @Test fun displayFallbackNeedsAStableEligibleInterval() {
    val stability = CaptureDisplayStability()
    assertFalse(stability.ready(true, 1000))
    assertFalse(stability.ready(true, 1200))
    assertTrue(stability.ready(true, 1400))
    assertFalse(stability.ready(false, 1500))
    assertFalse(stability.ready(true, 1600))
    assertTrue(stability.ready(true, 2000))
  }

  @Test fun paymentDetailOcrAcceptsCommonWechatAndAlipayStructures() {
    assertTrue(PaymentDetailOcrRules.isSingleBillDetail(
      "微信支付\n账单详情\n-42.80\n交易成功\n付款方式 零钱\n支付时间 2026-11-13 12:31"
    ))
    assertTrue(PaymentDetailOcrRules.isSingleBillDetail(
      "支付宝\n交易详情\n当前状态：交易成功\n¥ 26.58\n收款方 示例商店"
    ))
    assertTrue(PaymentDetailOcrRules.isSingleBillDetail(
      "付款详情\n付款方式 银行卡\n实付 18.00\n已支付"
    ))
  }

  @Test fun paymentDetailOcrRejectsGeneralChatMessagesAndFailedTransactions() {
    assertFalse(PaymentDetailOcrRules.isSingleBillDetail("支付成功\n¥26.58"))
    assertFalse(PaymentDetailOcrRules.isSingleBillDetail(
      "账单详情\n-26.58\n支付失败\n付款方式 零钱"
    ))
    assertFalse(PaymentDetailOcrRules.isSingleBillDetail(
      "账单详情\n交易成功\n订单号 202611130001"
    ))
  }
}
