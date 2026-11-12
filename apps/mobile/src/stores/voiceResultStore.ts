import type { ResolvedVoiceDraftEntry, ResolvedVoiceEntry } from '@shengzhang/domain';
import { create } from 'zustand';

export interface VoiceResult {
  requestId: string;
  transcript: string;
  entries: ResolvedVoiceEntry[];
}

/** A parsed voice batch that is still waiting for the user to fill in missing amounts. */
export interface PendingVoiceResult {
  requestId: string;
  transcript: string;
  entries: ResolvedVoiceDraftEntry[];
}

interface VoiceResultState {
  result: VoiceResult | null;
  pending: PendingVoiceResult | null;
  setResult: (result: VoiceResult) => void;
  setPending: (pending: PendingVoiceResult) => void;
  clear: () => void;
  clearPending: () => void;
}

export const useVoiceResultStore = create<VoiceResultState>((set) => ({
  result: null,
  pending: null,
  setResult: (result) => set({ result }),
  setPending: (pending) => set({ pending }),
  clear: () => {
    set({ result: null });
  },
  clearPending: () => {
    set({ pending: null });
  },
}));
