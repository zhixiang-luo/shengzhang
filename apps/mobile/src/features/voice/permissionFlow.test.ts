import { describe, expect, it } from 'vitest';

import {
  requiresPermissionExplanation,
  resolveVoicePermissionAction,
} from './permissionFlow';

describe('resolveVoicePermissionAction', () => {
  it('starts immediately when permission was already granted', () => {
    expect(
      resolveVoicePermissionAction({
        hadPermissionBeforeRequest: true,
        permissionGranted: true,
      }),
    ).toBe('start-recording');
  });

  it('returns to a ready notice after first-time permission approval', () => {
    expect(
      resolveVoicePermissionAction({
        hadPermissionBeforeRequest: false,
        permissionGranted: true,
      }),
    ).toBe('show-ready-notice');
  });

  it('never starts recording when permission is denied', () => {
    expect(
      resolveVoicePermissionAction({
        hadPermissionBeforeRequest: false,
        permissionGranted: false,
      }),
    ).toBe('permission-denied');
  });
});

describe('requiresPermissionExplanation', () => {
  it('explains microphone and cloud use before the first system prompt', () => {
    expect(requiresPermissionExplanation('undetermined')).toBe(true);
  });

  it('does not repeat the explanation after permission has been decided', () => {
    expect(requiresPermissionExplanation('granted')).toBe(false);
    expect(requiresPermissionExplanation('denied')).toBe(false);
  });
});
