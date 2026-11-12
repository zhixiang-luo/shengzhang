package com.shengzhang.screencapture

object PaymentPageTextHeuristics {
  private val actualPaidAmount = Regex(
    """(?:实付|实际支付|支付金额|付款金额|交易金额|消费金额)[ \t]*[:：]?[ \t]*(?:\r?\n[ \t]*)?[¥￥]?[ \t]*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?[ \t]*元?""",
    RegexOption.IGNORE_CASE
  )
  private val sensitiveContext = Regex("订单号|订单编号|交易号|流水号|余额|手机号|尾号|卡号")

  fun hasTrustedPaidAmount(text: String): Boolean {
    val safeText = normalizeWidth(text)
      .lineSequence()
      .map(String::trim)
      .filter(String::isNotEmpty)
      .filterNot(sensitiveContext::containsMatchIn)
      .joinToString("\n")
    return actualPaidAmount.containsMatchIn(safeText)
  }

  private fun normalizeWidth(text: String): String {
    return buildString(text.length) {
      text.forEach { character ->
        append(
          when (character) {
            in '０'..'９' -> ('0'.code + (character.code - '０'.code)).toChar()
            '￥' -> '¥'
            '．' -> '.'
            '，' -> ','
            '：' -> ':'
            else -> character
          }
        )
      }
    }
  }
}
