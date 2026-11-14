import type { AppUpdatePolicyConfig } from '@shengzhang/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { compareAppVersions } from '../app-update-version.js';

const querySchema = z.object({
  platform: z.enum(['android', 'ios']),
  currentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const appUpdateRoutes: FastifyPluginAsync<{
  policy: AppUpdatePolicyConfig;
}> = async (app, options) => {
  app.get('/v1/app/update-policy', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_APP_UPDATE_REQUEST',
          message: '更新检查参数不正确。',
        },
      });
    }

    const { platform, currentVersion } = parsed.data;
    const platformPolicy = options.policy[platform];
    const belowMinimum =
      compareAppVersions(currentVersion, platformPolicy.minimumSupportedVersion) < 0;
    const belowLatest =
      compareAppVersions(currentVersion, platformPolicy.latestVersion) < 0;
    const updateType = !platformPolicy.downloadUrl
      ? 'none'
      : belowMinimum
        ? 'required'
        : belowLatest
          ? 'optional'
          : 'none';

    const title =
      updateType === 'required'
        ? '需要更新声账'
        : updateType === 'optional'
          ? '有新版本可选'
          : '当前版本可用';
    const message =
      updateType === 'required'
        ? '当前版本已停止支持，请安装最新版本后继续使用。本地账本不会丢失。'
        : updateType === 'optional'
          ? '安装最新版本可使用新功能。覆盖安装会保留本地账本。'
          : '当前安装包为首版支持的最新版本。';

    return {
      platform,
      currentVersion,
      latestVersion: platformPolicy.latestVersion,
      minimumSupportedVersion: platformPolicy.minimumSupportedVersion,
      updateType,
      downloadUrl: platformPolicy.downloadUrl,
      releaseNotes: platformPolicy.releaseNotes ?? [],
      requiresReinstall:
        platformPolicy.requiresReinstall ?? Boolean(platformPolicy.downloadUrl),
      title,
      message,
    };
  });
};
