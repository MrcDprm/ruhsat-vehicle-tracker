import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { reminders, type Expense } from '@/db/schema';

import { EXPENSE_REMINDER, applyExpense } from './rules';

/**
 * Masraf kaydedilince ilgili hatırlatmayı ilerletir (muayene yapıldı → sonraki muayene).
 * Masraf silinince geri alınmaz: kullanıcı hatırlatmayı elle düzeltebilir; geri almak eski değeri saklamayı gerektirirdi.
 */
export async function advanceReminders(
  vehicleId: string,
  expense: Pick<Expense, 'category' | 'subtype' | 'date' | 'odometerKm'>,
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
