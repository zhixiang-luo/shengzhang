import { describe, expect, it } from 'vitest';

import {
  classifyTemporalExpression,
  hasExplicitTemporalExpression,
  normalizeVoiceOccurredAt,
} from './voiceTime.js';

describe('voice time expression', () => {
  it('detects dates and time-of-day expressions', () => {
    expect(hasExplicitTemporalExpression('今天收到工资200')).toBe(true);
    expect(hasExplicitTemporalExpression('昨天中午吃饭25')).toBe(true);
    expect(hasExplicitTemporalExpression('周五打车18')).toBe(true);
    expect(hasExplicitTemporalExpression('10月5号买咖啡')).toBe(true);
    expect(hasExplicitTemporalExpression('下午三点三十开会')).toBe(true);
  });

  it('does not invent time when the transcript has none', () => {
    expect(hasExplicitTemporalExpression('收到工资200')).toBe(false);
    expect(hasExplicitTemporalExpression('午饭25，打车18')).toBe(false);
    expect(hasExplicitTemporalExpression('买了一点水果')).toBe(false);
  });

  it('uses current time when no temporal expression exists', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '收到工资200',
        occurredAt: '2026-01-01T12:00:00+08:00',
        nowIso: '2026-10-20T13:45:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-10-20T13:45:30.000Z');
  });

  it('keeps an explicit date but replaces an invented clock time', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨天收到工资200',
        occurredAt: '2026-10-19T04:00:00.000Z',
        nowIso: '2026-10-20T13:45:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-10-19T13:45:30.000Z');
  });

  it('preserves an explicit time expression', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨天中午收到工资200',
        occurredAt: '2026-10-19T04:00:00.000Z',
        nowIso: '2026-10-20T13:45:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-10-19T04:00:00.000Z');
    expect(classifyTemporalExpression('昨天中午收到工资200')).toEqual({
      hasDate: true,
      hasTime: true,
    });
  });
});
