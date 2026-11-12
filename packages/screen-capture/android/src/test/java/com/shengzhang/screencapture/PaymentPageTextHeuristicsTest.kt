package com.shengzhang.screencapture

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentPageTextHeuristicsTest {
  @Test
  fun explicitPaidAmountIsEnoughToSkipOcr() {
    assertTrue(
      PaymentPageTextHeuristics.hasTrustedPaidAmount(
        "微信支付\n支付成功\n实付 ¥26.00\n收款方：滴滴出行"
      )
    )
  }

  @Test
  fun orderNumberAndBalanceAreNotPaidAmounts() {
    assertFalse(
      PaymentPageTextHeuristics.hasTrustedPaidAmount(
        "订单号 202611120001\n余额 ¥9999.00"
      )
    )
  }

  @Test
  fun paidAmountLabelAndValueMayBeSeparateAccessibilityNodes() {
    assertTrue(
      PaymentPageTextHeuristics.hasTrustedPaidAmount(
        "支付成功\n支付金额\n¥26.00\n收款方\n滴滴出行"
      )
    )
  }

  @Test
  fun fullWidthDigitsAreStillRecognized() {
    assertTrue(
      PaymentPageTextHeuristics.hasTrustedPaidAmount(
        "付款成功\n实付 ￥２６．００ 元"
      )
    )
  }
}
