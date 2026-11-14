import { z } from 'zod';

export const screenBillCategorySchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(40),
  type: z.enum(['expense', 'income']),
}).strict();

export const screenBillRequestSchema = z.object({
  captureId: z.string().min(1).max(100),
  installationId: z.string().min(16).max(200),
  consent: z.literal(true),
  capturedAt: z.iso.datetime({ offset: true }),
  timezone: z.string().max(80).refine((value) => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }),
  categories: z.array(screenBillCategorySchema).max(160),
  image: z.object({
    mimeType: z.enum(['image/jpeg', 'image/png']),
    base64: z.string().min(4).max(2_800_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  }).strict(),
}).strict();

export const visionBillSchema = z.object({
  amountMinor: z.number().int().positive().max(99_999_999).nullable(),
  type: z.enum(['expense', 'income']),
  merchant: z.string().max(40).nullable(),
  item: z.string().max(40).nullable(),
  occurredAt: z.iso.datetime({ offset: true }).nullable(),
  categoryId: z.string().max(100).nullable(),
  amountEvidence: z.string().max(160).nullable(),
  amountIssue: z.enum(['not_read', 'unverified']).nullable().optional(),
  blockingReason: z.string().max(120).nullable(),
}).strict();

export const screenBillResponseSchema = z.object({
  captureId: z.string().min(1).max(100),
  bill: visionBillSchema,
  latencyMs: z.number().int().nonnegative(),
}).strict();

export type ScreenBillRequest = z.infer<typeof screenBillRequestSchema>;
export type VisionBill = z.infer<typeof visionBillSchema>;
export type ScreenBillResponse = z.infer<typeof screenBillResponseSchema>;
