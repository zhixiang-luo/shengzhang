import { DEFAULT_CATEGORY_SEEDS } from '@shengzhang/domain';
import { describe, expect, it } from 'vitest';

import {
  CATEGORY_ICON_OPTIONS,
  normalizeCategoryIcon,
  resolveCategoryIcon,
} from './categoryIcons';

describe('category icon catalog', () => {
  it('contains unique icon choices for the custom category picker', () => {
    const values = CATEGORY_ICON_OPTIONS.map((option) => option.value);
    expect(values.length).toBeGreaterThanOrEqual(24);
    expect(new Set(values).size).toBe(values.length);
  });

  it('recognizes every seeded category icon', () => {
    for (const seed of DEFAULT_CATEGORY_SEEDS) {
      expect(normalizeCategoryIcon(seed.icon)).toBe(seed.icon);
    }
  });

  it('uses a distinct icon for every food subcategory instead of repeating the parent icon', () => {
    const root = DEFAULT_CATEGORY_SEEDS.find((category) => category.id === 'expense-food');
    const children = DEFAULT_CATEGORY_SEEDS.filter(
      (category) => category.parentId === 'expense-food',
    );

    expect(root).toBeDefined();
    expect(children).toHaveLength(7);
    expect(new Set(children.map((category) => category.icon)).size).toBe(children.length);
    expect(children.every((category) => category.icon !== root?.icon)).toBe(true);
  });

  it('prefers the explicit icon for a custom category', () => {
    expect(
      resolveCategoryIcon({
        explicitIcon: 'coffee',
        parentIcon: 'food',
      }),
    ).toBe('coffee');
  });

  it('inherits a valid parent icon when no custom icon is selected', () => {
    expect(
      resolveCategoryIcon({
        explicitIcon: undefined,
        parentIcon: 'transport',
      }),
    ).toBe('transport');
  });

  it('falls back to the generic icon for unknown values', () => {
    expect(normalizeCategoryIcon('not-a-real-icon')).toBe('other');
  });
});
