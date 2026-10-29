export const BOOT_INTRO_VERSION = 1;
export const BOOT_INTRO_VERSION_KEY = 'shengzhang.bootIntroVersion';

export function hasSeenCurrentBootIntro(value: string | null | undefined): boolean {
  if (!value) return false;
  const version = Number.parseInt(value, 10);
  return Number.isFinite(version) && version >= BOOT_INTRO_VERSION;
}
