import type { VisionBill } from '@shengzhang/contracts';
import type { ScreenBillExtraction, TransactionType } from '@shengzhang/domain';

export interface ScreenBillDraft {
  amount: string;
  type: TransactionType;
  note: string;
  occurredAt: string;
  categoryId: string | null;
  subcategoryId: string | null;
}
export type ScreenBillEdits = Partial<Record<keyof ScreenBillDraft, boolean>>;

export function mergeScreenBillDraft(current: ScreenBillDraft, extraction: ScreenBillExtraction, edited: ScreenBillEdits, recommendedCategoryId: string | null): ScreenBillDraft {
  return {
    amount: edited.amount ? current.amount : extraction.amountMinor === null ? '' : (extraction.amountMinor / 100).toFixed(2),
    type: edited.type || edited.categoryId ? current.type : extraction.type,
    note: edited.note ? current.note : extraction.note,
    occurredAt: edited.occurredAt ? current.occurredAt : extraction.occurredAt,
    categoryId: edited.categoryId ? current.categoryId : recommendedCategoryId,
    subcategoryId: edited.categoryId ? current.subcategoryId : null,
  };
}

export function mergeVisionExtraction(local: ScreenBillExtraction, bill: VisionBill): ScreenBillExtraction {
  // Cloud is the recognition source. The initial draft contributes only its
  // capture-time anchor; obsolete local guesses must not veto or fill a result.
  const blocked = bill.blockingReason;
  const amountMinor = blocked ? null : bill.amountMinor;
  return {
    type: bill.type,
    amountMinor,
    note: bill.item || bill.merchant || '',
    occurredAt: bill.occurredAt ?? local.occurredAt,
    timeSource: bill.occurredAt ? 'page' : 'capture',
    confidence: amountMinor === null ? 'low' : 'medium',
    blockingReason: blocked,
    warnings: blocked ? [blocked] : amountMinor === null ? [bill.amountIssue === 'unverified'
      ? '读到了金额，但未能核实本笔实付，请核对后填写'
      : '图片中没有读到金额，可重试或手动补充'] : [],
  };
}
