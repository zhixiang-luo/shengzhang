import { describe, expect, it } from 'vitest';

import { shouldShowQuickCaptureReminder } from './quickCaptureReminder';

const base = {
  supported: true,
  accessibilityEnabled: false,
  everEnabled: true,
  dismissed: false,
};

describe('shouldShowQuickCaptureReminder', () => {
  it('shows when a previous user has the service turned off by the system', () => {
    expect(shouldShowQuickCaptureReminder(base)).toBe(true);
  });

  it('stays hidden while the service is enabled', () => {
    expect(shouldShowQuickCaptureReminder({ ...base, accessibilityEnabled: true })).toBe(false);
  });

  it('never prompts an installation that has not enabled quick capture', () => {
    expect(shouldShowQuickCaptureReminder({ ...base, everEnabled: false })).toBe(false);
  });

  it('respects a dismissal', () => {
    expect(shouldShowQuickCaptureReminder({ ...base, dismissed: true })).toBe(false);
  });

  it('never prompts on unsupported platforms', () => {
    expect(shouldShowQuickCaptureReminder({ ...base, supported: false })).toBe(false);
  });
});
