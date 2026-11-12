import { describe, expect, it } from 'vitest';

import {
  completeVoiceDraft,
  describeMissingAmounts,
  type ResolvedVoiceDraftEntry,
} from './voice-draft';

function entry(
  note: string,
  amountMinor: number | null,
  overrides: Partial<ResolvedVoiceDraftEntry> = {},
): ResolvedVoiceDraftEntry {
  return {
    type: 'expense',
    amountMinor,
    categoryId: 'food',
    subcategoryId: null,
    occurredAt: '2026-11-11T02:00:00.000Z',
    note,
    categoryName: '餐饮',
    subcategoryName: null,
    ...overrides,
  };
}

describe('describeMissingAmounts', () => {
  it('reports nothing missing when every entry has an amount', () => {
    expect(describeMissingAmounts([entry('早饭', 1200), entry('打车', 3000)])).toEqual({
      indexes: [],
      count: 0,
      hasMissing: false,
    });
  });

  it('finds the last entry when only it has no amount', () => {
    expect(
      describeMissingAmounts([entry('早饭', 1200), entry('打车', 3000), entry('买书', null)]),
    ).toEqual({ indexes: [2], count: 1, hasMissing: true });
  });

  it('finds every missing entry in spoken order', () => {
    expect(
      describeMissingAmounts([entry('买书', null), entry('打车', 3000), entry('咖啡', null)]),
    ).toEqual({ indexes: [0, 2], count: 2, hasMissing: true });
  });
});

describe('completeVoiceDraft', () => {
  const draft = [entry('早饭', 1200), entry('打车', 3000), entry('买书', null)];

  it('keeps the spoken amounts and adds the one the user typed', () => {
    const result = completeVoiceDraft(draft, { 2: 4500 });
    expect(result).toEqual({
      ok: true,
      entries: [
        expect.objectContaining({ note: '早饭', amountMinor: 1200 }),
        expect.objectContaining({ note: '打车', amountMinor: 3000 }),
        expect.objectContaining({ note: '买书', amountMinor: 4500 }),
      ],
    });
  });

  it('preserves category, time and order of every entry', () => {
    const result = completeVoiceDraft(
      [entry('买书', null, { categoryId: 'edu', occurredAt: '2026-11-10T01:00:00.000Z' }), entry('早饭', 1200)],
      { 0: 8000 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries.map((item) => item.note)).toEqual(['买书', '早饭']);
    expect(result.entries[0]).toMatchObject({
      categoryId: 'edu',
      occurredAt: '2026-11-10T01:00:00.000Z',
      amountMinor: 8000,
    });
  });

  it('does not mutate the draft it was given', () => {
    const snapshot = JSON.parse(JSON.stringify(draft));
    completeVoiceDraft(draft, { 2: 4500 });
    expect(draft).toEqual(snapshot);
  });

  it('refuses to save while an amount is still empty and says which one', () => {
    expect(completeVoiceDraft(draft, {})).toEqual({ ok: false, reason: 'missing', index: 2 });
    expect(completeVoiceDraft(draft, { 2: null })).toEqual({
      ok: false,
      reason: 'missing',
      index: 2,
    });
  });

  it('reports the first blocking entry when several are missing', () => {
    const many = [entry('买书', null), entry('打车', 3000), entry('咖啡', null)];
    expect(completeVoiceDraft(many, { 2: 1600 })).toEqual({
      ok: false,
      reason: 'missing',
      index: 0,
    });
  });

  it('rejects zero, negative, fractional and unsafe amounts', () => {
    for (const bad of [0, -100, 12.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expect(completeVoiceDraft(draft, { 2: bad })).toEqual({
        ok: false,
        reason: 'invalid',
        index: 2,
      });
    }
  });

  it('ignores a typed value for an entry that already has an amount', () => {
    const result = completeVoiceDraft(draft, { 0: 99999, 2: 4500 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[0]?.amountMinor).toBe(1200);
  });

  it('succeeds without any input when nothing was missing', () => {
    const result = completeVoiceDraft([entry('早饭', 1200), entry('打车', 3000)], {});
    expect(result.ok).toBe(true);
  });
});
