import { describe, expect, it } from 'vitest';

import { shouldAutoOpenAmountKeypad } from './entryInteraction';

describe('shouldAutoOpenAmountKeypad', () => {
  it('opens the amount keypad for a new transaction', () => {
    expect(shouldAutoOpenAmountKeypad(null)).toBe(true);
  });

  it('keeps the keypad closed when editing an existing transaction', () => {
    expect(shouldAutoOpenAmountKeypad('transaction-id')).toBe(false);
  });
});
