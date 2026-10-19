import { asc, eq } from 'drizzle-orm';

import type { AppDatabase } from './schema-types';
import { categories } from './schema';

export type CategoryRow = typeof categories.$inferSelect;

export function listCategories(db: AppDatabase, includeArchived = false): CategoryRow[] {
  const query = db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  const rows = query.all();
  return includeArchived ? rows : rows.filter((category) => !category.isArchived);
}

export function listCategoriesByType(
  db: AppDatabase,
  type: 'expense' | 'income',
  includeArchived = false,
): CategoryRow[] {
  return listCategories(db, includeArchived).filter((category) => category.type === type);
}

export function findCategory(db: AppDatabase, id: string): CategoryRow | null {
  return db.select().from(categories).where(eq(categories.id, id)).get() ?? null;
}
