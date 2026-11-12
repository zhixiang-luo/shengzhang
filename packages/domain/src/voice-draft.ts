import type { ResolvedVoiceEntry } from './transaction';

/**
 * A voice entry whose category and time are resolved but whose amount may still
 * be missing. The amount stays `null` until the user types it in; it is never
 * guessed. Once every amount is present the draft can be completed into
 * `ResolvedVoiceEntry` values and saved as one batch.
 */
export type ResolvedVoiceDraftEntry = Omit<ResolvedVoiceEntry, 'amountMinor'> & {
  amountMinor: number | null;
};

export interface MissingAmountSummary {
  /** Zero-based positions of the entries that still need an amount, in spoken order. */
  indexes: number[];
  count: number;
  hasMissing: boolean;
}

export function describeMissingAmounts(
  entries: ReadonlyArray<Pick<ResolvedVoiceDraftEntry, 'amountMinor'>>,
): MissingAmountSummary {
  const indexes: number[] = [];
  entries.forEach((entry, index) => {
    if (entry.amountMinor === null) indexes.push(index);
  });
  return { indexes, count: indexes.length, hasMissing: indexes.length > 0 };
}

export type CompleteVoiceDraftResult =
  | { ok: true; entries: ResolvedVoiceEntry[] }
  | { ok: false; reason: 'missing' | 'invalid'; index: number };

/**
 * Fills the missing amounts and returns saveable entries, or reports the first
 * entry that still blocks saving. Amounts are integer cents. Entries that
 * already have an amount keep it exactly; the caller can only supply values
 * for entries that were missing.
 *
 * `filled` maps an entry index to the cents the user typed. A `null` value means
 * the field is empty or could not be parsed.
 *
 * All or nothing: it never returns a partial list.
 */
export function completeVoiceDraft(
  drafts: ReadonlyArray<ResolvedVoiceDraftEntry>,
  filled: Readonly<Record<number, number | null | undefined>>,
): CompleteVoiceDraftResult {
  const completed: ResolvedVoiceEntry[] = [];

  for (const [index, entry] of drafts.entries()) {
    let amountMinor: number | null = entry.amountMinor;
    if (amountMinor === null) {
      const supplied = filled[index];
      if (supplied === undefined || supplied === null) {
        return { ok: false, reason: 'missing', index };
      }
      amountMinor = supplied;
    }

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return { ok: false, reason: 'invalid', index };
    }

    completed.push({ ...entry, amountMinor });
  }

  return { ok: true, entries: completed };
}
