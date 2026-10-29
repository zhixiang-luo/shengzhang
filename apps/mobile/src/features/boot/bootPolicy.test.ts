import { describe, expect, it } from 'vitest';

import {
  BOOT_BRIDGE_DELAY_MS,
  BOOT_FULL_INTRO_MS,
  resolveBootPresentation,
} from './bootPolicy';

describe('resolveBootPresentation', () => {
  it('always plays the full intro before it has been seen', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: false,
        contentReady: true,
        elapsedMs: 20,
      }),
    ).toBe('full-intro');
  });

  it('keeps the native splash while a returning cold start is still fast', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: true,
        contentReady: false,
        elapsedMs: BOOT_BRIDGE_DELAY_MS - 1,
      }),
    ).toBe('waiting');
  });

  it('shows a bridge loader when returning startup takes longer than 300ms', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: true,
        contentReady: false,
        elapsedMs: BOOT_BRIDGE_DELAY_MS,
      }),
    ).toBe('bridge');
  });

  it('does not show a React intro when a returning cold start is already ready', () => {
    expect(
      resolveBootPresentation({
        hasSeenIntro: true,
        contentReady: true,
        elapsedMs: 80,
      }),
    ).toBe('none');
  });

  it('uses the approved full-intro duration', () => {
    expect(BOOT_FULL_INTRO_MS).toBe(2720);
    expect(BOOT_BRIDGE_DELAY_MS).toBe(300);
  });
});
