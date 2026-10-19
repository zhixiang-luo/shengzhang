import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORY_SEEDS } from './categories';

describe('default categories', () => {
  it('uses unique stable ids', () => {
    const ids = DEFAULT_CATEGORY_SEEDS.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains only one child level', () => {
    const parents = new Set(
      DEFAULT_CATEGORY_SEEDS.filter((category) => category.parentId === null).map((category) => category.id),
    );
    for (const category of DEFAULT_CATEGORY_SEEDS) {
      if (category.parentId) expect(parents.has(category.parentId)).toBe(true);
    }
    expect(new Set(DEFAULT_CATEGORY_SEEDS.map((category) => category.id)).size).toBe(DEFAULT_CATEGORY_SEEDS.length);
  });

  it('covers expense and income', () => {
    expect(DEFAULT_CATEGORY_SEEDS.some((category) => category.type === 'expense')).toBe(true);
    expect(DEFAULT_CATEGORY_SEEDS.some((category) => category.type === 'income')).toBe(true);
  });
});
