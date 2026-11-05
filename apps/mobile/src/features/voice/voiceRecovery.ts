export type VoiceRecoveryStage = 'recognition' | 'structuring';

export interface VoiceRecoveryAttempt {
  kind: 'reparse' | 'record';
  transcript: string;
}

export function resolveVoiceRecoveryAttempt({
  stage,
  transcript,
}: {
  stage: VoiceRecoveryStage;
  transcript: string;
}): VoiceRecoveryAttempt {
  const normalizedTranscript = transcript.trim();
  return {
    kind: stage === 'structuring' && normalizedTranscript ? 'reparse' : 'record',
    transcript: normalizedTranscript,
  };
}

export function buildManualEntryRecoveryParams(transcript: string): { note?: string } {
  const normalizedTranscript = transcript.trim();
  return normalizedTranscript ? { note: normalizedTranscript.slice(0, 40) } : {};
}
