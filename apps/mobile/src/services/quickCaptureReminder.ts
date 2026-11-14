import type { AppDatabase } from '../db/DatabaseProvider';

const EVER_ENABLED_KEY = 'quick_capture_ever_enabled';
const DISMISSED_KEY = 'quick_capture_reminder_dismissed';

async function readSetting(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.$client.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

async function writeSetting(db: AppDatabase, key: string, value: string): Promise<void> {
  await db.$client.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    new Date().toISOString(),
  );
}

export async function readQuickCaptureReminderState(
  db: AppDatabase,
): Promise<{ everEnabled: boolean; dismissed: boolean }> {
  const [everEnabled, dismissed] = await Promise.all([
    readSetting(db, EVER_ENABLED_KEY),
    readSetting(db, DISMISSED_KEY),
  ]);
  return { everEnabled: everEnabled === '1', dismissed: dismissed === '1' };
}

/** Records that this installation has seen the service enabled, and re-arms the reminder. */
export async function markQuickCaptureEnabled(db: AppDatabase): Promise<void> {
  await writeSetting(db, EVER_ENABLED_KEY, '1');
  await writeSetting(db, DISMISSED_KEY, '0');
}

export async function dismissQuickCaptureReminder(db: AppDatabase): Promise<void> {
  await writeSetting(db, DISMISSED_KEY, '1');
}

/**
 * Shows only for installations that have used quick bookkeeping before. The
 * system can silently clear the accessibility toggle on some OEM updates and
 * force-stops; new users should not see a reminder for a feature they never set up.
 */
export function shouldShowQuickCaptureReminder(input: {
  supported: boolean;
  accessibilityEnabled: boolean;
  everEnabled: boolean;
  dismissed: boolean;
}): boolean {
  return input.supported && !input.accessibilityEnabled && input.everEnabled && !input.dismissed;
}
