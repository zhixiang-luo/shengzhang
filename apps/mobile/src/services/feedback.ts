import type {
  FeedbackSubmissionResponse,
  FeedbackType,
} from '@shengzhang/contracts';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import { fetch } from 'expo/fetch';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../config/env';
import {
  buildFeedbackSubmission,
  FeedbackRequestError,
  validateFeedbackInput,
} from '../features/feedback/feedbackForm';
import { getInstallationId } from './installationId';

export type FeedbackSubmitInput = {
  type: FeedbackType;
  message: string;
  contact: string;
  diagnosticsEnabled: boolean;
};

export function createFeedbackRequestId(): string {
  return randomUUID();
}

export async function submitFeedback(
  input: FeedbackSubmitInput,
  clientFeedbackId: string,
): Promise<FeedbackSubmissionResponse> {
  const validation = validateFeedbackInput(input);
  if (!validation.ok) throw new Error(validation.error);
  const locale = getLocales()[0];

  const payload = buildFeedbackSubmission({
    clientFeedbackId,
    installationId: await getInstallationId(),
    type: input.type,
    message: validation.message,
    contact: validation.contact ?? '',
    diagnosticsEnabled: input.diagnosticsEnabled,
    diagnostics: {
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      osVersion: String(Platform.Version),
      locale: locale?.languageTag ?? 'zh-CN',
      currentRoute: 'feedback',
    },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${API_BASE_URL}/v1/feedback`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as
      | FeedbackSubmissionResponse
      | { error?: { message?: string } };
    if (!response.ok) {
      throw new FeedbackRequestError(
        'error' in body && body.error?.message
          ? body.error.message
          : '反馈暂时没有发送成功，请稍后重试。',
      );
    }
    return body as FeedbackSubmissionResponse;
  } finally {
    clearTimeout(timeout);
  }
}
