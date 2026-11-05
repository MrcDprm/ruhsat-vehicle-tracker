import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles } from '@/db/schema';
import { requestSync } from '@/features/reminders/notifications';
import { setActiveVehicleId } from '@/features/vehicles/repository';
import { sessionState } from '@/sync/client';
import { syncNow } from '@/sync/engine';

const TABLES = [fuelEntries, expenses, reminders, vehicles] as const;

/**
 * Telefondaki bütün kayıtlar gerçekten silinir (işaretlenmez). Çıkışta "telefondan sil" ve hesap silmede kullanılır:
 * sunucuya bir şey gönderilmez. Dil, tema ve para birimi tercihleri kalır; bildirimler kalkar.
 */
export function wipeLocalData(): void {
  db.transaction((tx) => {
    // Koşul bilerek var: koşulsuz "DELETE FROM tablo" SQLite'ın truncate kısayoluna düşer ve o kısayol değişiklik
    // bildirimi (update hook) göndermez; canlı listeler (useLiveQuery) yenilenmez, silinen kayıtlar ekranda kalırdı.
    for (const table of TABLES) tx.delete(table).where(isNotNull(table.id)).run();
  });
  setActiveVehicleId(null);
  requestSync();
}

/**
 * Ayarlar > "Bütün verileri sil".
 * Hesapsız: telefondan silinir. Hesaplı: her kayıt silindi olarak işaretlenip sunucuya da gönderilir (yoksa sonraki
 * eşitlemede geri gelirdi), gönderilenler telefondan kaldırılır. İnternet yoksa işaretli kalır, internet gelince gider;
 * işaretli kayıt hiçbir ekranda görünmez.
 */
export async function deleteAllRecords(): Promise<void> {
  if (sessionState().status !== 'signedIn') {
    wipeLocalData();
    return;
  }
  const now = Date.now();
  db.transaction((tx) => {
    for (const table of TABLES) {
      tx.update(table).set({ deletedAt: now, updatedAt: now, dirty: true }).where(isNull(table.deletedAt)).run();
    }
  });
  setActiveVehicleId(null);
  requestSync();
  await syncNow();
  db.transaction((tx) => {
    for (const table of TABLES) {
      tx.delete(table)
        .where(and(eq(table.dirty, false), isNotNull(table.deletedAt)))
        .run();
    }
  });
}
