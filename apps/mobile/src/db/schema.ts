import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    parentId: text('parent_id'),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').notNull(),
    isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('categories_type_parent_sort_idx').on(table.type, table.parentId, table.sortOrder),
    index('categories_archived_idx').on(table.isArchived),
  ],
);

export const voiceBatches = sqliteTable('voice_batches', {
  requestId: text('request_id').primaryKey(),
  transcript: text('transcript').notNull(),
  entryCount: integer('entry_count').notNull(),
  unresolvedFields: text('unresolved_fields').notNull().default('[]'),
  undoExpiresAt: text('undo_expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull().default('CNY'),
    categoryId: text('category_id').notNull(),
    subcategoryId: text('subcategory_id'),
    occurredAt: text('occurred_at').notNull(),
    note: text('note').notNull().default(''),
    source: text('source', { enum: ['voice', 'manual'] }).notNull(),
    voiceBatchId: text('voice_batch_id'),
    voiceEntryIndex: integer('voice_entry_index'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('transactions_occurred_at_idx').on(table.occurredAt),
    index('transactions_type_occurred_at_idx').on(table.type, table.occurredAt),
    index('transactions_category_occurred_at_idx').on(table.categoryId, table.occurredAt),
    index('transactions_voice_batch_idx').on(table.voiceBatchId),
  ],
);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const backupState = sqliteTable('backup_state', {
  id: integer('id').primaryKey(),
  status: text('status', {
    enum: ['none', 'pending', 'backing_up', 'succeeded', 'failed'],
  })
    .notNull()
    .default('none'),
  lastBackupAt: text('last_backup_at'),
  lastErrorCode: text('last_error_code'),
  checksum: text('checksum'),
});

export const schemaMigrations = sqliteTable('schema_migrations', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});

export const schema = {
  categories,
  voiceBatches,
  transactions,
  appSettings,
  backupState,
  schemaMigrations,
};
