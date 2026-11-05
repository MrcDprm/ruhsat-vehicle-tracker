import { groupByMonth, mergeHistory, monthTotal } from './history';

const at = (y: number, m: number, d: number, totalPrice = 100) => ({
  date: new Date(y, m, d, 12).getTime(),
  totalPrice,
});

describe('groupByMonth', () => {
  it('boş listede grup yok', () => expect(groupByMonth([])).toEqual([]));

  it('aylara böler, sırayı korur, ay toplamını hesaplar', () => {
    const list = [at(2026, 10, 5, 1500), at(2026, 10, 1, 800), at(2026, 9, 28, 1200), at(2025, 10, 3, 900)];
    const groups = groupByMonth(list);
    expect(groups.map((g) => [g.key, g.total, g.items.length])).toEqual([
      ['2026-11', 2300, 2],
      ['2026-10', 1200, 1],
      ['2025-11', 900, 1],
    ]);
    expect(groups[0].items[0]).toBe(list[0]);
    expect([groups[2].year, groups[2].month]).toEqual([2025, 10]);
  });

  it('ay sınırında yerel saate göre ayırır', () => {
    const lastMinute = { date: new Date(2026, 9, 31, 23, 59).getTime(), totalPrice: 1 };
    const firstMinute = { date: new Date(2026, 10, 1, 0, 1).getTime(), totalPrice: 1 };
    expect(groupByMonth([firstMinute, lastMinute]).map((g) => g.key)).toEqual(['2026-11', '2026-10']);
  });
});

describe('mergeHistory', () => {
  it('yakıt ve masrafı tarihe, aynı günde giriş sırasına göre (yeni başta) birleştirir', () => {
    const fuel = [
      { id: 'f1', date: at(2026, 10, 5).date, createdAt: 1, totalPrice: 1500 },
      { id: 'f2', date: at(2026, 10, 1).date, createdAt: 2, totalPrice: 800 },
    ];
    const expenses = [
      { id: 'x1', date: at(2026, 10, 5).date, createdAt: 3, amount: 250 },
      { id: 'x2', date: at(2026, 9, 20).date, createdAt: 4, amount: 3000 },
    ];
    const merged = mergeHistory(fuel, expenses);
    expect(merged.map((i) => [i.type, i.id, i.totalPrice])).toEqual([
      ['expense', 'x1', 250],
      ['fuel', 'f1', 1500],
      ['fuel', 'f2', 800],
      ['expense', 'x2', 3000],
    ]);
    expect(groupByMonth(merged).map((g) => [g.key, g.total])).toEqual([
      ['2026-11', 2550],
      ['2026-10', 3000],
    ]);
  });

  it('boş listeler', () => expect(mergeHistory([], [])).toEqual([]));
});

describe('monthTotal', () => {
  const now = new Date(2026, 10, 15).getTime();

  it('yalnız bu takvim ayını toplar (geçen yılın aynı ayı hariç)', () => {
    expect(monthTotal([at(2026, 10, 1, 500), at(2026, 10, 14, 250), at(2026, 9, 30), at(2025, 10, 10)], now)).toBe(750);
  });

  it('kayıt yoksa sıfır', () => expect(monthTotal([], now)).toBe(0));
});
