import { useForegroundRefresh } from '../services/useForegroundRefresh';

/**
 * Re-reads the ledger whenever the app returns to the foreground or the
 * native overlay reports a save. The screens themselves read through a fresh
 * connection (see `withFreshDatabase`), so the long-lived SQLiteProvider
 * connection cannot serve a stale snapshot.
 */
export function useDatabaseRefresh(refresh: () => void): void {
  useForegroundRefresh(refresh);
}
