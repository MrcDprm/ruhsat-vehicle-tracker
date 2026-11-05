import { LogBox } from 'react-native';

import { setOnboarded } from '@/features/account/onboarding';
import { setAdsRemoved } from '@/features/ads/entitlement';
import { createExpense } from '@/features/expenses/repository';
import { createFuelEntry } from '@/features/fuel/repository';
import { getReminders, saveReminders } from '@/features/reminders/repository';
import { buildReminders } from '@/features/reminders/setup';
import { wipeLocalData } from '@/features/settings/wipe';
import { createVehicle } from '@/features/vehicles/repository';
import type { Locale } from '@/i18n';
import { sessionState } from '@/sync/client';

import { buildDemoData } from './seed';

/**
 * Telefondaki kayıtları silip örnek defteri yazar (yalnız geliştirme derlemesi, mağaza görüntüleri için).
 * Hesaplıyken çalışmaz: örnek kayıtlar hesaba eşitlenmesin.
 */
export async function loadDemoData(locale: Locale): Promise<void> {
  if (sessionState().status === 'signedIn') throw new Error('signed in');
  const now = Date.now();
  const data = buildDemoData(now, locale);

  wipeLocalData();
  const vehicleId = await createVehicle(data.vehicle);
  const built = buildReminders(data.setup, { now, odometerKm: data.vehicle.odometerKm });
  if (!built.ok) throw new Error(`demo reminders: ${JSON.stringify(built.errors)}`);
  saveReminders(vehicleId, built.drafts, await getReminders(vehicleId));
  // Sırayla: masraf kaydı hatırlatmayı ilerletir, km'ler eskiden yeniye artar.
  for (const entry of data.fuel) await createFuelEntry(vehicleId, entry);
  for (const expense of data.expenses) await createExpense(vehicleId, expense);

  setOnboarded(true);
  // Görüntülerde Google'ın test reklamı ve geliştirme uyarıları çıkmasın.
  setAdsRemoved(true);
  LogBox.ignoreAllLogs();
}
