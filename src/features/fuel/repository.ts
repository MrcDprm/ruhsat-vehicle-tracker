import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { fuelEntries, type FuelEntry } from '@/db/schema';
import { raiseOdometer } from '@/features/vehicles/repository';

import type { FuelValues } from './validation';

export async function createFuelEntry(vehicleId: string, values: FuelValues): Promise<string> {
  const now = Date.now();
  const id = randomUUID();
  await db.insert(fuelEntries).values({ ...values, id, vehicleId, createdAt: now, updatedAt: now, dirty: true });
  await raiseOdometer(vehicleId, values.odometerKm);
  return id;
}

export async function updateFuelEntry(id: string, vehicleId: string, values: FuelValues): Promise<void> {
  await db
    .update(fuelEntries)
    .set({ ...values, updatedAt: Date.now(), dirty: true })
    .where(eq(fuelEntries.id, id));
  await raiseOdometer(vehicleId, values.odometerKm);
}

/** Kayıt kalır, işaretlenir: hesaplı kullanıcıda silme diğer cihaza da eşitlenir. */
export async function deleteFuelEntry(id: string): Promise<void> {
  const now = Date.now();
  await db.update(fuelEntries).set({ deletedAt: now, updatedAt: now, dirty: true }).where(eq(fuelEntries.id, id));
}

export async function getFuelEntry(id: string): Promise<FuelEntry | undefined> {
  return db.query.fuelEntries.findFirst({ where: and(eq(fuelEntries.id, id), isNull(fuelEntries.deletedAt)) });
}

/** Aracın silinmemiş yakıt kayıtları, en yeni başta. Kayıt değişince kendiliğinden yenilenir. */
export function useFuelEntries(vehicleId: string | null | undefined): FuelEntry[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(fuelEntries)
      .where(and(eq(fuelEntries.vehicleId, vehicleId ?? ''), isNull(fuelEntries.deletedAt)))
      .orderBy(desc(fuelEntries.date), desc(fuelEntries.createdAt)),
    [vehicleId],
  );
  return data ?? [];
}
