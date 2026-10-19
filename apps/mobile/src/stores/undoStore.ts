import { create } from 'zustand';

import type { TransactionRow } from '../db/transactionRepository';

interface UndoDeleteState {
  deleted: TransactionRow | null;
  setDeleted: (transaction: TransactionRow) => void;
  clear: () => void;
}

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useUndoDeleteStore = create<UndoDeleteState>((set) => ({
  deleted: null,
  setDeleted: (transaction) => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ deleted: transaction });
    clearTimer = setTimeout(() => set({ deleted: null }), 8000);
  },
  clear: () => {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = null;
    set({ deleted: null });
  },
}));
