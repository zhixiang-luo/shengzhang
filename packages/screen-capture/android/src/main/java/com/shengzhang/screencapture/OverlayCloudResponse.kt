package com.shengzhang.screencapture

import org.json.JSONObject

/** Strict response boundary. Evidence is validated, never used to recover a null amount. */
object OverlayCloudResponse {
  fun decode(json: JSONObject, captureId: String, categories: List<OverlayCategory>): OverlayCloudBill {
    require(json.optString("captureId") == captureId) { "识别结果已失效，请重新触发" }
    val bill = json.getJSONObject("bill")
    val type = bill.getString("type")
    require(type == "expense" || type == "income") { "识别结果异常，请重试" }
    fun text(key: String, limit: Int): String? {
      require(bill.has(key)) { "识别结果不完整，请重试" }
      if (bill.isNull(key)) return null
      val value = bill.get(key)
      require(value is String && value.length <= limit) { "识别结果异常，请重试" }
      return value.trim().takeIf { it.isNotEmpty() }
    }
    require(bill.has("amountMinor")) { "识别结果不完整，请重试" }
    val amount = if (bill.isNull("amountMinor")) null else requireNotNull(OverlayBillRules.validatedAmount(bill.get("amountMinor"))) { "识别金额异常，请手动填写" }
    val occurred = text("occurredAt", 100)?.let { requireNotNull(OverlayBillRules.utcDate(it)) { "识别时间异常，请手动选择" } }
    val category = text("categoryId", 100)?.takeIf { OverlayBillRules.categorySelection(it, type, categories) != null }
    val blocking = text("blockingReason", 120)
    text("amountEvidence", 160)
    val issue = if (!bill.has("amountIssue") || bill.isNull("amountIssue")) null else {
      val value = bill.get("amountIssue")
      require(value is String && value in setOf("not_read", "unverified")) { "识别结果异常，请重试" }
      value
    }
    return OverlayCloudBill(if (blocking == null) amount else null, type, text("merchant", 40), text("item", 40), occurred, category, blocking,
      issue.takeIf { amount == null && blocking == null })
  }
}
