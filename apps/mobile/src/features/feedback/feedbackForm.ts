import type {
  FeedbackSubmission,
  FeedbackType,
} from '@shengzhang/contracts';

type FeedbackDiagnostics = NonNullable<FeedbackSubmission['diagnostics']>;

type ValidationInput = {
  type: FeedbackType | null;
  message: string;
  contact: string;
};

export const FEEDBACK_DESCRIPTION_PLACEHOLDER =
  '例如：语音说“昨天午饭 25”，但账单日期显示成了今天。';

export class FeedbackRequestError extends Error {
  override name = 'FeedbackRequestError';
}

export type FeedbackValidationResult =
  | { ok: true; message: string; contact: string | null }
  | { ok: false; error: string };

export function feedbackFailureMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return '发送超时了，请检查网络后重试。';
  }
  if (error instanceof FeedbackRequestError) return error.message;
  if (
    error instanceof Error &&
    /network request failed|failed to fetch|fetch failed|network error/i.test(error.message)
  ) {
    return '网络连接不可用，请检查网络后重试。';
  }
  return '反馈暂时没有发送成功，请稍后重试。';
}

export function validateFeedbackInput(input: ValidationInput): FeedbackValidationResult {
  const message = input.message.trim();
  const contact = input.contact.trim();
  if (!input.type) return { ok: false, error: '请选择反馈类型' };
  if (message.length < 10) {
    return { ok: false, error: '请至少写 10 个字，帮助我理解你的想法' };
  }
  if (message.length > 1000) {
    return { ok: false, error: '反馈内容不能超过 1000 个字' };
  }
  if (contact.length > 200) {
    return { ok: false, error: '联系方式不能超过 200 个字' };
  }
  return { ok: true, message, contact: contact || null };
}

export function buildFeedbackSubmission(input: {
  clientFeedbackId: string;
  installationId: string;
  type: FeedbackType;
  message: string;
  contact: string;
  diagnosticsEnabled: boolean;
  diagnostics: FeedbackDiagnostics;
}): FeedbackSubmission {
  return {
    clientFeedbackId: input.clientFeedbackId,
    installationId: input.installationId,
    type: input.type,
    message: input.message.trim(),
    contact: input.contact.trim() || null,
    ...(input.diagnosticsEnabled ? { diagnostics: input.diagnostics } : {}),
  };
}
