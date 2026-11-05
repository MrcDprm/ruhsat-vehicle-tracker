// Geçmiş listesi ve özet için saf yardımcılar; ekran yalnızca çizer.

type Dated = { date: number; totalPrice: number };

export type MonthGroup<T> = {
  /** "2026-11" biçiminde; liste anahtarı. */
  key: string;
  year: number;
  /** 0-11 */
  month: number;
  total: number;
  items: T[];
};

/** Kayıtları yerel saate göre aylara böler; gelen sıra (en yeni başta) korunur. */
export function groupByMonth<T extends Dated>(entries: readonly T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  const byKey = new Map<string, MonthGroup<T>>();
  for (const e of entries) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, year: d.getFullYear(), month: d.getMonth(), total: 0, items: [] };
      byKey.set(key, g);
      groups.push(g);
    }
    g.items.push(e);
    g.total += e.totalPrice;
  }
  return groups;
}

type Sortable = { date: number; createdAt: number };

export type HistoryItem<F, E> =
  | { type: 'fuel'; id: string; date: number; createdAt: number; totalPrice: number; entry: F }
  | { type: 'expense'; id: string; date: number; createdAt: number; totalPrice: number; entry: E };

/** Yakıt ve masraf kayıtlarını tek listede birleştirir: en yeni başta, aynı günde son girilen başta. */
export function mergeHistory<
  F extends Sortable & { id: string; totalPrice: number },
  E extends Sortable & { id: string; amount: number },
>(fuel: readonly F[], expenses: readonly E[]): HistoryItem<F, E>[] {
  const items: HistoryItem<F, E>[] = [
    ...fuel.map((e) => ({
      type: 'fuel' as const,
      id: e.id,
      date: e.date,
      createdAt: e.createdAt,
      totalPrice: e.totalPrice,
      entry: e,
    })),
    ...expenses.map((e) => ({
      type: 'expense' as const,
      id: e.id,
      date: e.date,
      createdAt: e.createdAt,
      totalPrice: e.amount,
      entry: e,
    })),
  ];
  return items.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
}

/** İçinde bulunulan takvim ayındaki toplam harcama. */
export function monthTotal(entries: readonly Dated[], now = Date.now()): number {
  const n = new Date(now);
  return entries
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    })
    .reduce((sum, e) => sum + e.totalPrice, 0);
}
