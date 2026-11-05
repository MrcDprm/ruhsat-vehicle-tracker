import { and, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { reminders, type Expense, type Reminder } from '@/db/schema';

import { EXPENSE_REMINDER, applyExpense } from './rules';
import type { ReminderDraft } from './setup';

/**
 * Masraf kaydedilince ilgili hatırlatmayı ilerletir (muayene yapıldı → sonraki muayene).
 * Masraf silinince geri alınmaz: kullanıcı hatırlatmayı elle düzeltebilir; geri almak eski değeri saklamayı gerektirirdi.
 */
export async function advanceReminders(
  vehicleId: string,
  expense: Pick<Expense, 'category' | 'subtypes' | 'date' | 'odometerKm'>,
): Promise<void> {
  const kind = EXPENSE_REMINDER[expense.category];
  if (!kind) return;
  const list = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.vehicleId, vehicleId), eq(reminders.kind, kind), isNull(reminders.deletedAt)));
  for (const r of list) {
    const patch = applyExpense(r, expense);
    if (patch) {
      await db
        .update(reminders)
        .set({ ...patch, updatedAt: Date.now(), dirty: true })
        .where(eq(reminders.id, r.id));
    }
  }
}

export async function getReminders(vehicleId: string): Promise<Reminder[]> {
  return db
    .select()
    .from(reminders)
    .where(and(eq(reminders.vehicleId, vehicleId), isNull(reminders.deletedAt)));
}

/**
 * Kurulum formunun satırlarını kaydeder: aynı tür (bakımda aynı alt tür) varsa günceller, yoksa ekler.
 * Formdan çıkarılan bakım silinmez, kapatılır (enabled: false); tekrar eklenince eski değerleri gelir.
 * Hepsi tek işlemde: yarım kalan kurulum olmaz.
 */
export function saveReminders(vehicleId: string, drafts: readonly ReminderDraft[], existing: readonly Reminder[]) {
  const now = Date.now();
  const sameSlot = (r: Pick<Reminder, 'kind' | 'title'>, d: ReminderDraft) =>
    r.kind === d.kind && (d.kind !== 'service' || r.title === d.title);
  db.transaction((tx) => {
    for (const d of drafts) {
      const match = existing.find((r) => sameSlot(r, d));
      if (match) {
        tx.update(reminders)
          .set({ ...d, updatedAt: now, dirty: true })
          .where(eq(reminders.id, match.id))
          .run();
      } else {
        tx.insert(reminders)
          .values({ ...d, id: randomUUID(), vehicleId, createdAt: now, updatedAt: now, dirty: true })
          .run();
      }
    }
    for (const r of existing) {
      if (r.enabled && !drafts.some((d) => sameSlot(r, d))) {
        tx.update(reminders).set({ enabled: false, updatedAt: now, dirty: true }).where(eq(reminders.id, r.id)).run();
      }
    }
  });
}

/** Aracın silinmemiş hatırlatmaları (açık ve kapalı). */
export function useReminders(vehicleId: string | null | undefined): Reminder[] {
  const { data } = useLiveQuery(
    db
      .select()
      .from(reminders)
      .where(and(eq(reminders.vehicleId, vehicleId ?? ''), isNull(reminders.deletedAt))),
    [vehicleId],
  );
  return data ?? [];
}
