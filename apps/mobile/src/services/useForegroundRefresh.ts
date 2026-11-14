import { addScreenBillSavedListener } from '@shengzhang/screen-capture';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Native overlays can update SQLite while the current route stays focused or
 * while the app sits in the background. Keep the listeners for the whole
 * mounted lifetime instead of only while the route is focused, so a save that
 * lands in the background still refreshes the ledger when the app returns.
 */
export function useForegroundRefresh(refresh: () => void): void {
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  useEffect(() => {
    const changeSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // Some Android OEMs emit focus when a native accessibility overlay
    // disappears without emitting a second active change event.
    const focusSubscription = AppState.addEventListener('focus', refresh);
    // The accessibility overlay saves in the same process. This event is the
    // only reliable signal when the app never leaves the foreground.
    const savedSubscription = addScreenBillSavedListener(() => {
      refresh();
      // The companion connection can still be closing its WAL commit when the
      // event arrives, so read once more after the file state settles.
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(refresh, 400);
    });
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      changeSubscription.remove();
      focusSubscription.remove();
      savedSubscription.remove();
    };
  }, [refresh]);
}
