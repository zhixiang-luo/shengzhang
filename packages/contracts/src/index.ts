import { z } from 'zod';

export const transactionTypeSchema = z.enum(['expense', 'income']);
export const transactionSourceSchema = z.enum(['voice', 'manual']);

export const categoryPathSchema = z
  .tuple([z.string().min(1).max(12)])
  .or(z.tuple([z.string().min(1).max(12), z.string().min(1).max(12)]));

export const voiceEntrySchema = z.object({
  type: transactionTypeSchema.optional(),
  amountMinor: z.number().int().positive().optional(),
  categoryPath: categoryPathSchema.optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  note: z.string().max(40).optional(),
});

export const voiceParseResponseSchema = z.object({
  requestId: z.uuid(),
  transcript: z.string().min(1).max(2000),
  entries: z.array(voiceEntrySchema).min(1).max(5),
  unresolvedFields: z.array(z.string()),
  latencyMs: z.number().int().nonnegative(),
});

export const voiceTranscribeResponseSchema = z.object({
  transcript: z.string().min(1).max(2000),
  latencyMs: z.number().int().nonnegative(),
});

export const backupMetadataSchema = z.object({
  id: z.uuid(),
  schemaVersion: z.number().int().positive(),
  deviceId: z.string().min(1),
  updatedAt: z.iso.datetime({ offset: true }),
  sizeBytes: z.number().int().nonnegative(),
  transactionCount: z.number().int().nonnegative(),
  checksum: z.string().min(1),
});

export const appUpdatePlatformSchema = z.enum(['android', 'ios']);
export const appUpdateTypeSchema = z.enum(['none', 'optional', 'required']);

export const appUpdatePolicyConfigSchema = z.object({
  android: z.object({
    latestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    minimumSupportedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    downloadUrl: z.url().nullable(),
  }),
  ios: z.object({
    latestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    minimumSupportedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    downloadUrl: z.url().nullable(),
  }),
});

export const appUpdatePolicyResponseSchema = z.object({
  platform: appUpdatePlatformSchema,
  currentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  latestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  minimumSupportedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  updateType: appUpdateTypeSchema,
  downloadUrl: z.url().nullable(),
  title: z.string().min(1).max(80),
  message: z.string().min(1).max(240),
});

export type VoiceEntryPayload = z.infer<typeof voiceEntrySchema>;
export type VoiceParseResponse = z.infer<typeof voiceParseResponseSchema>;
export type VoiceTranscribeResponse = z.infer<typeof voiceTranscribeResponseSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
export type AppUpdatePlatform = z.infer<typeof appUpdatePlatformSchema>;
export type AppUpdateType = z.infer<typeof appUpdateTypeSchema>;
export type AppUpdatePolicyConfig = z.infer<typeof appUpdatePolicyConfigSchema>;
export type AppUpdatePolicyResponse = z.infer<typeof appUpdatePolicyResponseSchema>;
