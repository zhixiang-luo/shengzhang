import {
  completeVoiceDraft,
  type ResolvedVoiceDraftEntry,
  type ResolvedVoiceEntry,
} from '@shengzhang/domain';

/**
 * The decision state of the "还差一个金额" sheet.
 *
 * A batch is decided exactly once: the first valid confirm or abandon wins and
 * every later action is ignored. That is what keeps an abandoned batch from
 * being flipped into a save while the close animation is still running, and a
 * confirmed batch from being dropped by a stray back press.
 */
export interface PendingBatchLike {
  requestId: string;
  transcript: string;
  entries: readonly ResolvedVoiceDraftEntry[];
}

export interface ConfirmedVoiceBatch {
  requestId: string;
  transcript: string;
  entries: ResolvedVoiceEntry[];
}

export type MissingAmountFlowState =
  | { status: 'editing' }
  | { status: 'confirmed'; batch: ConfirmedVoiceBatch }
  | { status: 'abandoned' };

export const INITIAL_MISSING_AMOUNT_FLOW: MissingAmountFlowState = { status: 'editing' };

/**
 * Confirms the batch if every amount is now present. Returns the same state
 * object when nothing changed (already decided, or still incomplete), so callers
 * can detect "ignored" with an identity check.
 */
export function confirmMissingAmounts(
  state: MissingAmountFlowState,
  pending: PendingBatchLike,
  typedCents: Readonly<Record<number, number | null | undefined>>,
): MissingAmountFlowState {
  if (state.status !== 'editing') return state;
  const completed = completeVoiceDraft(pending.entries, typedCents);
  if (!completed.ok) return state;
  return {
    status: 'confirmed',
    batch: {
      requestId: pending.requestId,
      transcript: pending.transcript,
      entries: completed.entries,
    },
  };
}

/** Abandons the batch. Returns the same state object if it was already decided. */
export function abandonMissingAmounts(state: MissingAmountFlowState): MissingAmountFlowState {
  return state.status === 'editing' ? { status: 'abandoned' } : state;
}

/**
 * What to hand to the result card once the sheet has finished closing:
 * the confirmed batch, or `null` when the batch was abandoned or never decided.
 */
export function settleMissingAmounts(state: MissingAmountFlowState): ConfirmedVoiceBatch | null {
  return state.status === 'confirmed' ? state.batch : null;
}
