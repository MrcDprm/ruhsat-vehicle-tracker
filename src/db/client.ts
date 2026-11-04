import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// Değişiklik dinleyicisi açık: useLiveQuery ekranları kayıt değişince kendiliğinden yeniler.
const expo = openDatabaseSync('ruhsat.db', { enableChangeListener: true });
expo.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(expo, { schema });
