import { ExtensionStorage } from '@bacons/apple-targets';
import { isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles } from '@/db/schema';
import { activeVehicleId } from '@/features/vehicles/active';
import { currentCurrencyFormat, currentLocale, formatMoney, translate, upperCase } from '@/i18n';

import { WIDGET_APP_GROUP, WIDGET_KEY, buildWidgetPayload } from './payload';

// Widget verisini App Group'a yazar ve widget'ı yeniletir. Expo Go'da yerel modül yok: yazma ve yenileme sessizce
// hiçbir şey yapmaz (kütüphanenin kendi davranışı), uygulama çalışmaya devam eder.
const storage = new ExtensionStorage(WIDGET_APP_GROUP);

export async function syncWidget(): Promise<void> {
  const [vehicleList, reminderList, fuelList, expenseList] = await Promise.all([
    db.select().from(vehicles).where(isNull(vehicles.deletedAt)),
    db.select().from(reminders).where(isNull(reminders.deletedAt)),
    db.select().from(fuelEntries).where(isNull(fuelEntries.deletedAt)),
    db.select().from(expenses).where(isNull(expenses.deletedAt)),
  ]);
  const locale = currentLocale();
  const tag = locale === 'tr' ? 'tr-TR' : 'en-GB';
  const number = (n: number, digits = 0) =>
    new Intl.NumberFormat(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  const currency = currentCurrencyFormat();
  const payload = buildWidgetPayload(
    { vehicles: vehicleList, reminders: reminderList, fuel: fuelList, expenses: expenseList },
    activeVehicleId(),
    Date.now(),
    {
      t: (key, params) => translate(locale, key, params),
      number,
      money: (n, digits = 2) => formatMoney(number(n, digits), currency),
      upper: (text) => upperCase(text, locale),
    },
  );
  storage.set(WIDGET_KEY, JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Kayıt, araç, dil ya da para birimi değişince; art arda gelenler tek yazımda birleşir. Hata uygulamayı durdurmaz. */
export function requestWidgetSync(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncWidget().catch(() => {});
  }, 500);
}
