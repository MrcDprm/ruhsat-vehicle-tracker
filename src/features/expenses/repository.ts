import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { expenses, type Expense } from '@/db/schema';
import { dataChanged } from '@/sync/changes';
import { advanceReminders } from '@/features/reminders/repository';
import { raiseOdometer } from '@/features/vehicles/repository';

import type { ExpenseValues } from './validation';

// Kayıttan sonra: araç km'si ileri alınır, ilgili hatırlatma (muayene, sigorta, bakım…) ilerletilir.
async function afterSave(vehicleId: string, values: ExpenseValues) {
  if (values.odometerKm !== null) await raiseOdometer(vehicleId, values.odometerKm);
  await advanceReminders(vehicleId, values);
}

export async function createExpense(vehicleId: string, values: ExpenseValues): Promise<string> {
  const now = Date.now();
  const id = randomUUID();
  await db.insert(expenses).values({ ...values, id, vehicleId, createdAt: now, updatedAt: now, dirty: true });
  await afterSave(vehicleId, values);
  dataChanged();
  return id;
}

export async function updateExpense(id: string, vehicleId: string, values: ExpenseValues): Promise<void> {
  await db
    .update(expenses)
    .set({ ...values, updatedAt: Date.now(), dirty: true })
    .where(eq(expenses.id, id));
  await afterSave(vehicleId, values);
  dataChanged();
}

/** Kayıt kalır, işaretlenir: hesaplı kullanıcıda silme diğer cihaza da eşitlenir. */
export async function deleteExpense(id: string): Promise<void> {
  const now = Date.now();
  await db.update(expenses).set({ deletedAt: now, updatedAt: now, dirty: true }).where(eq(expenses.id, id));
  dataChanged();
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  return db.query.expenses.findFirst({ where: and(eq(expenses.id, id), isNull(expenses.deletedAt)) });
}

/** Aracın silinmemiş masrafları, en yeni başta. */
export function useExpenses(vehicleId: string | null | undefined): Expense[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.vehicleId, vehicleId ?? ''), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.date), desc(expenses.createdAt)),
    [vehicleId],
  );
  return data ?? [];
}
