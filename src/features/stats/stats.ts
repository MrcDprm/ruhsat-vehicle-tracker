import type { EntryFuelType, Expense, ExpenseCategory, FuelEntry } from '@/db/schema';
import { intervals } from '@/features/fuel/consumption';

// İstatistik hesapları: saf fonksiyonlar, ekran yalnızca çizer. Tarihler epoch ms, aylar cihazın yerel saatine göre.

export const RANGES = ['3m', '6m', '12m', 'year', 'all'] as const;
export type RangeKey = (typeof RANGES)[number];

/** Masraf grupları: grafikte dört renk yeter; türe göre ayrıntı ayrı listede. */
export const SPEND_GROUPS = ['fuel', 'maintenance', 'insurance_tax', 'other'] as const;
export type SpendGroup = (typeof SPEND_GROUPS)[number];

export const GROUP_OF: Record<ExpenseCategory, SpendGroup> = {
  service: 'maintenance',
  inspection: 'maintenance',
  traffic_insurance: 'insurance_tax',
  casco: 'insurance_tax',
  road_tax: 'insurance_tax',
  fine: 'other',
  parking_toll: 'other',
  wash: 'other',
  other: 'other',
};

type FuelRow = Pick<
  FuelEntry,
  'id' | 'date' | 'createdAt' | 'odometerKm' | 'liters' | 'totalPrice' | 'fuelType' | 'isFull'
>;
type ExpenseRow = Pick<Expense, 'date' | 'odometerKm' | 'category' | 'amount'>;

const monthStart = (year: number, month: number) => new Date(year, month, 1).getTime();

/**
 * Aralığın başlangıcı (ayın ilk günü). 3/6/12 ay: bu ay dahil geriye; yıl: 1 Ocak; tümü: en eski kaydın ayı.
 * Bitiş her zaman şimdi.
 */
export function rangeStart(range: RangeKey, now: number, earliest: number | null): number {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  switch (range) {
    case '3m':
      return monthStart(y, m - 2);
    case '6m':
      return monthStart(y, m - 5);
    case '12m':
      return monthStart(y, m - 11);
    case 'year':
      return monthStart(y, 0);
    case 'all': {
      if (earliest === null || earliest > now) return monthStart(y, m);
      const e = new Date(earliest);
      return monthStart(e.getFullYear(), e.getMonth());
    }
  }
}

const emptyGroups = (): Record<SpendGroup, number> => ({ fuel: 0, maintenance: 0, insurance_tax: 0, other: 0 });
const inRange = (date: number, from: number, to: number) => date >= from && date <= to;

export type MonthBar = { key: string; year: number; month: number; groups: Record<SpendGroup, number>; total: number };

/** Aralıktaki her ay için bir çubuk (kaydı olmayan ay sıfır), grup grup harcama. */
export function monthlySpend(
  fuel: readonly FuelRow[],
  expenses: readonly ExpenseRow[],
  from: number,
  to: number,
): MonthBar[] {
  const bars: MonthBar[] = [];
  const index = new Map<string, MonthBar>();
  const start = new Date(from);
  const end = new Date(to);
  for (
    let y = start.getFullYear(), m = start.getMonth();
    y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth());
  ) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const bar = { key, year: y, month: m, groups: emptyGroups(), total: 0 };
    bars.push(bar);
    index.set(key, bar);
    m++;
    if (m === 12) {
      m = 0;
      y++;
    }
  }
  const add = (date: number, group: SpendGroup, amount: number) => {
    if (!inRange(date, from, to)) return;
    const d = new Date(date);
    const bar = index.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    if (!bar) return;
    bar.groups[group] += amount;
    bar.total += amount;
  };
  for (const e of fuel) add(e.date, 'fuel', e.totalPrice);
  for (const e of expenses) add(e.date, GROUP_OF[e.category], e.amount);
  return bars;
}

export type RangeSummary = {
  total: number;
  byGroup: Record<SpendGroup, number>;
  /** Türe göre (yakıt dahil), büyükten küçüğe; sıfır olanlar yok. */
  byCategory: { category: ExpenseCategory | 'fuel'; amount: number }[];
  /** Aralıkta yapılan km: aralıktaki ilk ve son km okuması arası. İki okuma yoksa null. */
  km: number | null;
  costPerKm: number | null;
  months: number;
  monthlyAverage: number;
};

export function summarizeRange(
  fuel: readonly FuelRow[],
  expenses: readonly ExpenseRow[],
  from: number,
  to: number,
): RangeSummary {
  const byGroup = emptyGroups();
  const byCat = new Map<ExpenseCategory | 'fuel', number>();
  const readings: { date: number; km: number }[] = [];
  for (const e of fuel) {
    if (!inRange(e.date, from, to)) continue;
    byGroup.fuel += e.totalPrice;
    byCat.set('fuel', (byCat.get('fuel') ?? 0) + e.totalPrice);
    readings.push({ date: e.date, km: e.odometerKm });
  }
  for (const e of expenses) {
    if (!inRange(e.date, from, to)) continue;
    byGroup[GROUP_OF[e.category]] += e.amount;
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    if (e.odometerKm !== null) readings.push({ date: e.date, km: e.odometerKm });
  }
  const total = SPEND_GROUPS.reduce((s, g) => s + byGroup[g], 0);

  readings.sort((a, b) => a.date - b.date);
  const driven = readings.length >= 2 ? readings[readings.length - 1].km - readings[0].km : 0;
  const km = driven > 0 ? driven : null;

  const months = monthlySpend([], [], from, to).length;
  return {
    total,
    byGroup,
    byCategory: [...byCat.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    km,
    costPerKm: km ? total / km : null,
    months,
    monthlyAverage: months > 0 ? total / months : 0,
  };
}

/** Yıl yıl toplam harcama (bütün kayıtlar, aralıktan bağımsız), en yeni yıl başta. */
export function yearlyTotals(
  fuel: readonly FuelRow[],
  expenses: readonly ExpenseRow[],
): { year: number; total: number }[] {
  const totals = new Map<number, number>();
  const add = (date: number, amount: number) => {
    const y = new Date(date).getFullYear();
    totals.set(y, (totals.get(y) ?? 0) + amount);
  };
  for (const e of fuel) add(e.date, e.totalPrice);
  for (const e of expenses) add(e.date, e.amount);
  return [...totals.entries()].map(([year, total]) => ({ year, total })).sort((a, b) => b.year - a.year);
}

export type ConsumptionPoint = { date: number; per100: number; fuelType: EntryFuelType };

/**
 * Tüketim grafiği: aralıkta kapanan, işaretsiz her tam dolum aralığı bir nokta (tarih = aralığı kapatan dolum).
 * Hesap bütün kayıtlarla yapılır; aralığın başındaki tam dolum aralık dışında kalsa da tüketim doğru çıkar.
 */
export function consumptionSeries(fuel: readonly FuelRow[], from: number, to: number): ConsumptionPoint[] {
  const dateOf = new Map(fuel.map((e) => [e.id, e.date]));
  return intervals(fuel)
    .filter((iv) => iv.per100 !== null)
    .map((iv) => ({ date: dateOf.get(iv.toId)!, per100: iv.per100!, fuelType: iv.fuelType }))
    .filter((p) => inRange(p.date, from, to))
    .sort((a, b) => a.date - b.date);
}
