import type { VoiceParseResponse } from '@shengzhang/contracts';
import type { ResolvedVoiceDraftEntry } from '@shengzhang/domain';

import type { CategoryRow } from '../../db/categoryRepository';

export function resolveVoiceDraftEntries(
  response: VoiceParseResponse,
  categories: CategoryRow[],
): ResolvedVoiceDraftEntry[] {
  return response.entries.map((entry) => {
    const type = entry.type ?? 'expense';
    const path = entry.categoryPath;
    const rootName = path?.[0] ?? '其他';
    const root =
      categories.find(
        (category) =>
          category.type === type &&
          category.parentId === null &&
          category.name === rootName &&
          !category.isArchived,
      ) ??
      categories.find(
        (category) =>
          category.type === type &&
          category.parentId === null &&
          category.name === '其他' &&
          !category.isArchived,
      );
    if (!root) throw new Error('没有找到可用分类，请先检查分类设置');

    const childName = path?.[1];
    const child = childName
      ? categories.find(
          (category) =>
            category.parentId === root.id &&
            category.name === childName &&
            !category.isArchived,
        )
      : null;

    return {
      type,
      // A missing amount stays null: it is never guessed, the user fills it in.
      amountMinor: entry.amountMinor && entry.amountMinor > 0 ? entry.amountMinor : null,
      categoryId: root.id,
      subcategoryId: child?.id ?? null,
      occurredAt: entry.occurredAt ?? new Date().toISOString(),
      note: entry.note ?? '',
      categoryName: root.name,
      subcategoryName: child?.name ?? null,
    };
  });
}
