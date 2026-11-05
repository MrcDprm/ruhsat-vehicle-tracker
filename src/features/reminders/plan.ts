import type { Expense, FuelEntry, Reminder, Vehicle } from '@/db/schema';

import { reminderTitle } from './labels';
import { daysBetween, dueInfo, kmPerDay, notificationTimes } from './rules';

// Bildirim planı: bütün araçların açık hatırlatmalarından gelecekteki bildirimler. Saf; zamanlama notifications.ts'te.

/** iOS bir uygulama için en çok 64 bekleyen yerel bildirim tutar; pay bırakılır, en yakınlar seçilir. */
export const MAX_SCHEDULED = 60;

export type PlannedNotification = {
  at: number;
  title: string;
  body: string;
  vehicleId: string;
};

export type PlanData = {
  vehicles: readonly Vehicle[];
  reminders: readonly Reminder[];
  fuel: readonly Pick<FuelEntry, 'vehicleId' | 'date' | 'odometerKm'>[];
  expenses: readonly Pick<Expense, 'vehicleId' | 'date' | 'odometerKm'>[];
};

export type Formatters = {
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Uzun tarih: "10 Mart 2027". */
  date: (ms: number) => string;
  number: (n: number) => string;
};

export function planNotifications(data: PlanData, now: number, f: Formatters): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  for (const vehicle of data.vehicles) {
    const points = [
      ...data.fuel.filter((e) => e.vehicleId === vehicle.id),
      ...data.expenses.filter(
        (e): e is typeof e & { odometerKm: number } => e.vehicleId === vehicle.id && e.odometerKm !== null,
      ),
    ].map((p) => ({ date: p.date, odometerKm: p.odometerKm }));
    const perDay = kmPerDay(points, now);
    const reading = points.filter((p) => p.odometerKm === vehicle.odometerKm).sort((a, b) => b.date - a.date)[0];
    const ctx = { now, odometerKm: vehicle.odometerKm, kmPerDay: perDay, readingDate: reading?.date };

    for (const r of data.reminders) {
      if (r.vehicleId !== vehicle.id || !r.enabled) continue;
      const info = dueInfo(r, ctx);
      if (info.dueDate === null) continue;
      const name = reminderTitle(r, f.t);
      const due = f.date(info.dueDate);
      // Birden fazla aracı olan kullanıcı hangisi olduğunu başlıktan anlar.
      const title = `${vehicle.name} · ${name}`;

      for (const at of notificationTimes(r.kind, info, now)) {
        const daysLeft = daysBetween(at, info.dueDate);
        let body: string;
        if (r.kind === 'road_tax') {
          // Dönemin ilk günü "taksit başladı", son hafta "son hafta".
          const isStart = info.periodStart !== undefined && daysBetween(info.periodStart, at) === 0;
          body = f.t(isStart ? 'notify.roadTaxStart' : 'notify.roadTaxLastWeek', { date: due });
        } else if (info.basis === 'km' && info.dueKm !== null) {
          body = f.t('notify.serviceKm', { km: f.number(info.dueKm), date: due });
        } else if (daysLeft === 0) {
          body = f.t('notify.today', { name });
        } else {
          body = f.t('notify.daysLeft', { name, count: daysLeft, date: due });
        }
        plan.push({ at, title, body, vehicleId: vehicle.id });
      }
    }
  }
  return plan.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED);
}
