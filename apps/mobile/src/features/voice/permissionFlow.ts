export type VoicePermissionAction =
  | 'start-recording'
  | 'show-ready-notice'
  | 'permission-denied';

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
