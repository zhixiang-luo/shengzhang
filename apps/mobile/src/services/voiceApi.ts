import { voiceParseResponseSchema, type VoiceParseResponse } from '@shengzhang/contracts';

import type { CategoryRow } from '../db/categoryRepository';
import { API_BASE_URL } from '../config/env';
import { getInstallationId } from './installationId';

export async function parseVoiceAudio(
  audioUri: string,
  categories: CategoryRow[],
): Promise<VoiceParseResponse> {
  const activeCategories = categories.filter((category) => !category.isArchived);
  const categoryTree = activeCategories
    .filter((category) => category.parentId === null)
    .map((root) => ({
      name: root.name,
      type: root.type,
      children: activeCategories
        .filter((category) => category.parentId === root.id)
        .map((category) => category.name),
    }));
  const formData = new FormData();
  formData.append(
    'audio',
    {
      uri: audioUri,
      name: 'voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob,
  );
  formData.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai');
  formData.append('locale', 'zh-CN');
  formData.append(
    'categoryTree',
    JSON.stringify(categoryTree),
  );
  formData.append('installationId', await getInstallationId());

  const response = await fetch(`${API_BASE_URL}/v1/voice/parse`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = payload as { error?: { message?: string } };
    throw new Error(error.error?.message || '语音识别失败');
  }

  return voiceParseResponseSchema.parse(payload);
}
