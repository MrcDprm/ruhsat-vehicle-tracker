import type { EntryFuelType } from '@/db/schema';

// Tüketim "tam depodan tam depoya": iki tam dolum arasındaki bütün litreler / aradaki km.
// Saf fonksiyonlar; veritabanı ve ekrandan bağımsız, testler telefonsuz çalışır.

export type FillUp = {
  id: string;
  date: number;
  createdAt: number;
  odometerKm: number;
  /** Elektrikte kWh. */
  liters: number;
  totalPrice: number;
  fuelType: EntryFuelType;
  isFull: boolean;
};

/**
 * odometer: aralıktaki bir kayıtta km bir önceki kayıttan küçük (hatalı ya da sırası karışık giriş).
 * outlier: sonuç bu yakıt için olanaksız; büyük ihtimalle arada bir dolum kaydedilmemiş.
 */
export type IntervalFlag = 'odometer' | 'outlier';

export type Interval = {
  fuelType: EntryFuelType;
  fromId: string;
  toId: string;
  km: number;
  amount: number;
  cost: number;
  /** 100 km'de litre (elektrikte kWh); işaretli aralıkta null. */
  per100: number | null;
  flag: IntervalFlag | null;
};

// Gerçekçi alt ve üst sınırlar (100 km'de). Dışında kalan aralık ortalamaya katılmaz, işaretlenir.
export const PLAUSIBLE: Record<EntryFuelType, readonly [number, number]> = {
  petrol: [2, 30],
  diesel: [2, 30],
  lpg: [3, 40],
  electric: [5, 50],
};

/** Tarihe göre, aynı tarihte kayıt sırasına göre. */
export function sortEntries<T extends Pick<FillUp, 'date' | 'createdAt'>>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.date - b.date || a.createdAt - b.createdAt);
}

/** Kilometresi kendinden önceki kayıttan (hangi yakıt olursa olsun) küçük olan kayıtlar. */
export function backwardIds(entries: readonly FillUp[]): Set<string> {
  const ids = new Set<string>();
  const sorted = sortEntries(entries);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].odometerKm < sorted[i - 1].odometerKm) ids.add(sorted[i].id);
  }
  return ids;
}

export function intervals(entries: readonly FillUp[]): Interval[] {
  const sorted = sortEntries(entries);
  const backward = backwardIds(sorted);
  const result: Interval[] = [];

  // LPG'li araçta her yakıtın kendi tam dolumları arasında ayrı hesap.
  const types = [...new Set(sorted.map((e) => e.fuelType))];
  for (const fuelType of types) {
    let start: FillUp | null = null;
    let amount = 0;
    let cost = 0;
    let broken = false;
    for (const e of sorted) {
      if (e.fuelType !== fuelType) continue;
      // İlk tam dolumdan önceki kısmi dolumlarda depo seviyesi bilinmez; hesaba girmez.
      if (!start) {
        if (e.isFull) start = e;
        continue;
      }
      amount += e.liters;
      cost += e.totalPrice;
      if (backward.has(e.id)) broken = true;
      if (!e.isFull) continue;

      const km = e.odometerKm - start.odometerKm;
      let flag: IntervalFlag | null = broken || km <= 0 ? 'odometer' : null;
      let per100: number | null = null;
      if (!flag) {
        per100 = (amount / km) * 100;
        const [min, max] = PLAUSIBLE[fuelType];
        if (per100 < min || per100 > max) {
          flag = 'outlier';
          per100 = null;
        }
      }
      result.push({ fuelType, fromId: start.id, toId: e.id, km, amount, cost, per100, flag });
      start = e;
      amount = 0;
      cost = 0;
      broken = false;
    }
  }
  return result;
}

export type FuelSummary = {
  /** Geçerli aralıkların toplam litresi / toplam km'si; aralık yoksa null. */
  average: number | null;
  /** En son geçerli aralığın tüketimi. */
  last: number | null;
  validIntervals: number;
  flaggedIntervals: number;
};

export type ConsumptionStats = {
  byFuel: Partial<Record<EntryFuelType, FuelSummary>>;
  /** Bütün yakıtlar toplamında km başına maliyet; hesaplanamıyorsa null. */
  costPerKm: number | null;
  totalCost: number;
  /** Bir kaydın aralıktaki işareti (geçmiş listesinde gösterilir): aralığı kapatan kayda bağlanır. */
  flagsByEntry: Map<string, IntervalFlag>;
  /** Aralığı kapatan kaydın tüketimi (geçmiş listesinde gösterilir). */
  per100ByEntry: Map<string, number>;
};

export function summarize(entries: readonly FillUp[]): ConsumptionStats {
  const list = intervals(entries);
  const byFuel: ConsumptionStats['byFuel'] = {};
  const flagsByEntry = new Map<string, IntervalFlag>();
  const per100ByEntry = new Map<string, number>();

  for (const iv of list) {
    const s = (byFuel[iv.fuelType] ??= { average: null, last: null, validIntervals: 0, flaggedIntervals: 0 });
    if (iv.flag) {
      s.flaggedIntervals++;
      flagsByEntry.set(iv.toId, iv.flag);
    } else if (iv.per100 !== null) {
      s.validIntervals++;
      s.last = iv.per100;
      per100ByEntry.set(iv.toId, iv.per100);
    }
  }
  for (const fuelType of Object.keys(byFuel) as EntryFuelType[]) {
    const valid = list.filter((iv) => iv.fuelType === fuelType && !iv.flag);
    const km = valid.reduce((sum, iv) => sum + iv.km, 0);
    const amount = valid.reduce((sum, iv) => sum + iv.amount, 0);
    byFuel[fuelType]!.average = km > 0 ? (amount / km) * 100 : null;
  }

  // Km başına maliyet: ilk kayıttaki yakıt sonraki yolda harcanır; bu yüzden ilk kaydın tutarı sayılmaz.
  const sorted = sortEntries(entries);
  const totalCost = sorted.reduce((sum, e) => sum + e.totalPrice, 0);
  let costPerKm: number | null = null;
  if (sorted.length >= 2) {
    const km = sorted[sorted.length - 1].odometerKm - sorted[0].odometerKm;
    const spent = totalCost - sorted[0].totalPrice;
    if (km > 0) costPerKm = spent / km;
  }

  return { byFuel, costPerKm, totalCost, flagsByEntry, per100ByEntry };
}
