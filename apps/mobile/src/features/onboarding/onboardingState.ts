export const ONBOARDING_VERSION = 1;
export const ONBOARDING_VERSION_KEY = 'shengzhang.onboardingVersion';

export function hasSeenCurrentOnboarding(value: string | null | undefined): boolean {
  const version = Number(value);
  return Number.isInteger(version) && version >= ONBOARDING_VERSION;
}

export function shouldShowFirstRunGuide({
  hasSeen,
  loading,
  transactionCount,
}: {
  hasSeen: boolean;
  loading: boolean;
  transactionCount: number;
}): boolean {
  return !hasSeen && !loading && transactionCount === 0;
}
