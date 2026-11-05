export const BOOT_FULL_INTRO_MS = 2720;
export const BOOT_QUICK_INTRO_MS = 1200;

export type BootPresentation = 'waiting' | 'full-intro' | 'quick-intro' | 'none';

export function resolveBootPresentation({ hasSeenIntro }: { hasSeenIntro: boolean }): BootPresentation {
  if (!hasSeenIntro) return 'full-intro';
  return 'quick-intro';
}
