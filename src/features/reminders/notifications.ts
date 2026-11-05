import { isNull } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles } from '@/db/schema';
import { currentLocale, translate } from '@/i18n';

import { planNotifications } from './plan';

// Yerel bildirimler: sunucu yok, hatırlatmalar telefonda zamanlanır (docs/plan.md "Bildirim").
// Her eşitlemede bekleyen bildirimlerin hepsi silinip plan baştan kurulur: kayıt değişince eski bildirim kalmaz.

// Uygulama açıkken gelen bildirim de üstte görünür; ses ve simge rozeti yok.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function permissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** İzin daha önce sorulmadıysa sorar (ilk hatırlatma kurulurken). Reddedildiyse tekrar sormaz; iOS zaten izin vermez. */
export async function ensurePermission(): Promise<boolean> {
  const state = await permissionState();
  if (state !== 'undetermined') return state === 'granted';
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted';
}

export async function syncNotifications(): Promise<void> {
  if ((await permissionState()) !== 'granted') return;
  const [vehicleList, reminderList, fuelList, expenseList] = await Promise.all([
    db.select().from(vehicles).where(isNull(vehicles.deletedAt)),
    db.select().from(reminders).where(isNull(reminders.deletedAt)),
    db.select().from(fuelEntries).where(isNull(fuelEntries.deletedAt)),
    db.select().from(expenses).where(isNull(expenses.deletedAt)),
  ]);
  const locale = currentLocale();
  const tag = locale === 'tr' ? 'tr-TR' : 'en-GB';
  const plan = planNotifications(
    { vehicles: vehicleList, reminders: reminderList, fuel: fuelList, expenses: expenseList },
    Date.now(),
    {
      t: (key, params) => translate(locale, key, params),
      date: (ms) => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(ms),
      number: (n) => new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(n),
    },
  );
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: { vehicleId: n.vehicleId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
    });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Kayıt değişince çağrılır; art arda gelen değişiklikler tek eşitlemede birleşir.
 * Hata kullanıcıyı durdurmaz: bildirim kurulamazsa kayıt yine kaydedilmiştir, sonraki açılışta tekrar denenir.
 */
export function requestSync(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncNotifications().catch(() => {});
  }, 600);
}

/** Bildirim izni; kullanıcı Ayarlar'dan değiştirip dönünce yenilenir. */
export function useNotificationPermission(): PermissionState | null {
  const [state, setState] = useState<PermissionState | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      permissionState()
        .then((s) => alive && setState(s))
        .catch(() => {});
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return state;
}
