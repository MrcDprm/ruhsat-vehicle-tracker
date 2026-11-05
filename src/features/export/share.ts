import { isNull } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { expenses, fuelEntries, vehicles } from '@/db/schema';

import { expenseCsv, fuelCsv, isoDate, type CsvLocale } from './csv';

export type ExportKind = 'fuel' | 'expenses';

/**
 * Bütün araçların kayıtlarını CSV olarak yazar ve iOS paylaş menüsünü açar (Dosyalar'a kaydet, e-posta, AirDrop…).
 * Dosya önbellek klasöründe durur; iOS gerektiğinde siler, uygulamada iz bırakmaz.
 * Dönüş: dışa aktarılan kayıt sayısı (0 ise dosya yazılmaz, ekran "kayıt yok" der).
 */
export async function exportCsv(kind: ExportKind, t: (key: string) => string, locale: CsvLocale): Promise<number> {
  const vehicleList = await db.select({ id: vehicles.id, name: vehicles.name }).from(vehicles);
  let text: string;
  let count: number;
  if (kind === 'fuel') {
    const rows = await db.select().from(fuelEntries).where(isNull(fuelEntries.deletedAt));
    count = rows.length;
    text = fuelCsv(vehicleList, rows, t, locale);
  } else {
    const rows = await db.select().from(expenses).where(isNull(expenses.deletedAt));
    count = rows.length;
    text = expenseCsv(vehicleList, rows, t, locale);
  }
  if (count === 0) return 0;

  const name = `${t(kind === 'fuel' ? 'csv.fileFuel' : 'csv.fileExpenses')}-${isoDate(Date.now())}.csv`;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: name,
  });
  return count;
}
