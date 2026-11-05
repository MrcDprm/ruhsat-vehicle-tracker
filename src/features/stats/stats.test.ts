import { consumptionSeries, monthlySpend, rangeEnd, rangeStart, summarizeRange, yearlyTotals } from './stats';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const day = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const NOW = D(2026, 11, 5);

let seq = 0;
const fuel = (
  date: number,
  km: number,
  liters: number,
  totalPrice: number,
  isFull = true,
  fuelType: 'petrol' | 'lpg' = 'petrol',
) => ({
  id: `f${++seq}`,
  date,
  createdAt: seq,
  odometerKm: km,
  liters,
  totalPrice,
  fuelType,
  isFull,
});
const expense = (
  date: number,
  category: Parameters<typeof monthlySpend>[1][number]['category'],
  amount: number,
  odometerKm: number | null = null,
) => ({
  date,
  category,
  amount,
  odometerKm,
});

describe('rangeStart', () => {
  it.each([
    ['3m', '2026-9-1'],
    ['6m', '2026-6-1'],
    ['12m', '2025-12-1'],
    ['year', '2026-1-1'],
  ] as const)('%s → %s (bu ay dahil, ayın ilk günü)', (range, expected) => {
    expect(day(rangeStart(range, NOW, null))).toBe(expected);
  });

  it('tümü: en eski kaydın ayı; kayıt yoksa bu ay', () => {
    expect(day(rangeStart('all', NOW, D(2024, 3, 17)))).toBe('2024-3-1');
    expect(day(rangeStart('all', NOW, null))).toBe('2026-11-1');
  });

  it('yıl başı sınırında 3 ay önceki yıla taşar', () => {
    expect(day(rangeStart('3m', D(2027, 1, 10), null))).toBe('2026-11-1');
  });
});

