import { derive, derivedField, touch } from './price';

describe('derivedField', () => {
  it('hiç dokunulmamışsa tutar türetilir', () => expect(derivedField([])).toBe('total'));
  it('litre ve birim fiyat girilince tutar', () => expect(derivedField(['unit', 'liters'])).toBe('total'));
  it('litre ve tutar girilince birim fiyat', () => expect(derivedField(['liters', 'total'])).toBe('unit'));
  it('tutar ve birim fiyat girilince litre', () => expect(derivedField(['total', 'unit'])).toBe('liters'));
  it('yalnız son iki dokunuş sayılır', () => expect(derivedField(['total', 'unit', 'liters'])).toBe('liters'));
  it('düzenlemede yalnız litre değişince tutar yenilenir', () => expect(derivedField(['liters'])).toBe('total'));
  it('ilk dokunulan tutarsa birim fiyat türetilir', () => expect(derivedField(['total'])).toBe('unit'));
});

describe('touch', () => {
  it('alanı başa alır, tekrar etmez', () => {
    expect(touch(['unit', 'liters'], 'liters')).toEqual(['liters', 'unit']);
    expect(touch([], 'total')).toEqual(['total']);
  });
});

describe('derive', () => {
  it('litre × birim fiyat = tutar (kuruşa yuvarlı)', () => {
    expect(derive({ liters: 38.42, total: null, unit: 43.79 }, ['unit', 'liters'])).toEqual({
      field: 'total',
      value: 1682.41,
    });
  });

  it('tutar / litre = birim fiyat', () => {
    expect(derive({ liters: 40, total: 1751.6, unit: null }, ['total', 'liters'])).toEqual({
      field: 'unit',
      value: 43.79,
    });
  });

  it('tutar / birim fiyat = litre', () => {
    expect(derive({ liters: null, total: 1000, unit: 43.79 }, ['unit', 'total'])).toEqual({
      field: 'liters',
      value: 22.84,
    });
  });

  it.each([
    [{ liters: null, total: null, unit: 43 }],
    [{ liters: 0, total: null, unit: 43 }],
    [{ liters: -5, total: null, unit: 43 }],
    [{ liters: Number.NaN, total: null, unit: 43 }],
  ])('eksik, sıfır, negatif ya da geçersiz girdide hesaplamaz: %p', (values) => {
    expect(derive(values, ['unit', 'liters'])).toBeNull();
  });
});
