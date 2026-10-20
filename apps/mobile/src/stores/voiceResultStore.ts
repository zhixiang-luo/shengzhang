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

export const useVoiceResultStore = create<VoiceResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => {
    set({ result: null });
  },
}));
