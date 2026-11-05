import { en, enSingular } from './en';
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

  it('İngilizcede sayı 1 ise tekil biçim, değilse çoğul', () => {
    expect(translate('en', 'summary.vehicleCount', { count: 1 })).toBe('1 vehicle');
    expect(translate('en', 'summary.vehicleCount', { count: 2 })).toBe('2 vehicles');
    expect(translate('en', 'summary.vehicleCount', { count: 0 })).toBe('0 vehicles');
    expect(translate('en', 'reminder.days', { count: '1' })).toBe('1 day');
    expect(translate('en', 'reminder.overdueDays', { count: 1 })).toBe('1 day late');
    expect(translate('en', 'notify.daysLeft', { count: 1, name: 'Inspection', date: '18 Nov' })).toBe(
      '1 day left for Inspection (18 Nov).',
    );
    expect(translate('en', 'widget.days', { count: 1 })).toBe('%d day');
    // Sayı dışındaki parametre 1 olsa da tekile geçmez.
    expect(translate('en', 'reminder.atKm', { km: 1 })).toBe('at 1 km');
  });

  it('Türkçede sayı 1 olsa da metin değişmez', () => {
    expect(translate('tr', 'summary.vehicleCount', { count: 1 })).toBe('1 araç');
    expect(translate('tr', 'reminder.days', { count: 1 })).toBe('1 gün');
  });

  it.each(Object.entries(enSingular))('%s: tekil biçimin yer tutucuları çoğuluyla aynı', (key, text) => {
    expect(placeholders(text ?? '')).toEqual(placeholders(en[key as keyof typeof en]));
    expect(text?.includes('%d')).toBe(en[key as keyof typeof en].includes('%d'));
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
