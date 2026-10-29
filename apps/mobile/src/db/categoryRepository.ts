import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

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

export interface CreateCategoryInput {
  name: string;
  type: 'expense' | 'income';
  parentId: string | null;
  color: string;
  icon?: string;
}

export function createCategory(db: AppDatabase, input: CreateCategoryInput): CategoryRow {
  const name = input.name.trim();
  if (!name || name.length > 12) throw new Error('分类名称需要 1–12 个字');

  let parent: CategoryRow | null = null;
  if (input.parentId) {
    parent = findCategory(db, input.parentId);
    if (!parent || parent.parentId !== null || parent.type !== input.type) {
      throw new Error('上级分类不可用');
    }
  }

  const siblings = listCategories(db, true).filter(
    (category) =>
      category.type === input.type &&
      (category.parentId ?? null) === (input.parentId ?? null),
  );
  if (siblings.some((category) => category.name.trim() === name)) {
    throw new Error('同级分类里已经有这个名字');
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const sortOrder =
    siblings.reduce((maximum, category) => Math.max(maximum, category.sortOrder), -1) + 1;

  db.insert(categories)
    .values({
      id,
      name,
      type: input.type,
      parentId: input.parentId,
      icon: input.icon?.trim() || parent?.icon || 'other',
      color: parent?.color ?? input.color,
      sortOrder,
      isPreset: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = findCategory(db, id);
  if (!created) throw new Error('分类创建失败');
  return created;
}

export function updateCategory(
  db: AppDatabase,
  id: string,
  input: { name: string; icon?: string },
) {
  const category = findCategory(db, id);
  if (!category) throw new Error('分类不存在');
  const name = input.name.trim();
  if (!name || name.length > 12) throw new Error('分类名称需要 1–12 个字');

  const duplicate = listCategories(db, true).some(
    (item) =>
      item.id !== id &&
      item.type === category.type &&
      (item.parentId ?? null) === (category.parentId ?? null) &&
      item.name.trim() === name,
  );
  if (duplicate) throw new Error('同级分类里已经有这个名字');

  db.update(categories)
    .set({
      name,
      icon: input.icon?.trim() || category.icon,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(categories.id, id))
    .run();
}

export function renameCategory(db: AppDatabase, id: string, nextName: string) {
  updateCategory(db, id, { name: nextName });
}

export function setCategoryArchived(db: AppDatabase, id: string, archived: boolean) {
  const category = findCategory(db, id);
  if (!category) throw new Error('分类不存在');
  const now = new Date().toISOString();
  const ids = category.parentId
    ? [category.id]
    : [category.id, ...listCategories(db, true).filter((item) => item.parentId === category.id).map((item) => item.id)];

  db.transaction((tx) => {
    ids.forEach((categoryId) => {
      tx.update(categories)
        .set({ isArchived: archived, updatedAt: now })
        .where(eq(categories.id, categoryId))
        .run();
    });
  });
}

export function reorderCategorySiblings(db: AppDatabase, orderedIds: string[]): boolean {
  if (orderedIds.length < 2) return false;

  const resolved = orderedIds.map((id) => findCategory(db, id));
  const first = resolved[0];
  if (
    !first ||
    new Set(orderedIds).size !== orderedIds.length ||
    resolved.some(
      (category) =>
        !category ||
        category.type !== first.type ||
        (category.parentId ?? null) !== (first.parentId ?? null),
    )
  ) {
    throw new Error('分类顺序无效');
  }
  const ordered = resolved as CategoryRow[];

  const visibleIds = new Set(orderedIds);
  const archivedSiblings = listCategories(db, true).filter(
    (item) =>
      item.isArchived &&
      item.type === first.type &&
      (item.parentId ?? null) === (first.parentId ?? null) &&
      !visibleIds.has(item.id),
  );
  const finalOrder = [...ordered, ...archivedSiblings];
  const currentOrder = listCategories(db, true).filter(
    (item) =>
      item.type === first.type && (item.parentId ?? null) === (first.parentId ?? null),
  );

  if (finalOrder.every((category, index) => category.id === currentOrder[index]?.id)) {
    return false;
  }

  const now = new Date().toISOString();
  db.transaction((tx) => {
    finalOrder.forEach((category, index) => {
      tx.update(categories)
        .set({ sortOrder: index, updatedAt: now })
        .where(eq(categories.id, category.id))
        .run();
    });
  });
  return true;
}
