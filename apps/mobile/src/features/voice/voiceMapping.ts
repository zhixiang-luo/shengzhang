import type { VoiceParseResponse } from '@shengzhang/contracts';
import type { ResolvedVoiceEntry } from '@shengzhang/domain';

import type { CategoryRow } from '../../db/categoryRepository';

export function resolveVoiceEntries(
  response: VoiceParseResponse,
  categories: CategoryRow[],
): ResolvedVoiceEntry[] {
  return response.entries.map((entry, index) => {
    if (!entry.amountMinor) {
      throw new Error(`第 ${index + 1} 笔缺少金额，请改为手动记账`);
    }
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
      amountMinor: entry.amountMinor,
      categoryId: root.id,
      subcategoryId: child?.id ?? null,
      occurredAt: entry.occurredAt ?? new Date().toISOString(),
      note: entry.note ?? '',
      categoryName: root.name,
      subcategoryName: child?.name ?? null,
    };
  });
}
