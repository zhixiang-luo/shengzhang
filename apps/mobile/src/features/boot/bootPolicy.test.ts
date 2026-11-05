import { describe, expect, it } from 'vitest';

import {
  BOOT_FULL_INTRO_MS,
  BOOT_QUICK_INTRO_MS,
  resolveBootPresentation,
} from './bootPolicy';

describe('resolveBootPresentation', () => {
  it('always plays the full intro before it has been seen', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: false,
      }),
    ).toBe('full-intro');
  });

  it('plays the quick intro on every returning process cold start', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: true,
      }),
    ).toBe('quick-intro');
  });

  it('uses the approved intro durations', () => {
    expect(BOOT_FULL_INTRO_MS).toBe(2720);
    expect(BOOT_QUICK_INTRO_MS).toBe(1200);
  });
});
