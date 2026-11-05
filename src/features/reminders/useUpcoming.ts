import { useMemo } from 'react';

import type { Reminder, Vehicle } from '@/db/schema';
import { useExpenses } from '@/features/expenses/repository';
import { useFuelEntries } from '@/features/fuel/repository';
import { useNow } from '@/hooks/useNow';

import { byUrgency, dueInfo, kmPerDay, type DueInfo } from './rules';
import { useReminders } from './repository';

export type Upcoming = { reminder: Reminder; info: DueInfo };

/**
 * Aracın açık hatırlatmaları, en acil başta. Km'ye bağlı olanların tarihi, yakıt ve masraf kayıtlarındaki
 * km okumalarından çıkan günlük ortalama ile tahmin edilir.
 */
export function useUpcoming(vehicle: Vehicle | null): {
  upcoming: Upcoming[];
  reminders: Reminder[];
  perDay: number | null;
} {
  const list = useReminders(vehicle?.id);
  const fuel = useFuelEntries(vehicle?.id);
  const expenses = useExpenses(vehicle?.id);
  const now = useNow();

  return useMemo(() => {
    if (!vehicle) return { upcoming: [], reminders: list, perDay: null };
    // now useNow'dan: uygulama öne gelince yenilenir.
    const points = [
      ...fuel.map((e) => ({ date: e.date, odometerKm: e.odometerKm })),
      ...expenses.flatMap((e) => (e.odometerKm !== null ? [{ date: e.date, odometerKm: e.odometerKm }] : [])),
    ];
    const perDay = kmPerDay(points, now);
    // Aracın km'si en son hangi kayıtta okundu: tahmin o günden başlar.
    const reading = points.filter((p) => p.odometerKm === vehicle.odometerKm).sort((a, b) => b.date - a.date)[0];
    const ctx = { now, odometerKm: vehicle.odometerKm, kmPerDay: perDay, readingDate: reading?.date };
    const upcoming = list
      .filter((r) => r.enabled)
      .map((reminder) => ({ reminder, info: dueInfo(reminder, ctx) }))
      .sort((a, b) => byUrgency(a.info, b.info));
    return { upcoming, reminders: list, perDay };
  }, [vehicle, list, fuel, expenses, now]);
}
