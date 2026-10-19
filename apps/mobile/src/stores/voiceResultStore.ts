import type { ResolvedVoiceEntry } from '@shengzhang/domain';
import { create } from 'zustand';

export interface VoiceResult {
  requestId: string;
  transcript: string;
  entries: ResolvedVoiceEntry[];
}

interface VoiceResultState {
  result: VoiceResult | null;
  setResult: (result: VoiceResult) => void;
  clear: () => void;
}

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useVoiceResultStore = create<VoiceResultState>((set) => ({
  result: null,
  setResult: (result) => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ result });
    clearTimer = setTimeout(() => set({ result: null }), 8000);
  },
  clear: () => {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = null;
    set({ result: null });
  },
}));
