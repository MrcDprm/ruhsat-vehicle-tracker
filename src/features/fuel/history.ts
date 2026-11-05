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
