import { parseNumber } from '@/features/vehicles/validation';

import { entryFuelTypes, neighbors, normalizeDate, toInput, validateFuel, type FuelInput } from './validation';

const NOW = new Date(2026, 10, 5, 18, 30).getTime();
const TODAY = normalizeDate(NOW);
const DAY = 86_400_000;

const valid: FuelInput = {
  date: NOW,
  odometerKm: '87.900',
  liters: '38,42',
  totalPrice: '1.682,41',
  unitPrice: '43,79',
  fuelType: 'petrol',
  isFull: true,
  station: '  Opet   Kadıköy ',
  note: '',
};
const opts = { allowedFuelTypes: ['petrol', 'lpg'] as const, now: NOW };

describe('entryFuelTypes', () => {
  it('hibrit benzine döner, tekrar etmez, sabit sırada', () => {
    expect(entryFuelTypes(['lpg', 'hybrid', 'petrol'])).toEqual(['petrol', 'lpg']);
    expect(entryFuelTypes(['electric'])).toEqual(['electric']);
    expect(entryFuelTypes([])).toEqual([]);
  });
});

describe('normalizeDate', () => {
  it('günün ortasına sabitler', () => {
    const d = new Date(normalizeDate(new Date(2026, 0, 3, 23, 59).getTime()));
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([3, 12, 0]);
  });
});

describe('validateFuel', () => {
  it('geçerli girdiyi sayıya çevirir, metni temizler', () => {
    const r = validateFuel(valid, opts);
    expect(r).toEqual({
      ok: true,
      warnings: [],
      value: {
        date: TODAY,
        odometerKm: 87900,
        liters: 38.42,
        totalPrice: 1682.41,
        unitPrice: 43.79,
        fuelType: 'petrol',
        isFull: true,
        station: 'Opet Kadıköy',
        note: null,
      },
    });
  });

  it('boş alanlar zorunlu hata verir', () => {
    const r = validateFuel({ ...valid, odometerKm: '', liters: '', totalPrice: '', unitPrice: '' }, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toMatchObject({
        odometerKm: 'fuel.error.odometerRequired',
        liters: 'fuel.error.required',
        totalPrice: 'fuel.error.required',
        unitPrice: 'fuel.error.required',
      });
    }
  });

  it('gelecekteki tarih reddedilir, bugünün ileri saati kabul edilir', () => {
    expect(validateFuel({ ...valid, date: NOW + DAY }, opts)).toMatchObject({
      ok: false,
      errors: { date: 'fuel.error.dateFuture' },
    });
    expect(validateFuel({ ...valid, date: TODAY + 11 * 3_600_000 }, opts).ok).toBe(true);
  });

  it.each([
    ['liters', '0', 'fuel.error.amount'],
    ['liters', '-5', 'fuel.error.amount'],
    ['liters', '1001', 'fuel.error.amount'],
    ['liters', 'abc', 'fuel.error.amount'],
    ['unitPrice', '0', 'fuel.error.price'],
    ['totalPrice', '2.000.000', 'fuel.error.price'],
    ['odometerKm', '-1', 'vehicle.error.odometer'],
    ['odometerKm', '1000,5', 'vehicle.error.odometer'],
  ] as const)('%s = %p → %s', (field, raw, error) => {
    const r = validateFuel({ ...valid, totalPrice: '', unitPrice: '', [field]: raw }, opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field]).toBe(error);
  });

  it('elektrikte üst sınır kWh için daha düşük', () => {
    const r = validateFuel(
      { ...valid, fuelType: 'electric', liters: '250', totalPrice: '2500', unitPrice: '10' },
      { ...opts, allowedFuelTypes: ['electric'] },
    );
    expect(r).toMatchObject({ ok: false, errors: { liters: 'fuel.error.amount' } });
  });

  it('araçta olmayan yakıt türü reddedilir', () => {
    expect(validateFuel({ ...valid, fuelType: 'diesel' }, opts)).toMatchObject({
      ok: false,
      errors: { fuelType: 'fuel.error.fuelType' },
    });
    expect(validateFuel({ ...valid, fuelType: null }, opts).ok).toBe(false);
  });

  it('birbirini tutmayan litre × fiyat = tutar reddedilir, kuruş farkı kabul', () => {
    expect(validateFuel({ ...valid, totalPrice: '1.500' }, opts)).toMatchObject({
      ok: false,
      errors: { totalPrice: 'fuel.error.priceMismatch' },
    });
    expect(validateFuel({ ...valid, totalPrice: '1.682,90' }, opts).ok).toBe(true);
  });

  it('çok uzun istasyon ve not', () => {
    const r = validateFuel({ ...valid, station: 'x'.repeat(61), note: 'y'.repeat(201) }, opts);
    expect(r).toMatchObject({ ok: false, errors: { station: 'vehicle.error.tooLong', note: 'vehicle.error.tooLong' } });
  });

  it('km önceki kayıttan küçükse ya da sonrakinden büyükse uyarır ama engellemez', () => {
    const r = validateFuel(valid, { ...opts, previous: { odometerKm: 88_000 }, next: { odometerKm: 87_500 } });
    expect(r).toMatchObject({ ok: true, warnings: ['odometerBelowPrevious', 'odometerAboveNext'] });
  });

  it('önceki kayıtla aynı km uyarı vermez', () => {
    expect(validateFuel(valid, { ...opts, previous: { odometerKm: 87_900 } })).toMatchObject({ warnings: [] });
  });

  it('depo hacmini belirgin aşan benzin dolumu uyarır; LPG ayrı depo olduğu için uyarmaz', () => {
    expect(validateFuel(valid, { ...opts, tankLiters: 30 })).toMatchObject({ warnings: ['overTank'] });
    expect(validateFuel(valid, { ...opts, tankLiters: 36 })).toMatchObject({ warnings: [] });
    expect(validateFuel({ ...valid, fuelType: 'lpg' }, { ...opts, tankLiters: 30 })).toMatchObject({ warnings: [] });
  });
});

