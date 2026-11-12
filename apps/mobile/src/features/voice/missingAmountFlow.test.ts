import type { ResolvedVoiceDraftEntry } from '@shengzhang/domain';
import { describe, expect, it } from 'vitest';

import {
  abandonMissingAmounts,
  confirmMissingAmounts,
  INITIAL_MISSING_AMOUNT_FLOW,
  settleMissingAmounts,
  type PendingBatchLike,
} from './missingAmountFlow';

function draft(note: string, amountMinor: number | null): ResolvedVoiceDraftEntry {
  return {
    type: 'expense',
    amountMinor,
    categoryId: 'food',
    subcategoryId: null,
    occurredAt: '2026-11-11T02:00:00.000Z',
    note,
    categoryName: '餐饮',
    subcategoryName: null,
  };
}

function batch(): PendingBatchLike {
  return {
    requestId: 'request-1',
    transcript: '早饭花了12，打车花了30，然后还买了一本经济相关的书。',
    entries: [draft('早饭', 1200), draft('打车', 3000), draft('买书', null)],
  };
}

describe('missing amount decision flow', () => {
  it('starts out editing and hands nothing to the result card', () => {
    expect(INITIAL_MISSING_AMOUNT_FLOW).toEqual({ status: 'editing' });
    expect(settleMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW)).toBeNull();
  });

  it('confirms the whole batch once the missing amount is filled', () => {
    const state = confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, batch(), { 2: 4500 });

    expect(state.status).toBe('confirmed');
    expect(settleMissingAmounts(state)).toEqual({
      requestId: 'request-1',
      transcript: '早饭花了12，打车花了30，然后还买了一本经济相关的书。',
      entries: [
        expect.objectContaining({ note: '早饭', amountMinor: 1200 }),
        expect.objectContaining({ note: '打车', amountMinor: 3000 }),
        expect.objectContaining({ note: '买书', amountMinor: 4500 }),
      ],
    });
  });

  it('ignores a confirm while an amount is still missing, and says so by identity', () => {
    const state = confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, batch(), {});
    expect(state).toBe(INITIAL_MISSING_AMOUNT_FLOW);
    expect(confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, batch(), { 2: null })).toBe(
      INITIAL_MISSING_AMOUNT_FLOW,
    );
  });

  it('abandons a batch and hands nothing to the result card', () => {
    const state = abandonMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW);
    expect(state).toEqual({ status: 'abandoned' });
    expect(settleMissingAmounts(state)).toBeNull();
  });

  it('cannot be flipped into a save after it was abandoned', () => {
    const abandoned = abandonMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW);
    const afterConfirm = confirmMissingAmounts(abandoned, batch(), { 2: 4500 });

    expect(afterConfirm).toBe(abandoned);
    expect(settleMissingAmounts(afterConfirm)).toBeNull();
  });

  it('cannot be dropped by an abandon after it was confirmed', () => {
    const confirmed = confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, batch(), { 2: 4500 });
    const afterAbandon = abandonMissingAmounts(confirmed);

    expect(afterAbandon).toBe(confirmed);
    expect(settleMissingAmounts(afterAbandon)?.entries).toHaveLength(3);
  });

  it('keeps the first confirmed amounts when confirm is tapped again with other values', () => {
    const first = confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, batch(), { 2: 4500 });
    const second = confirmMissingAmounts(first, batch(), { 2: 99900 });

    expect(second).toBe(first);
    expect(settleMissingAmounts(second)?.entries[2]?.amountMinor).toBe(4500);
  });

  it('keeps abandon idempotent', () => {
    const first = abandonMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW);
    expect(abandonMissingAmounts(first)).toBe(first);
  });

  it('snapshots the batch it confirmed, so a later change to the pending batch cannot leak in', () => {
    const pending = batch();
    const confirmed = confirmMissingAmounts(INITIAL_MISSING_AMOUNT_FLOW, pending, { 2: 4500 });

    pending.entries = [draft('别的', 100)];
    pending.requestId = 'request-2';

    expect(settleMissingAmounts(confirmed)).toMatchObject({
      requestId: 'request-1',
      entries: [
        expect.objectContaining({ note: '早饭' }),
        expect.objectContaining({ note: '打车' }),
        expect.objectContaining({ note: '买书' }),
      ],
    });
  });
});
