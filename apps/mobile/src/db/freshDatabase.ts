import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import type { AppDatabase } from './DatabaseProvider';
import { schema } from './schema';

let readQueue: Promise<unknown> = Promise.resolve();

function isDiskIoError(error: unknown): boolean {
  return error instanceof Error && /Error code 10|disk I\/O error/i.test(error.message);
}

async function readOnce<T>(read: (db: AppDatabase) => T | Promise<T>): Promise<T> {
  const client = await openDatabaseAsync('shengzhang.db', { useNewConnection: true });
  try {
    await client.execAsync('PRAGMA busy_timeout = 5000; PRAGMA query_only = ON;');
    return await read(drizzle(client, { schema }) as AppDatabase);
  } finally {
    // A failed close must not turn a successful read into a ledger error. The
    // next read opens a new connection anyway; Android reclaims a stuck one.
    try {
      await client.closeAsync();
    } catch {
      // Keep the result. The diagnostic is already recorded by expo-sqlite.
    }
  }
}

/**
 * Reads through a brand-new SQLite connection.
 *
 * The accessibility overlay commits through Android's own SQLite build. The
 * long-lived connection owned by SQLiteProvider can keep serving its original
 * snapshot even after the overlay commits, so ledger screens read through a
 * short-lived connection and close it immediately afterwards. Reads are
 * serialized because opening and closing several connections against the same
 * ledger while a native write is finishing can surface SQLITE_IOERR.
 */
export function withFreshDatabase<T>(read: (db: AppDatabase) => T | Promise<T>): Promise<T> {
  const run = readQueue.then(async () => {
    try {
      return await readOnce(read);
    } catch (error) {
      if (!isDiskIoError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150));
      return readOnce(read);
    }
  });
  readQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
