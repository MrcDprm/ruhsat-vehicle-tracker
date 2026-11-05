import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles } from '@/db/schema';
import { requestSync } from '@/features/reminders/notifications';
import { setActiveVehicleId } from '@/features/vehicles/repository';

/**
 * "Bütün verileri sil": araçlar, yakıt, masraf ve hatırlatmalar telefondan gerçekten silinir (işaretlenmez).
 * Kullanıcı verisinin kalmaması istenen tek yer burası; tek işlemde, yarım kalmaz.
 * Dil, tema ve para birimi tercihleri kalır. Bildirimler yeniden kurulur: araç kalmadığı için hepsi kalkar, simge sıfırlanır.
 * Hesaplı kullanıcıda sunucudaki kopya #6'daki hesap silmeyle kalkar; burada yalnız bu telefon.
 */
export function wipeAllData(): void {
  db.transaction((tx) => {
    tx.delete(fuelEntries).run();
    tx.delete(expenses).run();
    tx.delete(reminders).run();
    tx.delete(vehicles).run();
  });
  setActiveVehicleId(null);
  requestSync();
}
