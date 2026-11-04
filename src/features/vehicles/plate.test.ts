import { checkTurkishPlate, isTurkishPlate, maskForeignPlate, maskTurkishPlate, plateKey } from './plate';

describe('maskTurkishPlate', () => {
  it.each([
    ['34abc123', '34 ABC 123'],
    ['34 a 12345', '34 A 12345'],
    ['06ab1234', '06 AB 1234'],
    ['34ABC1234', '34 ABC 123'], // 3 harfte en fazla 3 rakam
    ['34AB12345', '34 AB 1234'], // 2 harfte en fazla 4 rakam
    ['34A123456', '34 A 12345'], // 1 harfte en fazla 5 rakam
    ['34ABCD12', '34 ABC 12'], // en fazla 3 harf
    ['34ı1234', '34 I 1234'], // Türkçe klavye
    ['34QWX ÇŞ A12', '34 A 12'], // kullanılmayan harfler alınmaz
    ['A34', '34'], // il kodundan önce harf olmaz
    ['34', '34'],
    ['3', '3'],
    ['34A1B2', '34 A 12'], // rakamlar başladıktan sonra harf alınmaz
    ['', ''],
  ])('%p → %p', (raw, expected) => expect(maskTurkishPlate(raw)).toBe(expected));
});

describe('checkTurkishPlate', () => {
  it.each(['34 A 1234', '34 A 12345', '34 AB 123', '34 AB 1234', '34 ABC 12', '34 ABC 123', '01 R 1000', '81 Z 9999'])(
    '%p geçerli',
    (p) => expect(checkTurkishPlate(p)).toBeNull(),
  );
  it.each([
    ['00 A 1234', 'province'],
    ['82 A 1234', 'province'],
    ['34 A 123', 'format'], // 1 harfte en az 4 rakam
    ['34 AB 12', 'format'], // 2 harfte en az 3 rakam
    ['34 ABC 1', 'format'],
    ['34 ABC', 'format'],
    ['34', 'format'],
  ])('%p → %p', (p, problem) => expect(checkTurkishPlate(p)).toBe(problem));
});

describe('yurt dışı plakası ve yardımcılar', () => {
  it('serbest ama sınırlı', () => {
    expect(maskForeignPlate('b-mw.1234!')).toBe('B MW 1234');
    expect(maskForeignPlate('a'.repeat(20))).toHaveLength(12);
  });
  it('Türk plakası tanınır', () => {
    expect(isTurkishPlate('34 ABC 123')).toBe(true);
    expect(isTurkishPlate('B MW 1234')).toBe(false);
    expect(isTurkishPlate('34 AB 12')).toBe(false);
  });
  it('boşluk ve harf büyüklüğü karşılaştırmada önemsiz', () =>
    expect(plateKey('34abc 123')).toBe(plateKey('34 ABC 123')));
});
