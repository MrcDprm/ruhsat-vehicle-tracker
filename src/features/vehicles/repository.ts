import { and, asc, eq, isNull, lt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles, type Vehicle } from '@/db/schema';
import { dataChanged } from '@/sync/changes';

import type { VehicleValues } from './validation';

const ACTIVE_KEY = 'state.activeVehicle';

export async function createVehicle(values: VehicleValues): Promise<string> {
  const now = Date.now();
  const id = randomUUID();
  await db.insert(vehicles).values({ ...values, id, createdAt: now, updatedAt: now, dirty: true });
  setActiveVehicleId(id);
  dataChanged();
  return id;
}

export async function updateVehicle(id: string, values: VehicleValues): Promise<void> {
  await db
    .update(vehicles)
    .set({ ...values, updatedAt: Date.now(), dirty: true })
    .where(eq(vehicles.id, id));
  dataChanged();
}

/**
 * Kayıt kalır, işaretlenir: hesaplı kullanıcıda silme diğer cihaza da eşitlenir.
 * Aracın yakıt, masraf ve hatırlatma kayıtları da aynı anda işaretlenir; hepsi birlikte olur ya da hiçbiri olmaz.
 */
export async function deleteVehicle(id: string): Promise<void> {
  const now = Date.now();
  const deleted = { deletedAt: now, updatedAt: now, dirty: true };
  // expo-sqlite sürücüsünde işlem eşzamanlıdır: geri çağırma async olursa işlem sorgular bitmeden kapanır.
  db.transaction((tx) => {
    tx.update(vehicles).set(deleted).where(eq(vehicles.id, id)).run();
    for (const table of [fuelEntries, expenses, reminders]) {
      tx.update(table)
        .set(deleted)
        .where(and(eq(table.vehicleId, id), isNull(table.deletedAt)))
        .run();
    }
  });
  dataChanged();
}

/**
 * Aracın kilometresi kayıttan büyükse olduğu gibi kalır, küçükse kayıttaki km'ye çıkar.
 * Geriye çekilmez: kullanıcı aracın km'sini elle daha ileri girmiş olabilir.
 */
export async function raiseOdometer(vehicleId: string, km: number) {
  await db
    .update(vehicles)
    .set({ odometerKm: km, updatedAt: Date.now(), dirty: true })
    .where(and(eq(vehicles.id, vehicleId), lt(vehicles.odometerKm, km)));
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  return db.query.vehicles.findFirst({ where: and(eq(vehicles.id, id), isNull(vehicles.deletedAt)) });
}

export function useVehicles(): Vehicle[] {
  const { data } = useLiveQuery(
    db.select().from(vehicles).where(isNull(vehicles.deletedAt)).orderBy(asc(vehicles.createdAt)),
  );
  return data ?? [];
}

const listeners = new Set<(id: string | null) => void>();

export function setActiveVehicleId(id: string | null) {
  if (id) Storage.setItemSync(ACTIVE_KEY, id);
  else Storage.removeItemSync(ACTIVE_KEY);
  listeners.forEach((l) => l(id));
}

/** Seçili araç; seçili olan silindiyse ilk araca düşer. */
export function useActiveVehicle(): { vehicles: Vehicle[]; active: Vehicle | null } {
  const list = useVehicles();
  const [activeId, setActiveId] = useState<string | null>(() => Storage.getItemSync(ACTIVE_KEY));
  useEffect(() => {
    listeners.add(setActiveId);
    return () => {
      listeners.delete(setActiveId);
    };
  }, []);
  const active = list.find((v) => v.id === activeId) ?? list[0] ?? null;
  return { vehicles: list, active };
}
