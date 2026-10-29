export const BOOT_BRIDGE_DELAY_MS = 300;
export const BOOT_FULL_INTRO_MS = 2720;

export type BootPresentation = 'waiting' | 'full-intro' | 'bridge' | 'none';

export function resolveBootPresentation({
  hasSeenIntro,
  contentReady,
  elapsedMs,
}: {
  hasSeenIntro: boolean;
  contentReady: boolean;
  elapsedMs: number;
}): BootPresentation {
  if (!hasSeenIntro) return 'full-intro';
  if (contentReady) return 'none';
  return elapsedMs >= BOOT_BRIDGE_DELAY_MS ? 'bridge' : 'waiting';
}
