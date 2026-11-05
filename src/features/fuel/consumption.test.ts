import { backwardIds, intervals, sortEntries, summarize, type FillUp } from './consumption';

const DAY = 86_400_000;
let seq = 0;

// Kısa yazım: f(gün, km, litre, tam mı, yakıt, tutar)
function f(
  day: number,
  km: number,
  liters: number,
  isFull = true,
  fuelType: FillUp['fuelType'] = 'petrol',
  total?: number,
): FillUp {
  seq++;
  return {
    id: `e${seq}`,
    date: day * DAY,
    createdAt: seq,
    odometerKm: km,
    liters,
    totalPrice: total ?? liters * 40,
    fuelType,
    isFull,
  };
}

beforeEach(() => {
  seq = 0;
});

describe('sortEntries', () => {
  it('tarihe, aynı günde kayıt sırasına göre dizer', () => {
    const a = f(2, 1000, 10);
    const b = f(1, 900, 10);
    const c = { ...f(1, 950, 10), createdAt: 0 };
    expect(sortEntries([a, b, c]).map((e) => e.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe('intervals', () => {
  it('boş listede ve tek kayıtta aralık yok', () => {
    expect(intervals([])).toEqual([]);
    expect(intervals([f(1, 1000, 40)])).toEqual([]);
  });

  it('iki tam dolum: sonraki dolumun litresi / aradaki km', () => {
    const [iv] = intervals([f(1, 10_000, 40), f(5, 10_600, 36)]);
    expect(iv.km).toBe(600);
    expect(iv.amount).toBe(36);
    expect(iv.per100).toBeCloseTo(6);
    expect(iv.flag).toBeNull();
  });

  it('kısmi dolumlar sonraki tam dolumda hesaba girer', () => {
    const list = [f(1, 10_000, 40), f(3, 10_300, 15, false), f(6, 10_800, 33)];
    const [iv] = intervals(list);
    expect(iv.km).toBe(800);
    expect(iv.amount).toBe(48);
    expect(iv.per100).toBeCloseTo(6);
    expect(iv.fromId).toBe(list[0].id);
    expect(iv.toId).toBe(list[2].id);
  });

  it('ilk tam dolumdan önceki kısmi dolumlar sayılmaz', () => {
    const list = [f(1, 9_800, 20, false), f(2, 10_000, 40), f(5, 10_500, 30)];
    const ivs = intervals(list);
    expect(ivs).toHaveLength(1);
    expect(ivs[0].amount).toBe(30);
  });

  it('sonda kapanmamış kısmi dolum aralık üretmez', () => {
    expect(intervals([f(1, 10_000, 40), f(3, 10_300, 15, false)])).toEqual([]);
  });

  it('kayıtlar karışık sırada girilse de tarihe göre hesaplar', () => {
    const a = f(1, 10_000, 40);
    const b = f(5, 10_600, 36);
    expect(intervals([b, a])[0].per100).toBeCloseTo(6);
  });

  it('km geriye giden kayıt aralığı işaretler, ortalamaya katmaz', () => {
    const list = [f(1, 10_000, 40), f(3, 9_900, 10, false), f(6, 10_600, 30)];
    const [iv] = intervals(list);
    expect(iv.flag).toBe('odometer');
    expect(iv.per100).toBeNull();
  });

  it('aynı km ile iki tam dolum (sıfır km) işaretlenir, sıfıra bölme olmaz', () => {
    const [iv] = intervals([f(1, 10_000, 40), f(1, 10_000, 5)]);
    expect(iv.flag).toBe('odometer');
    expect(iv.per100).toBeNull();
  });

  it('arada dolum unutulunca çıkan olanaksız düşük tüketim işaretlenir', () => {
    // 1.500 km'de 20 litre = 1,3 L/100 km: arada kaydedilmemiş bir dolum var.
    const [iv] = intervals([f(1, 10_000, 40), f(10, 11_500, 20)]);
    expect(iv.flag).toBe('outlier');
    expect(iv.per100).toBeNull();
  });

  it('"tam" işareti unutulunca çıkan olanaksız yüksek tüketim işaretlenir', () => {
    const [iv] = intervals([f(1, 10_000, 40), f(2, 10_050, 40)]);
    expect(iv.flag).toBe('outlier');
  });

  it('işaretli aralıktan sonraki aralık yeniden doğru hesaplanır', () => {
    const list = [f(1, 10_000, 40), f(3, 9_900, 40), f(6, 10_500, 36)];
    const ivs = intervals(list);
    expect(ivs[0].flag).toBe('odometer');
    expect(ivs[1].flag).toBeNull();
    expect(ivs[1].per100).toBeCloseTo(6);
  });

  it("LPG'li araçta her yakıt kendi tam dolumları arasında ayrı hesaplanır", () => {
    const list = [
      f(1, 10_000, 40, true, 'lpg', 800),
      f(2, 10_050, 30, true, 'petrol'),
      f(5, 10_400, 36, true, 'lpg', 720),
      f(9, 10_900, 50, true, 'lpg', 1000),
    ];
    const ivs = intervals(list);
    expect(ivs).toHaveLength(2);
    expect(ivs.every((iv) => iv.fuelType === 'lpg')).toBe(true);
    expect(ivs[0].per100).toBeCloseTo(9);
    expect(ivs[1].per100).toBeCloseTo(10);
  });

  it('elektrikte kWh/100 km kendi sınırlarıyla hesaplanır', () => {
    const [iv] = intervals([f(1, 10_000, 50, true, 'electric'), f(4, 10_300, 54, true, 'electric')]);
    expect(iv.per100).toBeCloseTo(18);
  });
});

describe('backwardIds', () => {
  it('yakıt türünden bağımsız olarak bir önceki kayda göre bakar', () => {
    const list = [f(1, 10_000, 40, true, 'lpg'), f(2, 9_990, 20, true, 'petrol'), f(3, 10_100, 20, true, 'lpg')];
    expect([...backwardIds(list)]).toEqual([list[1].id]);
  });
});

describe('summarize', () => {
  it('boş listede her şey boş, maliyet sıfır', () => {
    const s = summarize([]);
    expect(s.byFuel).toEqual({});
    expect(s.costPerKm).toBeNull();
    expect(s.totalCost).toBe(0);
  });

  it('ortalama: geçerli aralıkların toplam litresi / toplam km (aralık ortalamalarının ortalaması değil)', () => {
    // 500 km'de 30 L (6) ve 1.000 km'de 80 L (8): doğru ortalama 110/1500 = 7,33; yanlış olan (6+8)/2 = 7.
    const s = summarize([f(1, 10_000, 40), f(4, 10_500, 30), f(10, 11_500, 80)]);
    expect(s.byFuel.petrol!.average).toBeCloseTo(7.333, 2);
    expect(s.byFuel.petrol!.last).toBeCloseTo(8);
    expect(s.byFuel.petrol!.validIntervals).toBe(2);
  });

  it('işaretli aralık ortalamayı bozmaz ve kayda bağlanır', () => {
    const list = [f(1, 10_000, 40), f(4, 10_500, 30), f(10, 12_500, 20), f(14, 13_000, 35)];
    const s = summarize(list);
    expect(s.byFuel.petrol!.flaggedIntervals).toBe(1);
    expect(s.flagsByEntry.get(list[2].id)).toBe('outlier');
    expect(s.byFuel.petrol!.average).toBeCloseTo(6.5);
    expect(s.per100ByEntry.get(list[3].id)).toBeCloseTo(7);
  });

  it('yalnız işaretli aralık varsa ortalama null', () => {
    const s = summarize([f(1, 10_000, 40), f(2, 9_000, 30)]);
    expect(s.byFuel.petrol!.average).toBeNull();
  });

  it('km başına maliyet bütün yakıtlarda, ilk dolumun tutarı hariç', () => {
    const s = summarize([
      f(1, 10_000, 40, true, 'petrol', 1600),
      f(2, 10_200, 20, true, 'lpg', 400),
      f(5, 10_500, 30, true, 'petrol', 1200),
    ]);
    expect(s.totalCost).toBe(3200);
    expect(s.costPerKm).toBeCloseTo(1600 / 500);
  });

  it('tek kayıtta km başına maliyet hesaplanmaz', () => {
    expect(summarize([f(1, 10_000, 40)]).costPerKm).toBeNull();
  });
});
