import type { VoiceParseResponse } from '@shengzhang/contracts';
import { describe, expect, it } from 'vitest';

import type { CategoryRow } from '../../db/categoryRepository';
import { resolveVoiceEntries } from './voiceMapping';

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
];

describe('resolveVoiceEntries', () => {
  it('keeps the server-anchored previous-day timestamp unchanged', () => {
    const response: VoiceParseResponse = {
      requestId: 'request-1',
      transcript: '昨天午饭 25',
      entries: [
        {
          type: 'expense',
          amountMinor: 2500,
          categoryPath: ['餐饮', '午餐'],
          occurredAt: '2026-11-06T14:11:10.000Z',
          note: '昨天午饭',
        },
      ],
      unresolvedFields: [],
      latencyMs: 800,
    };

    expect(resolveVoiceEntries(response, categories)[0]?.occurredAt).toBe(
      '2026-11-06T14:11:10.000Z',
    );
  });
});
