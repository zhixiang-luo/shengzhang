export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'voice' | 'manual';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isPreset: boolean;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: 'CNY';
  categoryId: string;
  subcategoryId: string | null;
  occurredAt: string;
  note: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceEntryDraft {
  type?: TransactionType;
  amountMinor?: number;
  categoryPath?: [string] | [string, string];
  occurredAt?: string;
  note?: string;
}

export interface VoiceParseResult {
  requestId: string;
  transcript: string;
  entries: VoiceEntryDraft[];
  unresolvedFields: string[];
  latencyMs: number;
}