describe('monthlySpend', () => {
  const from = rangeStart('3m', NOW, null);

  it('her ay bir çubuk, boş aylar sıfır; gruplar ayrı', () => {
    const bars = monthlySpend(
      [fuel(D(2026, 9, 3), 10_000, 40, 1600), fuel(D(2026, 11, 2), 11_000, 35, 1500)],
      [
        expense(D(2026, 9, 20), 'service', 3000),
        expense(D(2026, 11, 1), 'road_tax', 2500),
        expense(D(2026, 11, 3), 'wash', 200),
      ],
      from,
      NOW,
    );
    expect(bars.map((b) => [b.key, b.total])).toEqual([
      ['2026-09', 4600],
      ['2026-10', 0],
      ['2026-11', 4200],
    ]);
    expect(bars[0].groups).toEqual({ fuel: 1600, maintenance: 3000, insurance_tax: 0, other: 0 });
    expect(bars[2].groups).toEqual({ fuel: 1500, maintenance: 0, insurance_tax: 2500, other: 200 });
  });

  it('aralık dışındaki kayıt sayılmaz', () => {
    const bars = monthlySpend([fuel(D(2026, 8, 31), 10_000, 40, 1600)], [], from, NOW);
    expect(bars.every((b) => b.total === 0)).toBe(true);
  });

  it('yıl geçişinde aylar doğru sırada', () => {
    const bars = monthlySpend([], [], D(2025, 11, 1), D(2026, 2, 10));
    expect(bars.map((b) => b.key)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('rangeEnd', () => {
  it('bugünün son anı: öğleye yazılan bugünkü kayıt sabah da aralıkta', () => {
    const morning = new Date(2026, 10, 5, 8, 30).getTime();
    const end = rangeEnd(morning);
    expect(end).toBe(new Date(2026, 10, 6).getTime() - 1);
    // Uygulama bugünkü kaydı öğleye yazar (normalizeDate); bitiş "şimdi" olsaydı öğleye kadar sayılmazdı.
    const today = fuel(D(2026, 11, 5), 10_000, 40, 2000);
    const from = rangeStart('3m', morning, null);
    expect(summarizeRange([today], [], from, end).total).toBe(2000);
    expect(summarizeRange([today], [], from, morning).total).toBe(0);
    expect(monthlySpend([today], [], from, end).at(-1)?.total).toBe(2000);
  });

  it('yarının kaydı aralık dışında kalır', () => {
    const tomorrow = fuel(D(2026, 11, 6), 10_000, 40, 2000);
    expect(summarizeRange([tomorrow], [], rangeStart('3m', NOW, null), rangeEnd(NOW)).total).toBe(0);
  });
});

describe('summarizeRange', () => {
  const from = rangeStart('3m', NOW, null);

  it('toplam, aylık ortalama, türe göre sıralı, km ve km başına maliyet', () => {
    const s = summarizeRange(
      [fuel(D(2026, 9, 3), 10_000, 40, 1600), fuel(D(2026, 10, 15), 10_600, 36, 1500)],
      [expense(D(2026, 10, 1), 'service', 3000, 10_300), expense(D(2026, 11, 1), 'parking_toll', 100)],
      from,
      NOW,
    );
    expect(s.total).toBe(6200);
    expect(s.months).toBe(3);
    expect(s.monthlyAverage).toBeCloseTo(6200 / 3);
    expect(s.byCategory).toEqual([
      { category: 'fuel', amount: 3100 },
      { category: 'service', amount: 3000 },
      { category: 'parking_toll', amount: 100 },
    ]);
    expect(s.byGroup).toEqual({ fuel: 3100, maintenance: 3000, insurance_tax: 0, other: 100 });
    expect(s.km).toBe(600);
    expect(s.costPerKm).toBeCloseTo(6200 / 600);
  });

  it('boş aralık: sıfır toplam, km ve km başına maliyet yok', () => {
    const s = summarizeRange([], [], from, NOW);
    expect(s).toMatchObject({ total: 0, km: null, costPerKm: null, byCategory: [], monthlyAverage: 0 });
  });

  it('tek km okuması ya da geriye giden km ile km başına maliyet hesaplanmaz', () => {
    expect(summarizeRange([fuel(D(2026, 10, 1), 10_000, 40, 1600)], [], from, NOW).costPerKm).toBeNull();
    const back = summarizeRange(
      [fuel(D(2026, 10, 1), 10_000, 40, 1600), fuel(D(2026, 10, 20), 9_000, 30, 1200)],
      [],
      from,
      NOW,
    );
    expect(back.km).toBeNull();
  });
});

describe('yearlyTotals', () => {
  it('yıl yıl, en yeni başta; aralıktan bağımsız', () => {
    expect(
      yearlyTotals(
        [fuel(D(2025, 5, 1), 1, 1, 1000), fuel(D(2026, 2, 1), 2, 1, 2000)],
        [expense(D(2025, 12, 31), 'casco', 9000)],
      ),
    ).toEqual([
      { year: 2026, total: 2000 },
      { year: 2025, total: 10_000 },
    ]);
  });
});

describe('consumptionSeries', () => {
  it('aralıkta kapanan geçerli tam dolum aralıkları; başlangıç dolumu aralık dışında olabilir', () => {
    const list = [
      fuel(D(2026, 7, 1), 10_000, 40, 1600),
      fuel(D(2026, 9, 10), 10_500, 30, 1200),
      fuel(D(2026, 10, 1), 10_700, 10, 400, false),
      fuel(D(2026, 10, 20), 11_000, 20, 800),
    ];
    const pts = consumptionSeries(list, rangeStart('3m', NOW, null), NOW);
    expect(pts.map((p) => [day(p.date), Math.round(p.per100 * 10) / 10])).toEqual([
      ['2026-9-10', 6],
      ['2026-10-20', 6],
    ]);
  });

  it('işaretli aralık noktaya dönüşmez', () => {
    const list = [fuel(D(2026, 10, 1), 10_000, 40, 1600), fuel(D(2026, 10, 20), 9_000, 30, 1200)];
    expect(consumptionSeries(list, rangeStart('3m', NOW, null), NOW)).toEqual([]);
  });
});
