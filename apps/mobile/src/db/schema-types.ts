import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type { schema } from './schema';

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;
