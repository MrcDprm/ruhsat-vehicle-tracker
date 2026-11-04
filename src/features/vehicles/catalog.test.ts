import { CATALOG, MAKES, canonicalMake, fold, suggestMakes, suggestModels, tidyName } from './catalog';

describe('katalog', () => {
  it('her markanın modelleri tekrarsız ve katlanmış hâlde de çakışmıyor', () => {
    for (const make of MAKES) {
      const folded = CATALOG[make].map(fold);
      expect(new Set(folded).size).toBe(folded.length);
    }
    expect(new Set(MAKES.map(fold)).size).toBe(MAKES.length);
  });
});

describe('suggestMakes', () => {
  it('başlangıca göre önerir, büyük/küçük harf ve Türkçe karakter fark etmez', () => {
    expect(suggestMakes('to')).toEqual(['Tofaş', 'Togg', 'Toyota']);
    for (const q of ['cit', 'CIT', 'CİT', 'cıtro', 'citroe']) expect(suggestMakes(q)).toEqual(['Citroën']);
  });
  it('boş ya da tam eşleşmede öneri yok', () => {
    expect(suggestMakes('  ')).toEqual([]);
    expect(suggestMakes('renault')).toEqual([]);
    expect(suggestMakes('CITROEN')).toEqual([]);
  });
  it('en fazla 6 öneri', () => expect(suggestMakes('m').length).toBeLessThanOrEqual(6));
});

describe('suggestModels', () => {
  it('markaya göre süzer', () => {
    expect(suggestModels('renault', 'cl')).toEqual(['Clio']);
    expect(suggestModels('Fiat', 'eg')).toEqual(['Egea', 'Egea Cross']);
    expect(suggestModels('ford', 'tr')).toEqual(['Transit', 'Transit Connect', 'Transit Custom']);
  });
  it('boş sorguda markanın ilk modelleri, bilinmeyen markada hiçbiri', () => {
    expect(suggestModels('Togg', '')).toEqual(['T10F', 'T10X']);
    expect(suggestModels('Anadol', '')).toEqual([]);
    expect(suggestModels('', 'cl')).toEqual([]);
  });
  it('tam eşleşmede öneri yok', () => expect(suggestModels('Honda', 'crv')).toEqual([]));
});

describe('canonicalMake ve tidyName', () => {
  it.each([
    ['vw', 'Volkswagen'],
    ['ALFA', 'Alfa Romeo'],
    ['ssangyong', 'KGM'],
    ['xyz', null],
    ['', null],
  ])('%p → %p', (raw, expected) => expect(canonicalMake(raw)).toBe(expected));
  it('sadece tamamen küçük harfli adı düzeltir', () => {
    expect(tidyName('anadol  böcek')).toBe('Anadol Böcek');
    expect(tidyName('iveco')).toBe('İveco');
    expect(tidyName('McLaren GT')).toBe('McLaren GT');
  });
});
