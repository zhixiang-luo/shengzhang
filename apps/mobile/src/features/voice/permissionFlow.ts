export type VoicePermissionAction =
  | 'start-recording'
  | 'show-ready-notice'
  | 'permission-denied';

export type VoicePermissionStatus = 'granted' | 'denied' | 'undetermined';

export function requiresPermissionExplanation(status: VoicePermissionStatus): boolean {
  return status === 'undetermined';
}

export function resolveVoicePermissionAction({
  hadPermissionBeforeRequest,
  permissionGranted,
}: {
  hadPermissionBeforeRequest: boolean;
  permissionGranted: boolean;
}): VoicePermissionAction {
  if (!permissionGranted) return 'permission-denied';
  return hadPermissionBeforeRequest ? 'start-recording' : 'show-ready-notice';
}
