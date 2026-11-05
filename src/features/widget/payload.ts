import { summarize } from '@/features/fuel/consumption';
import { monthTotal } from '@/features/fuel/history';
import { reminderTitle } from '@/features/reminders/labels';
import { byUrgency, dueInfo, kmPerDay } from '@/features/reminders/rules';
import type { EntryFuelType, Expense, FuelEntry, Reminder, Vehicle } from '@/db/schema';

// Ana ekran widget'ının verisi (docs/plan.md "Ana ekran widget'ı"). Saf: metinler burada uygulamanın dilinde ve para
// birimi biçiminde hazırlanır, widget (targets/widget, SwiftUI) yalnızca gösterir. "Kaç gün kaldı"yı widget her gece
// yarısı son tarihten kendisi hesaplar; uygulama açılmasa da sayı güncel kalır.

export const WIDGET_APP_GROUP = 'group.com.miracdeprem.ruhsat';
export const WIDGET_KEY = 'widget.summary';

export type WidgetPayload = {
  v: 1;
  /** Seçili aracın adı; araç yoksa null (widget "Araç ekle" der). */
  vehicle: string | null;
  reminder: {
    title: string;
    /** SF Symbols adı; uygulamadaki simgeyle aynı. */
    icon: string;
    /** Etkin son tarih (epoch ms); yalnız km'ye bağlı ve tahmin yapılamayan hatırlatmada null. */
    dueDate: number | null;
    /** Tarih yoksa gösterilecek km metni ("1.200 km kaldı"). */
    kmText: string | null;
  } | null;
  /** Son tüketim: en son tam dolumu yapılan yakıt türünün. */
  consumption: { value: string; unit: string } | null;
  /** Bu ayki toplam harcama, para birimi biçimiyle. */
  month: string;
  labels: {
    next: string;
    consumption: string;
    month: string;
    /** "%d gün" gibi; %d widget'ta gün sayısıyla değişir. */
    days: string;
    overdue: string;
    today: string;
    noReminder: string;
    noVehicle: string;
    noConsumption: string;
  };
};

export type WidgetData = {
  vehicles: readonly Vehicle[];
  reminders: readonly Reminder[];
  fuel: readonly FuelEntry[];
  expenses: readonly Pick<Expense, 'vehicleId' | 'date' | 'odometerKm' | 'amount'>[];
};

export type WidgetFormatters = {
  t: (key: string, params?: Record<string, string | number>) => string;
  number: (n: number, fractionDigits?: number) => string;
  money: (n: number, fractionDigits?: number) => string;
};

const ICONS: Record<string, string> = {
  inspection: 'checkmark.seal.fill',
  traffic_insurance: 'shield.lefthalf.filled',
  casco: 'shield.fill',
  road_tax: 'building.columns.fill',
  custom: 'bell.fill',
  service: 'wrench.and.screwdriver.fill',
};

function lastConsumption(fuel: readonly FuelEntry[], f: WidgetFormatters): WidgetPayload['consumption'] {
  if (fuel.length === 0) return null;
  const stats = summarize(fuel);
  // En son tam dolumu yapılan yakıt önce (LPG'li araçta hangisi kullanılıyorsa o); onda hesap yoksa diğerleri.
  const latestFull = [...fuel].filter((e) => e.isFull).sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)[0];
  const order: EntryFuelType[] = latestFull ? [latestFull.fuelType] : [];
  for (const type of Object.keys(stats.byFuel) as EntryFuelType[]) if (!order.includes(type)) order.push(type);
  for (const type of order) {
    const last = stats.byFuel[type]?.last;
    if (last != null) {
      return { value: f.number(last, 1), unit: `${type === 'electric' ? 'kWh' : 'L'}/100 ${f.t('common.km')}` };
    }
  }
  return null;
}

export function buildWidgetPayload(
  data: WidgetData,
  activeVehicleId: string | null,
  now: number,
  f: WidgetFormatters,
): WidgetPayload {
  const labels: WidgetPayload['labels'] = {
    next: f.t('widget.next'),
    consumption: f.t('widget.consumption'),
    month: f.t('summary.thisMonth'),
    days: f.t('widget.days'),
    overdue: f.t('widget.overdue'),
    today: f.t('reminder.today'),
    noReminder: f.t('widget.noReminder'),
    noVehicle: f.t('widget.noVehicle'),
    noConsumption: f.t('widget.noConsumption'),
  };
  // Seçili araç silindiyse uygulamadaki gibi ilk araca düşer.
  const vehicle =
    data.vehicles.find((v) => v.id === activeVehicleId) ??
    [...data.vehicles].sort((a, b) => a.createdAt - b.createdAt)[0] ??
    null;
  if (!vehicle) return { v: 1, vehicle: null, reminder: null, consumption: null, month: f.money(0, 0), labels };

  const fuel = data.fuel.filter((e) => e.vehicleId === vehicle.id);
  const expenses = data.expenses.filter((e) => e.vehicleId === vehicle.id);
  const points = [
    ...fuel.map((e) => ({ date: e.date, odometerKm: e.odometerKm })),
    ...expenses.flatMap((e) => (e.odometerKm !== null ? [{ date: e.date, odometerKm: e.odometerKm }] : [])),
  ];
  const reading = points.filter((p) => p.odometerKm === vehicle.odometerKm).sort((a, b) => b.date - a.date)[0];
  const ctx = { now, odometerKm: vehicle.odometerKm, kmPerDay: kmPerDay(points, now), readingDate: reading?.date };

  const next = data.reminders
    .filter((r) => r.vehicleId === vehicle.id && r.enabled)
    .map((r) => ({ r, info: dueInfo(r, ctx) }))
    .filter(({ info }) => info.state !== 'unknown')
    .sort((a, b) => byUrgency(a.info, b.info))[0];

  const spent = monthTotal([...fuel, ...expenses.map((e) => ({ date: e.date, totalPrice: e.amount }))], now);

  return {
    v: 1,
    vehicle: vehicle.name,
    reminder: next
      ? {
          title: reminderTitle(next.r, f.t),
          icon: ICONS[next.r.kind] ?? 'bell.fill',
          dueDate: next.info.dueDate,
          kmText:
            next.info.dueDate === null && next.info.kmLeft !== null
              ? f.t('widget.kmLeft', { km: f.number(Math.max(0, next.info.kmLeft)) })
              : null,
        }
      : null,
    consumption: lastConsumption(fuel, f),
    month: f.money(spent, 0),
    labels,
  };
}
