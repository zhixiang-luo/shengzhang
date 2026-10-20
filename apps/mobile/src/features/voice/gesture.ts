export type VoiceGestureMode = 'idle' | 'cancel' | 'manual';

const CANCEL_ARM_DISTANCE = 36;
const CANCEL_RESET_DISTANCE = 16;
const MANUAL_ARM_DISTANCE = 48;
const MANUAL_RESET_DISTANCE = 24;

export function resolveVoiceGestureMode(
  current: VoiceGestureMode,
  dx: number,
  dy: number,
): VoiceGestureMode {
  const horizontal = Math.abs(dx) > Math.abs(dy);

  if (current === 'cancel') {
    if (dy > -CANCEL_RESET_DISTANCE) return 'idle';
    if (horizontal && dx > MANUAL_ARM_DISTANCE) return 'manual';
    return 'cancel';
  }

  if (current === 'manual') {
    if (dy < -CANCEL_ARM_DISTANCE && !horizontal) return 'cancel';
    if (!horizontal || dx < MANUAL_RESET_DISTANCE) return 'idle';
    return 'manual';
  }

  if (dy < -CANCEL_ARM_DISTANCE && Math.abs(dy) >= Math.abs(dx)) return 'cancel';
  if (horizontal && dx > MANUAL_ARM_DISTANCE) return 'manual';
  return 'idle';
}
