import { describe, expect, it } from 'vitest';

import {
  buildFeedbackSubmission,
  validateFeedbackInput,
} from './feedbackForm';

const diagnostics = {
  appVersion: '0.2.1',
  platform: 'android' as const,
  osVersion: '15',
  locale: 'zh-CN',
  currentRoute: 'feedback',
  errorCode: null,
  requestId: null,
};

describe('feedback form', () => {
  it('requires a type and a trimmed description of at least ten characters', () => {
    expect(
      validateFeedbackInput({ type: null, message: '希望增加更多分类', contact: '' }),
    ).toMatchObject({ ok: false, error: '请选择反馈类型' });
    expect(
      validateFeedbackInput({ type: 'feature', message: '一二三四五六七八九', contact: '' }),
    ).toMatchObject({ ok: false, error: '请至少写 10 个字，帮助我理解你的想法' });
    expect(
      validateFeedbackInput({ type: 'feature', message: '一二三四五六七八九十', contact: '' }),
    ).toEqual({
      ok: true,
      message: '一二三四五六七八九十',
      contact: null,
    });
  });

  it('keeps contact optional and omits diagnostics when the user turns them off', () => {
    const withoutDiagnostics = buildFeedbackSubmission({
      clientFeedbackId: '6fd41cf0-83d7-4d5b-a6ab-d9c87322ed14',
      installationId: 'anonymous-installation-id',
      type: 'voice',
      message: '语音完成后时间显示不对',
      contact: '',
      diagnosticsEnabled: false,
      diagnostics,
    });
    expect(withoutDiagnostics.contact).toBeNull();
    expect(withoutDiagnostics.diagnostics).toBeUndefined();

    const withContact = buildFeedbackSubmission({
      clientFeedbackId: '6fd41cf0-83d7-4d5b-a6ab-d9c87322ed14',
      installationId: 'anonymous-installation-id',
      type: 'voice',
      message: '语音完成后时间显示不对',
      contact: ' reader@example.com ',
      diagnosticsEnabled: true,
      diagnostics,
    });
    expect(withContact.contact).toBe('reader@example.com');
    expect(withContact.diagnostics).toEqual(diagnostics);
  });

  it('rejects descriptions longer than one thousand characters', () => {
    expect(
      validateFeedbackInput({
        type: 'usage',
        message: '好'.repeat(1001),
        contact: '',
      }),
    ).toMatchObject({
      ok: false,
      error: '反馈内容不能超过 1000 个字',
    });
  });
});
