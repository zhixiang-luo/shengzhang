import {
  voiceParseResponseSchema,
  type VoiceParseResponse,
} from '@shengzhang/contracts';
import { fetch } from 'expo/fetch';

import type { CategoryRow } from '../db/categoryRepository';
import { API_BASE_URL } from '../config/env';
import { getInstallationId } from './installationId';

export async function getVoiceStreamUrl(): Promise<string> {
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  return `${baseUrl}/v1/voice/stream?installationId=${encodeURIComponent(
    await getInstallationId(),
  )}`;
}

function buildCategoryTree(categories: CategoryRow[]) {
  const activeCategories = categories.filter((category) => !category.isArchived);
  return activeCategories
    .filter((category) => category.parentId === null)
    .map((root) => ({
      name: root.name,
      type: root.type,
      children: activeCategories
        .filter((category) => category.parentId === root.id)
        .map((category) => category.name),
    }));
}

export async function parseVoiceTranscript(
  transcript: string,
  categories: CategoryRow[],
): Promise<VoiceParseResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/voice/parse-transcript`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      installationId: await getInstallationId(),
      transcript,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      categories: buildCategoryTree(categories),
    }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = payload as { error?: { message?: string } };
    throw new Error(error.error?.message || '账单整理失败');
  }
  return voiceParseResponseSchema.parse(payload);
}
