export type VolcanoCloseAction = 'ignore' | 'finish' | 'error';

export function resolveVolcanoCloseAction(input: {
  finished: boolean;
  stopping: boolean;
}): VolcanoCloseAction {
  if (input.finished) return 'ignore';
  if (input.stopping) return 'finish';
  return 'error';
}

export function isSilentVoiceStop(input: {
  stopping: boolean;
  text: string;
}): boolean {
  return input.stopping && input.text.trim().length === 0;
}
