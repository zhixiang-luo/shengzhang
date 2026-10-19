import { voiceParseResponseSchema, type VoiceParseResponse } from '@shengzhang/contracts';

import type { CategoryRow } from '../db/categoryRepository';
import { API_BASE_URL } from '../config/env';

export async function parseVoiceAudio(
  audioUri: string,
  categories: CategoryRow[],
): Promise<VoiceParseResponse> {
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
    JSON.stringify(
      categories
        .filter((category) => !category.isArchived)
        .map((category) => ({
          name: category.name,
          type: category.type,
          parentId: category.parentId,
        })),
    ),
  );
  formData.append('installationId', 'local-device');

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
