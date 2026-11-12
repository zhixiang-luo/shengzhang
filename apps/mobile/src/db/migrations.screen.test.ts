import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { migrateToVersion3 } from './migrations';

function createVersion2Database() {
  const database = new DatabaseSync(':memory:');
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
      updated_at TEXT NOT NULL
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
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
      currency TEXT NOT NULL DEFAULT 'CNY',
      category_id TEXT NOT NULL,
      subcategory_id TEXT NULL,
      occurred_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL CHECK(source IN ('voice', 'manual')),
      voice_batch_id TEXT NULL,
      voice_entry_index INTEGER NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES categories(id),
      FOREIGN KEY (voice_batch_id) REFERENCES voice_batches(request_id)
    );
    CREATE INDEX transactions_occurred_at_idx ON transactions(occurred_at);
    CREATE INDEX transactions_type_occurred_at_idx ON transactions(type, occurred_at);
    CREATE INDEX transactions_category_occurred_at_idx ON transactions(category_id, occurred_at);
    CREATE INDEX transactions_voice_batch_idx ON transactions(voice_batch_id);
    INSERT INTO categories VALUES (
      'food', '餐饮', 'expense', NULL, 'food', '#E89A96', 0, 1, 0,
      '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'
    );
    INSERT INTO transactions VALUES (
      'old-row', 'expense', 2500, 'CNY', 'food', NULL,
      '2026-11-01T04:00:00.000Z', '午饭', 'manual', NULL, NULL,
      '2026-11-01T04:00:00.000Z', '2026-11-01T04:00:00.000Z', NULL
    );
  `);
  return database;
}

describe('screen source migration', () => {
  it('preserves existing rows and accepts screen-captured transactions', async () => {
    const database = createVersion2Database();

    await migrateToVersion3({
      async execAsync(sql) {
        database.exec(sql);
      },
    });

    expect(database.prepare('SELECT id, source FROM transactions').get()).toMatchObject({
      id: 'old-row',
      source: 'manual',
    });
    expect(() =>
      database
        .prepare(
          `INSERT INTO transactions
            (id, type, amount_minor, category_id, occurred_at, note, source, created_at, updated_at)
           VALUES (?, 'expense', 2600, 'food', ?, '打车', 'screen', ?, ?)`,
        )
        .run(
          'capture-1',
          '2026-11-12T10:00:00.000Z',
          '2026-11-12T10:00:00.000Z',
          '2026-11-12T10:00:00.000Z',
        ),
    ).not.toThrow();
  });
});