describe('toInput', () => {
  it.each([
    [1682.41, 'tr', '1682,41'],
    [1682.41, 'en', '1682.41'],
    [43.8, 'tr', '43,8'],
    [40, 'tr', '40'],
    [22.836, 'en', '22.84'],
  ] as const)('%p (%s) → %p', (n, locale, expected) => expect(toInput(n, locale)).toBe(expected));

  it('formdan geri okunduğunda aynı sayı çıkar', () => {
    expect(parseNumber(toInput(1682.41, 'tr'))).toBe(1682.41);
    expect(parseNumber(toInput(1682.41, 'en'))).toBe(1682.41);
  });
});

describe('neighbors', () => {
  const e = (id: string, day: number, createdAt: number, odometerKm = 0) => ({
    id,
    date: TODAY + day * DAY,
    createdAt,
    odometerKm,
  });
  const list = [e('a', -10, 1), e('b', -5, 2), e('c', -5, 3), e('d', 0, 4)];

  it('yeni kayıt: aynı gündeki kayıtlardan sonra sayılır', () => {
    const r = neighbors(list, TODAY - 5 * DAY);
    expect(r.previous?.id).toBe('c');
    expect(r.next?.id).toBe('d');
  });

  it('düzenlenen kayıt kendini hariç tutar, aynı gündeki sırasını korur', () => {
    const r = neighbors(list, TODAY - 5 * DAY, { id: 'b', createdAt: 2 });
    expect(r.previous?.id).toBe('a');
    expect(r.next?.id).toBe('c');
  });

  it('ilk ve son kayıtta komşu yok', () => {
    expect(neighbors(list, TODAY - 20 * DAY).previous).toBeNull();
    expect(neighbors(list, TODAY + DAY).next).toBeNull();
    expect(neighbors([], TODAY)).toEqual({ previous: null, next: null });
  });
});
