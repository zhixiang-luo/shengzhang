import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';

import { schema } from './schema';

type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

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
