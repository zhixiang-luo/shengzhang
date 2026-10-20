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

export type VoiceEntryPayload = z.infer<typeof voiceEntrySchema>;
export type VoiceParseResponse = z.infer<typeof voiceParseResponseSchema>;
export type VoiceTranscribeResponse = z.infer<typeof voiceTranscribeResponseSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
