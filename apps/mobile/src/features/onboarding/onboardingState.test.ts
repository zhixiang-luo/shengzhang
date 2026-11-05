import { describe, expect, it } from 'vitest';

import {
  hasSeenCurrentOnboarding,
  shouldShowFirstRunGuide,
} from './onboardingState';

describe('hasSeenCurrentOnboarding', () => {
  it('accepts the current or a newer onboarding version', () => {
    expect(hasSeenCurrentOnboarding('1')).toBe(true);
    expect(hasSeenCurrentOnboarding('2')).toBe(true);
  });

  it('treats a missing, invalid, or older version as unseen', () => {
    expect(hasSeenCurrentOnboarding(null)).toBe(false);
    expect(hasSeenCurrentOnboarding('')).toBe(false);
    expect(hasSeenCurrentOnboarding('0')).toBe(false);
    expect(hasSeenCurrentOnboarding('invalid')).toBe(false);
  });
});

describe('shouldShowFirstRunGuide', () => {
  it('shows only for an unseen, loaded, and still-empty ledger', () => {
    expect(
      shouldShowFirstRunGuide({
        hasSeen: false,
        loading: false,
        transactionCount: 0,
      }),
    ).toBe(true);
  });

  it('never interrupts an existing ledger or waits through loading', () => {
    expect(
      shouldShowFirstRunGuide({
        hasSeen: false,
        loading: false,
        transactionCount: 3,
      }),
    ).toBe(false);
    expect(
      shouldShowFirstRunGuide({
        hasSeen: false,
        loading: true,
        transactionCount: 0,
      }),
    ).toBe(false);
  });
});
