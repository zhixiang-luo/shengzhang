import { describe, expect, it } from 'vitest';

import type { StoredFeedback } from './feedback-store.js';
import { formatFeedbackSummary } from './feedback-summary.js';

function record(referenceCode: string, type: StoredFeedback['type']): StoredFeedback {
  return {
    schemaVersion: 1,
    feedbackId: referenceCode,
    referenceCode,
    type,
    message: '这是一段不应出现在日报里的反馈正文',
    contact: 'reader@example.com',
    diagnostics: null,
    installationHash: 'a'.repeat(64),
    receivedAt: '2026-11-07T02:00:00.000Z',
  };
}

describe('feedback summary', () => {
  it('prints counts only and never includes private feedback content', () => {
    const summary = formatFeedbackSummary(
      [
        record('FB-20261107-AAAAAA', 'feature'),
        record('FB-20261107-BBBBBB', 'voice'),
        record('FB-20261107-CCCCCC', 'voice'),
      ],
      { date: '2026-11-07', directory: '.feedback' },
    );

    expect(summary).toContain('总数 3');
    expect(summary).toContain('语音 2');
    expect(summary).toContain('功能建议 1');
    expect(summary).not.toContain('不应出现在日报');
    expect(summary).not.toContain('reader@example.com');
    expect(summary).not.toContain('a'.repeat(64));
  });
});
