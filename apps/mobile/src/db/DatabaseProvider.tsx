import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

import { schema } from './schema';

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>> & {
  $client: SQLiteDatabase;
};

const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const sqlite = useSQLiteContext();
  const database = useMemo(() => drizzle(sqlite, { schema }), [sqlite]);

  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): AppDatabase {
  const database = useContext(DatabaseContext);
  if (!database) throw new Error('useDatabase must be used within DatabaseProvider');
  return database;
}
