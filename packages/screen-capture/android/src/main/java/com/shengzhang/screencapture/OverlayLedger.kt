package com.shengzhang.screencapture

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import java.time.Instant

data class OverlaySaveInput(
  val captureId: String, val type: String, val amountMinor: Int,
  val categoryId: String, val occurredAt: String, val note: String
)

object OverlayLedger {
  private fun open(context: Context, settings: OverlaySettings): SQLiteDatabase {
    val file = OverlayConfiguration.privateDatabaseFile(context, settings.databasePath)
    val db = SQLiteDatabase.openDatabase(file.absolutePath, null,
      SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.NO_LOCALIZED_COLLATORS)
    try {
      db.execSQL("PRAGMA foreign_keys = ON")
      db.rawQuery("PRAGMA busy_timeout = 5000", null).use { it.moveToFirst() }
      db.rawQuery("PRAGMA user_version", null).use {
        check(it.moveToFirst() && it.getInt(0) == 3) { "账本需要升级，请先打开声账" }
      }
      return db
    } catch (error: Exception) { db.close(); throw error }
  }

  private fun categories(db: SQLiteDatabase): List<OverlayCategory> = buildList {
    db.rawQuery("SELECT id, name, type, parent_id, is_archived FROM categories ORDER BY sort_order, id", null).use { cursor ->
      while (cursor.moveToNext()) add(OverlayCategory(cursor.getString(0), cursor.getString(1), cursor.getString(2),
        if (cursor.isNull(3)) null else cursor.getString(3), cursor.getInt(4) != 0))
    }
  }

  fun readCategories(context: Context, settings: OverlaySettings): List<OverlayCategory> = open(context, settings).use { db ->
    val all = categories(db)
    all.filter { OverlayBillRules.categorySelection(it.id, it.type, all) != null }
  }

  /**
   * Commits a bill the user already confirmed. The draft came from the card,
   * not from the live window, so a later window change must not roll it back.
   */
  fun save(context: Context, settings: OverlaySettings, input: OverlaySaveInput) {
    require(input.captureId.isNotBlank() && input.captureId.length <= 100) { "本次记账已失效" }
    require(OverlayBillRules.validatedAmount(input.amountMinor) != null) { "请填写大于 0 的金额" }
    val occurredAt = requireNotNull(OverlayBillRules.utcDate(input.occurredAt)) { "请填写有效时间" }
    open(context, settings).use { db ->
      db.beginTransactionNonExclusive()
      try {
        db.rawQuery("SELECT source, deleted_at FROM transactions WHERE id = ?", arrayOf(input.captureId)).use { cursor ->
          if (cursor.moveToFirst()) {
            check(cursor.getString(0) == "screen" && cursor.isNull(1)) { "这笔记录已删除，请重新触发记账" }
            // A repeated click reports success without changing a previously written record.
            db.setTransactionSuccessful()
            return
          }
        }
        val selected = requireNotNull(OverlayBillRules.categorySelection(input.categoryId, input.type, categories(db))) { "分类已变更，请重新选择" }
        val now = requireNotNull(OverlayBillRules.utcDate(Instant.now().toString()))
        val row = ContentValues().apply {
          put("id", input.captureId); put("type", input.type); put("amount_minor", input.amountMinor)
          put("currency", "CNY"); put("category_id", selected.rootId)
          if (selected.childId == null) putNull("subcategory_id") else put("subcategory_id", selected.childId)
          put("occurred_at", occurredAt); put("note", input.note.trim().take(200)); put("source", "screen")
          putNull("voice_batch_id"); putNull("voice_entry_index"); putNull("deleted_at")
          put("created_at", now); put("updated_at", now)
        }
        db.insertOrThrow("transactions", null, row)
        val backup = ContentValues().apply { put("status", "pending") }
        check(db.update("backup_state", backup, "id = 1", null) == 1) { "账本备份状态异常，请打开声账后重试" }
        db.setTransactionSuccessful()
      } finally { db.endTransaction() }
    }
  }
}
