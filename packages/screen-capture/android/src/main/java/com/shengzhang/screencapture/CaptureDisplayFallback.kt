package com.shengzhang.screencapture

/**
 * Display capture is a last resort for OEMs that hide an application's
 * accessibility windows entirely. The screenshot is still only taken after an
 * explicit user action and only while a supported payment app is foreground.
 */
object CaptureDisplayRules {
  private const val WECHAT = "com.tencent.mm"
  private const val ALIPAY = "com.eg.android.AlipayGphone"

  fun isTargetPackage(value: String?): Boolean = value == WECHAT || value == ALIPAY

  fun eligible(observation: CaptureWindowObservation): Boolean {
    if (observation.snapshots.any { it.role != CaptureWindowRole.SYSTEM }) return false
    if (observation.snapshots.any { it.role == CaptureWindowRole.SYSTEM && (it.active || it.focused) }) return false
    val active = observation.activeRoot ?: return true
    return active.packageName == "com.android.systemui" ||
      active.packageName == "com.tencent.mm" ||
      active.packageName == "com.eg.android.AlipayGphone"
  }
}

class CaptureDisplayStability {
  private var eligibleSince: Long? = null

  fun ready(eligible: Boolean, now: Long): Boolean {
    if (!eligible) {
      eligibleSince = null
      return false
    }
    if (eligibleSince == null || now < eligibleSince!!) {
      eligibleSince = now
      return false
    }
    return now - eligibleSince!! >= 350L
  }
}

object PaymentDetailOcrRules {
  private val successStatus = Regex("""(?:交易成功|支付成功|付款成功|已支付|已付款|收款成功)""")
  private val unsuccessfulStatus = Regex("""(?:交易关闭|支付失败|付款失败|已取消|已撤销|待支付|待付款|处理中|退款中|退款成功)""")
  private val detailTitle = Regex("""(?:账单|帐单|交易|付款|支付|订单)详情""")
  private val currencyAmount = Regex("""[¥￥]\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?""")
  private val signedAmount = Regex("""(?<![\d.])[-−+]\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?![\d.])""")
  private val decimalAmount = Regex("""(?<![\d.])\d{1,6}\.\d{2}(?![\d.])""")
  private val labeledAmount = Regex(
    """(?:实付|实际支付|支付金额|付款金额|交易金额|订单金额|金额|合计)[^0-9¥￥+\-−]{0,8}[¥￥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?"""
  )
  private val structuralLabels = Regex(
    """(?:付款方式|支付方式|交易单号|交易号|商户订单号|商家订单号|收款方|商户全称|支付时间|付款时间|交易时间|创建时间)"""
  )

  fun isSingleBillDetail(text: String): Boolean {
    val normalized = normalizeWidth(text)
    if (unsuccessfulStatus.containsMatchIn(normalized)) return false
    if (!successStatus.containsMatchIn(normalized)) return false
    val structure = detailTitle.containsMatchIn(normalized) ||
      structuralLabels.findAll(normalized).map { it.value }.toSet().size >= 2
    if (!structure) return false
    return currencyAmount.containsMatchIn(normalized) ||
      signedAmount.containsMatchIn(normalized) ||
      labeledAmount.containsMatchIn(normalized) ||
      decimalAmount.containsMatchIn(normalized)
  }

  private fun normalizeWidth(text: String): String = buildString(text.length) {
    text.forEach { character ->
      append(
        when (character) {
          in '０'..'９' -> ('0'.code + (character.code - '０'.code)).toChar()
          '￥' -> '¥'
          '．' -> '.'
          '，' -> ','
          '：' -> ':'
          '−' -> '-'
          else -> character
        }
      )
    }
  }
}
