import type {
  PortableAppSetting,
  PortableBackupData,
  PortableCategory,
  PortableTransaction,
  PortableVoiceBatch,
} from '@shengzhang/domain';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  clearPortableData,
  replacePortableData,
  type PortableSqlExecutor,
} from '../features/dataSafety/portableDatabase';
import type { AppDatabase } from './DatabaseProvider';

const LAST_EXPORT_AT_KEY = 'data-safety.last-export-at';

interface CategoryDbRow extends Omit<PortableCategory, 'isPreset' | 'isArchived'> {
  isPreset: number;
  isArchived: number;
}

function executorFor(database: SQLiteDatabase): PortableSqlExecutor {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: (sql, ...params) => database.runAsync(sql, ...params),
  };
}

export async function readLocalSnapshot(db: AppDatabase): Promise<PortableBackupData> {
  const categoryRows = await db.$client.getAllAsync<CategoryDbRow>(
    `SELECT id, name, type, parent_id AS parentId, icon, color,
            sort_order AS sortOrder, is_preset AS isPreset, is_archived AS isArchived,
            created_at AS createdAt, updated_at AS updatedAt
       FROM categories
      ORDER BY type, parent_id, sort_order, name`,
  );
  const categories: PortableCategory[] = categoryRows.map((row) => ({
    ...row,
    isPreset: row.isPreset === 1,
    isArchived: row.isArchived === 1,
  }));
  const transactions = await db.$client.getAllAsync<PortableTransaction>(
    `SELECT id, type, amount_minor AS amountMinor, currency, category_id AS categoryId,
            subcategory_id AS subcategoryId, occurred_at AS occurredAt, note, source,
            voice_batch_id AS voiceBatchId, voice_entry_index AS voiceEntryIndex,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
       FROM transactions
      ORDER BY occurred_at, created_at`,
  );
  const voiceBatches = await db.$client.getAllAsync<PortableVoiceBatch>(
    `SELECT request_id AS requestId, transcript, entry_count AS entryCount,
            unresolved_fields AS unresolvedFields, undo_expires_at AS undoExpiresAt,
            created_at AS createdAt
       FROM voice_batches
      ORDER BY created_at`,
  );
  const appSettings = await db.$client.getAllAsync<PortableAppSetting>(
    `SELECT key, value, updated_at AS updatedAt
       FROM app_settings
      ORDER BY key`,
  );
  return { categories, transactions, voiceBatches, appSettings };
}

export async function restoreLocalSnapshot(db: AppDatabase, snapshot: PortableBackupData) {
  await db.$client.withExclusiveTransactionAsync(async (transaction) => {
    await replacePortableData(executorFor(transaction), snapshot);
  });
}

export async function clearLocalLedger(db: AppDatabase) {
  await db.$client.withExclusiveTransactionAsync(async (transaction) => {
    await clearPortableData(executorFor(transaction));
  });
}

export async function readLastExportAt(db: AppDatabase): Promise<string | null> {
  const row = await db.$client.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    LAST_EXPORT_AT_KEY,
  );
  return row?.value ?? null;
}

export async function markExportCompleted(db: AppDatabase, exportedAt: string) {
  await db.$client.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    LAST_EXPORT_AT_KEY,
    exportedAt,
    exportedAt,
  );
}
