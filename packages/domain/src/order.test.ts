import { describe, expect, it } from 'vitest';

import { moveItem } from './order';

describe('moveItem', () => {
  it('moves an item later within the list', () => {
    expect(moveItem(['food', 'transport', 'shopping', 'home'], 0, 2)).toEqual([
      'transport',
      'shopping',
      'food',
      'home',
    ]);
  });

  it('moves an item earlier within the list', () => {
    expect(moveItem(['food', 'transport', 'shopping', 'home'], 3, 1)).toEqual([
      'food',
      'home',
      'transport',
      'shopping',
    ]);
  });

  it('keeps the list unchanged when the item stays in place', () => {
    expect(moveItem(['food', 'transport'], 1, 1)).toEqual(['food', 'transport']);
  });

  it('rejects indexes outside the list', () => {
    expect(() => moveItem(['food'], 0, 1)).toThrow(RangeError);
  });
});
