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

  it('uses the spoken relative date when the model returns the current date', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨天买了个杯子25',
        occurredAt: '2026-11-07T02:15:30.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-06T02:15:30.000Z');
  });

  it('anchors the reported “昨天午饭 25” case to yesterday', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨天午饭 25',
        occurredAt: '2026-11-07T02:15:30.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-06T02:15:30.000Z');
  });

  it('uses the day before yesterday when the model returns the current date', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '前天和朋友吃饭120',
        occurredAt: '2026-11-07T02:15:30.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-05T02:15:30.000Z');
  });

  it('keeps the previous date for last night while preserving the spoken clock time', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨晚买了个杯子25',
        occurredAt: '2026-11-07T12:30:00.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-06T12:30:00.000Z');
  });

  it('uses today when the model returns a stale date for an explicit today', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '今天买了个杯子25',
        occurredAt: '2026-11-06T02:15:30.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-07T02:15:30.000Z');
  });

  it('keeps each model date in a batch that explicitly contains different days', () => {
    const input = {
      transcript: '昨天午饭25，今天打车18',
      nowIso: '2026-11-07T02:15:30.000Z',
      timezone: 'Asia/Shanghai',
    } as const;

    expect(
      normalizeVoiceOccurredAt({
        ...input,
        occurredAt: '2026-11-06T04:00:00.000Z',
      }),
    ).toBe('2026-11-06T02:15:30.000Z');
    expect(
      normalizeVoiceOccurredAt({
        ...input,
        occurredAt: '2026-11-07T04:00:00.000Z',
      }),
    ).toBe('2026-11-07T02:15:30.000Z');
  });

  it.each([
    ['昨天上午', '2026-11-06T02:00:00.000Z'],
    ['昨天中午', '2026-11-06T04:00:00.000Z'],
    ['昨天下午', '2026-11-06T07:00:00.000Z'],
    ['前天上午', '2026-11-05T02:00:00.000Z'],
    ['前天中午', '2026-11-05T04:00:00.000Z'],
    ['前天下午', '2026-11-05T07:00:00.000Z'],
  ])('maps %s to its deterministic representative time', (transcript, expected) => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: `${transcript}买了个杯子25`,
        occurredAt: '2026-11-07T05:45:00.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe(expected);
  });

  it('prefers an exact clock time over the broad period representative time', () => {
    expect(
      normalizeVoiceOccurredAt({
        transcript: '昨天下午四点半买了个杯子25',
        occurredAt: '2026-11-06T08:30:00.000Z',
        nowIso: '2026-11-07T02:15:30.000Z',
        timezone: 'Asia/Shanghai',
      }),
    ).toBe('2026-11-06T08:30:00.000Z');
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
