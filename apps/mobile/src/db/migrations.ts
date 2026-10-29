import { DEFAULT_CATEGORY_SEEDS } from '@shengzhang/domain';
import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 2;

const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
    parent_id TEXT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_preset INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS categories_type_parent_sort_idx
    ON categories(type, parent_id, sort_order);
  CREATE INDEX IF NOT EXISTS categories_archived_idx ON categories(is_archived);

  CREATE TABLE IF NOT EXISTS voice_batches (
    request_id TEXT PRIMARY KEY NOT NULL,
    transcript TEXT NOT NULL,
    entry_count INTEGER NOT NULL,
    unresolved_fields TEXT NOT NULL DEFAULT '[]',
    undo_expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
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

  CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON transactions(occurred_at);
  CREATE INDEX IF NOT EXISTS transactions_type_occurred_at_idx ON transactions(type, occurred_at);
  CREATE INDEX IF NOT EXISTS transactions_category_occurred_at_idx
    ON transactions(category_id, occurred_at);
  CREATE INDEX IF NOT EXISTS transactions_voice_batch_idx ON transactions(voice_batch_id);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS backup_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK(id = 1),
    status TEXT NOT NULL DEFAULT 'none'
      CHECK(status IN ('none', 'pending', 'backing_up', 'succeeded', 'failed')),
    last_backup_at TEXT NULL,
    last_error_code TEXT NULL,
    checksum TEXT NULL
  );

  INSERT OR IGNORE INTO backup_state (id, status) VALUES (1, 'none');

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  );
`;

async function seedDefaultCategories(db: SQLiteDatabase) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORY_SEEDS) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories
          (id, name, type, parent_id, icon, color, sort_order, is_preset, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
        category.id,
        category.name,
        category.type,
        category.parentId,
        category.icon,
        category.color,
        category.sortOrder,
        now,
        now,
      );
    }
  });
}

async function updatePresetCategoryIcons(db: SQLiteDatabase) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORY_SEEDS) {
      await db.runAsync(
        'UPDATE categories SET icon = ?, updated_at = ? WHERE id = ? AND is_preset = 1',
        category.icon,
        now,
        category.id,
      );
    }
  });
}

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion < 1) {
    await db.execAsync(INITIAL_SCHEMA);
    await seedDefaultCategories(db);
    await db.runAsync('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)', new Date().toISOString());
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (currentVersion < 2) {
    await updatePresetCategoryIcons(db);
    await db.runAsync(
      'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (2, ?)',
      new Date().toISOString(),
    );
    await db.execAsync('PRAGMA user_version = 2');
  }
}
