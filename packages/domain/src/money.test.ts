import { describe, expect, it } from 'vitest';

import { formatCents, parseYuanToCents } from './money';

describe('money', () => {
  it('parses yuan into integer cents', () => {
    expect(parseYuanToCents('25')).toBe(2500);
    expect(parseYuanToCents('25.5')).toBe(2550);
    expect(parseYuanToCents('0.01')).toBe(1);
  });

  it('rejects malformed and unsafe amounts', () => {
    expect(parseYuanToCents('1.234')).toBeNull();
    expect(parseYuanToCents('-1')).toBeNull();
    expect(parseYuanToCents('abc')).toBeNull();
  });

  it('formats cents without floating point arithmetic', () => {
    expect(formatCents(2500)).toBe('25.00');
    expect(formatCents(2550)).toBe('25.50');
    expect(formatCents(1)).toBe('0.01');
  });
});
