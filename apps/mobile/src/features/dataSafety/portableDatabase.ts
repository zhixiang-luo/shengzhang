import { DEFAULT_CATEGORY_SEEDS, type PortableBackupData } from '@shengzhang/domain';

export type PortableSqlValue = string | number | null;

export interface PortableSqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: PortableSqlValue[]): Promise<unknown>;
}

async function deletePortableRows(executor: PortableSqlExecutor) {
  await executor.execAsync(`
    DELETE FROM transactions;
    DELETE FROM voice_batches;
    DELETE FROM categories;
    DELETE FROM app_settings;
  `);
}

async function insertCategories(
  executor: PortableSqlExecutor,
  categories: PortableBackupData['categories'],
) {
  const ordered = [...categories].sort((left, right) => {
    if (left.parentId === null && right.parentId !== null) return -1;
    if (left.parentId !== null && right.parentId === null) return 1;
    return left.sortOrder - right.sortOrder;
  });

  for (const category of ordered) {
    await executor.runAsync(
      `INSERT INTO categories
        (id, name, type, parent_id, icon, color, sort_order, is_preset, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      category.id,
      category.name,
      category.type,
      category.parentId,
      category.icon,
      category.color,
      category.sortOrder,
      category.isPreset ? 1 : 0,
      category.isArchived ? 1 : 0,
      category.createdAt,
      category.updatedAt,
    );
  }
}

async function markBackupPending(executor: PortableSqlExecutor) {
  await executor.runAsync("UPDATE backup_state SET status = 'pending' WHERE id = 1");
}

export async function replacePortableData(
  executor: PortableSqlExecutor,
  data: PortableBackupData,
) {
  await deletePortableRows(executor);
  await insertCategories(executor, data.categories);

  for (const batch of data.voiceBatches) {
    await executor.runAsync(
      `INSERT INTO voice_batches
        (request_id, transcript, entry_count, unresolved_fields, undo_expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      batch.requestId,
      batch.transcript,
      batch.entryCount,
      batch.unresolvedFields,
      batch.undoExpiresAt,
      batch.createdAt,
    );
  }

  for (const transaction of data.transactions) {
    await executor.runAsync(
      `INSERT INTO transactions
        (id, type, amount_minor, currency, category_id, subcategory_id, occurred_at, note,
         source, voice_batch_id, voice_entry_index, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transaction.id,
      transaction.type,
      transaction.amountMinor,
      transaction.currency,
      transaction.categoryId,
      transaction.subcategoryId,
      transaction.occurredAt,
      transaction.note,
      transaction.source,
      transaction.voiceBatchId,
      transaction.voiceEntryIndex,
      transaction.createdAt,
      transaction.updatedAt,
      transaction.deletedAt,
    );
  }

  for (const setting of data.appSettings) {
    await executor.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)`,
      setting.key,
      setting.value,
      setting.updatedAt,
    );
  }

  await markBackupPending(executor);
}

export async function clearPortableData(executor: PortableSqlExecutor) {
  const now = new Date().toISOString();
  await deletePortableRows(executor);
  await insertCategories(
    executor,
    DEFAULT_CATEGORY_SEEDS.map((category) => ({
      ...category,
      isPreset: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })),
  );
  await markBackupPending(executor);
}
