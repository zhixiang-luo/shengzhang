import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_CATEGORY_SEEDS, type PortableBackupData } from '@shengzhang/domain';
import { describe, expect, it } from 'vitest';

import {
  clearPortableData,
  replacePortableData,
  type PortableSqlExecutor,
} from './portableDatabase';

function createExecutor(database: DatabaseSync): PortableSqlExecutor {
  return {
    async execAsync(sql) {
      database.exec(sql);
    },
    async runAsync(sql, ...params) {
      database.prepare(sql).run(...params);
    },
  };
}

function createSchema(database: DatabaseSync) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      is_preset INTEGER NOT NULL,
      is_archived INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );
    CREATE TABLE voice_batches (
      request_id TEXT PRIMARY KEY NOT NULL,
      transcript TEXT NOT NULL,
      entry_count INTEGER NOT NULL,
      unresolved_fields TEXT NOT NULL,
      undo_expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT NULL,
      occurred_at TEXT NOT NULL,
      note TEXT NOT NULL,
      source TEXT NOT NULL,
      voice_batch_id TEXT NULL,
      voice_entry_index INTEGER NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES categories(id),
      FOREIGN KEY (voice_batch_id) REFERENCES voice_batches(request_id)
    );
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE backup_state (
      id INTEGER PRIMARY KEY NOT NULL,
      status TEXT NOT NULL
    );
    INSERT INTO backup_state (id, status) VALUES (1, 'none');
    INSERT INTO categories VALUES (
      'old-category', '旧分类', 'expense', NULL, 'other', '#000000', 0, 0, 0,
      '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'
    );
    INSERT INTO transactions VALUES (
      'old-transaction', 'expense', 100, 'CNY', 'old-category', NULL,
      '2026-11-01T00:00:00.000Z', '旧账', 'manual', NULL, NULL,
      '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z', NULL
    );
  `);
}

const replacement: PortableBackupData = {
  categories: [
    {
      id: 'expense-food',
      name: '餐饮',
      type: 'expense',
      parentId: null,
      icon: 'food',
      color: '#E89A96',
      sortOrder: 0,
      isPreset: true,
      isArchived: false,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'new-transaction',
      type: 'expense',
      amountMinor: 2500,
      currency: 'CNY',
      categoryId: 'expense-food',
      subcategoryId: null,
      occurredAt: '2026-11-05T04:00:00.000Z',
      note: '午饭',
      source: 'manual',
      voiceBatchId: null,
      voiceEntryIndex: null,
      createdAt: '2026-11-05T04:00:00.000Z',
      updatedAt: '2026-11-05T04:00:00.000Z',
      deletedAt: null,
    },
  ],
  voiceBatches: [],
  appSettings: [],
};

describe('portable database replacement', () => {
  it('replaces all portable tables and restores parent categories before children', async () => {
    const database = new DatabaseSync(':memory:');
    createSchema(database);
    const executor = createExecutor(database);

    await replacePortableData(executor, replacement);

    expect(database.prepare('SELECT COUNT(*) AS count FROM transactions').get()).toMatchObject({
      count: 1,
    });
    expect(database.prepare('SELECT id FROM transactions').get()).toMatchObject({
      id: 'new-transaction',
    });
    expect(database.prepare('SELECT status FROM backup_state WHERE id = 1').get()).toMatchObject({
      status: 'pending',
    });
  });

  it('rolls back the whole replacement when a write fails', async () => {
    const database = new DatabaseSync(':memory:');
    createSchema(database);
    const executor = createExecutor(database);
    const invalid = {
      ...replacement,
      categories: [replacement.categories[0], replacement.categories[0]],
    };

    await expect(
      (async () => {
        database.exec('BEGIN');
        try {
          await replacePortableData(executor, invalid);
          database.exec('COMMIT');
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      })(),
    ).rejects.toThrow();

    expect(database.prepare('SELECT id FROM transactions').get()).toMatchObject({
      id: 'old-transaction',
    });
  });

  it('clears user data and restores the preset category catalog', async () => {
    const database = new DatabaseSync(':memory:');
    createSchema(database);
    const executor = createExecutor(database);

    await clearPortableData(executor);

    expect(database.prepare('SELECT COUNT(*) AS count FROM transactions').get()).toMatchObject({
      count: 0,
    });
    expect(database.prepare('SELECT COUNT(*) AS count FROM categories').get()).toMatchObject({
      count: DEFAULT_CATEGORY_SEEDS.length,
    });
  });
});
