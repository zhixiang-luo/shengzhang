import type { VoiceParseResponse } from '@shengzhang/contracts';
import { describe, expect, it } from 'vitest';

import type { CategoryRow } from '../../db/categoryRepository';
import { resolveVoiceDraftEntries } from './voiceMapping';

const categories: CategoryRow[] = [
  {
    id: 'food',
    name: '餐饮',
    type: 'expense',
    icon: 'meal',
    color: '#C98376',
    parentId: null,
    sortOrder: 0,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'lunch',
    name: '午餐',
    type: 'expense',
    icon: 'lunch',
    color: '#C98376',
    parentId: 'food',
    sortOrder: 0,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'other',
    name: '其他',
    type: 'expense',
    icon: 'other',
    color: '#A39A91',
    parentId: null,
    sortOrder: 9,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

function response(entries: VoiceParseResponse['entries'], transcript = '测试'): VoiceParseResponse {
  return {
    requestId: 'request-1',
    transcript,
    entries,
    unresolvedFields: [],
    latencyMs: 800,
  };
}

describe('resolveVoiceDraftEntries', () => {
  it('keeps the server-anchored previous-day timestamp unchanged', () => {
    const drafts = resolveVoiceDraftEntries(
      response(
        [
          {
            type: 'expense',
            amountMinor: 2500,
            categoryPath: ['餐饮', '午餐'],
            occurredAt: '2026-11-06T14:11:10.000Z',
            note: '昨天午饭',
          },
        ],
        '昨天午饭 25',
      ),
      categories,
    );

    expect(drafts[0]?.occurredAt).toBe('2026-11-06T14:11:10.000Z');
  });

  it('returns every entry when the last one has no amount, instead of failing the batch', () => {
    const drafts = resolveVoiceDraftEntries(
      response([
        { type: 'expense', amountMinor: 1200, categoryPath: ['餐饮'], note: '早饭' },
        { type: 'expense', amountMinor: 3000, categoryPath: ['其他'], note: '打车' },
        { type: 'expense', note: '买书' },
      ]),
      categories,
    );

    expect(drafts.map((draft) => draft.amountMinor)).toEqual([1200, 3000, null]);
    expect(drafts.map((draft) => draft.note)).toEqual(['早饭', '打车', '买书']);
  });

  it('keeps the spoken order when the missing amount is not the last one', () => {
    const drafts = resolveVoiceDraftEntries(
      response([
        { type: 'expense', note: '买书' },
        { type: 'expense', amountMinor: 1200, categoryPath: ['餐饮'], note: '早饭' },
      ]),
      categories,
    );

    expect(drafts.map((draft) => draft.amountMinor)).toEqual([null, 1200]);
  });

  it('still resolves category and time for the entry with no amount, without guessing one', () => {
    const [draft] = resolveVoiceDraftEntries(
      response([
        {
          type: 'expense',
          categoryPath: ['餐饮', '午餐'],
          occurredAt: '2026-11-10T04:00:00.000Z',
          note: '午饭',
        },
      ]),
      categories,
    );

    expect(draft).toEqual({
      type: 'expense',
      amountMinor: null,
      categoryId: 'food',
      subcategoryId: 'lunch',
      occurredAt: '2026-11-10T04:00:00.000Z',
      note: '午饭',
      categoryName: '餐饮',
      subcategoryName: '午餐',
    });
  });

  it('falls back to the catch-all category when the spoken one does not exist', () => {
    const [draft] = resolveVoiceDraftEntries(
      response([{ type: 'expense', amountMinor: 4500, categoryPath: ['不存在'], note: '买书' }]),
      categories,
    );

    expect(draft).toMatchObject({ categoryId: 'other', categoryName: '其他', amountMinor: 4500 });
  });
});
