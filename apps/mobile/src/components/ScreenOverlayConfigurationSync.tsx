import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useDatabase } from '../db/DatabaseProvider';
import { synchronizeScreenOverlay } from '../services/screenOverlayConfiguration';

/** Runs only after SQLiteProvider has finished its normal migrations. */
export function ScreenOverlayConfigurationSync() {
  const db = useDatabase();
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const synchronize = () => { void synchronizeScreenOverlay(db.$client.databasePath).catch(() => undefined); };
    synchronize();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') synchronize();
    });
    return () => subscription.remove();
  }, [db]);
  return null;
}
