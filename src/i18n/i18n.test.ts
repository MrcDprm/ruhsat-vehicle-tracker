import { en } from './en';
import { formatMoney, translate, upperCase } from './index';
import { tr } from './tr';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'tr' }] }));
jest.mock('expo-sqlite/kv-store', () => ({ getItemSync: () => null, setItemSync: () => {} }));

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('çeviriler', () => {
  it('iki dilde aynı anahtarlar var', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort());
  });

  it.each(Object.keys(tr) as (keyof typeof tr)[])('%s: yer tutucular aynı, metin boş değil', (key) => {
    expect(placeholders(en[key])).toEqual(placeholders(tr[key]));
    expect(en[key].trim()).not.toBe('');
  });

  it('yer tutucuyu doldurur, eksik parametreyi olduğu gibi bırakır', () => {
    expect(translate('tr', 'summary.vehicleCount', { count: 2 })).toBe('2 araç');
    expect(translate('en', 'vehicle.deleteText', {})).toBe('{name} and all its records will be deleted.');
  });
});

describe('formatMoney', () => {
  it('üç biçim; eksi işareti sembolün önünde', () => {
    expect(formatMoney('1.682,41', 'symbolAfter')).toBe('1.682,41 ₺');
    expect(formatMoney('1.682,41', 'symbolBefore')).toBe('₺1.682,41');
    expect(formatMoney('1.682,41', 'code')).toBe('1.682,41 TL');
    expect(formatMoney('-250', 'symbolBefore')).toBe('-₺250');
  });
});

describe('upperCase', () => {
  it('Türkçede i → İ, ı → I', () => {
    expect(upperCase('Verilerim', 'tr')).toBe('VERİLERİM');
    expect(upperCase('Son tüketim', 'tr')).toBe('SON TÜKETİM');
    expect(upperCase('Sıradaki ışık', 'tr')).toBe('SIRADAKİ IŞIK');
    expect(upperCase('çöğüş', 'tr')).toBe('ÇÖĞÜŞ');
  });

  it('İngilizcede i → I', () => {
    expect(upperCase('This month', 'en')).toBe('THIS MONTH');
  });

  it('boş metin ve zaten büyük harf', () => {
    expect(upperCase('', 'tr')).toBe('');
    expect(upperCase('MTV İLE', 'tr')).toBe('MTV İLE');
  });
});
