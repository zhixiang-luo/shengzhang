package com.shengzhang.screencapture

import java.text.Normalizer
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatterBuilder

data class OverlayCategory(val id: String, val name: String, val type: String, val parentId: String?, val archived: Boolean = false)
data class OverlayCategorySelection(val rootId: String, val childId: String?)
data class OverlayTask(val captureId: String, val generation: Long, val createdAt: Long)
data class OverlayCloudBill(
  val amountMinor: Int?, val type: String, val merchant: String?, val item: String?,
  val occurredAt: String?, val categoryId: String?, val blockingReason: String?, val amountIssue: String? = null
)
enum class OverlayField { AMOUNT, NOTE, TYPE, CATEGORY, TIME }
data class OverlayDraft(
  val amount: String = "", val note: String = "", val type: String = "expense", val categoryId: String? = null,
  val occurredAt: String = "", val defaultTime: Boolean = true, val blockingReason: String? = null,
  val edited: Set<OverlayField> = emptySet(), val capturedAt: String = occurredAt
)

object OverlayBillRules {
  private val utcFormat = DateTimeFormatterBuilder().appendInstant(3).toFormatter()
  const val MAX_AMOUNT_MINOR = 99_999_999

  fun canSave(draft: OverlayDraft, categories: List<OverlayCategory>): Boolean = draft.blockingReason == null &&
    parseAmount(draft.amount) != null && utcDate(draft.occurredAt) != null && categorySelection(draft.categoryId, draft.type, categories) != null

  fun mergeCloud(draft: OverlayDraft, bill: OverlayCloudBill, categories: List<OverlayCategory>): OverlayDraft {
    val type = if (OverlayField.TYPE in draft.edited || OverlayField.CATEGORY in draft.edited) draft.type else bill.type
    val category = if (OverlayField.CATEGORY in draft.edited || OverlayField.TYPE in draft.edited) draft.categoryId else {
      bill.categoryId?.takeIf { categorySelection(it, type, categories) != null }
        ?: categories.find { it.id == "$type-other" && it.parentId == null && categorySelection(it.id, type, categories) != null }?.id
    }
    return draft.copy(
      amount = if (OverlayField.AMOUNT in draft.edited) draft.amount else bill.amountMinor?.let { "%d.%02d".format(java.util.Locale.US, it / 100, it % 100) } ?: "",
      note = if (OverlayField.NOTE in draft.edited) draft.note else listOfNotNull(bill.item, bill.merchant?.takeIf { it != bill.item }).joinToString(" · "),
      type = type,
      categoryId = category?.takeIf { categorySelection(it, type, categories) != null },
      occurredAt = if (OverlayField.TIME in draft.edited) draft.occurredAt else bill.occurredAt ?: draft.capturedAt,
      defaultTime = if (OverlayField.TIME in draft.edited) draft.defaultTime else bill.occurredAt == null,
      blockingReason = bill.blockingReason
    )
  }

  fun parseAmount(value: String): Int? {
    val text = Normalizer.normalize(value.trim(), Normalizer.Form.NFKC)
    if (!Regex("[0-9]{1,6}(\\.[0-9]{1,2})?").matches(text)) return null
    val pieces = text.split('.')
    val cents = pieces[0].toLong() * 100 + (pieces.getOrNull(1)?.padEnd(2, '0')?.toInt() ?: 0)
    return cents.takeIf { it in 1L..MAX_AMOUNT_MINOR.toLong() }?.toInt()
  }

  fun validatedAmount(value: Any?): Int? {
    if (value !is Number) return null
    val number = value.toDouble()
    if (!number.isFinite() || number < 1 || number > MAX_AMOUNT_MINOR || number != number.toLong().toDouble()) return null
    return number.toInt()
  }

  fun utcDate(value: String): String? = runCatching {
    utcFormat.format(OffsetDateTime.parse(value).toInstant())
  }.getOrNull()

  fun categorySelection(id: String?, type: String, categories: List<OverlayCategory>): OverlayCategorySelection? {
    if (type != "expense" && type != "income") return null
    val selected = categories.find { it.id == id && !it.archived && it.type == type } ?: return null
    if (selected.parentId == null) return OverlayCategorySelection(selected.id, null)
    val root = categories.find { it.id == selected.parentId && !it.archived && it.type == type && it.parentId == null } ?: return null
    return OverlayCategorySelection(root.id, selected.id)
  }
}

class OverlayTaskGate {
  private var generation = 0L
  private var current: OverlayTask? = null

  @Synchronized fun start(captureId: String, now: Long): OverlayTask {
    require(captureId.isNotBlank() && captureId.length <= 100)
    return OverlayTask(captureId, ++generation, now).also { current = it }
  }

  @Synchronized fun isCurrent(task: OverlayTask, now: Long): Boolean =
    current == task && now >= task.createdAt && now - task.createdAt < MAX_AGE_MS

  @Synchronized fun cancel() { current = null; generation++ }

  companion object { const val MAX_AGE_MS = 5 * 60 * 1000L }
}
