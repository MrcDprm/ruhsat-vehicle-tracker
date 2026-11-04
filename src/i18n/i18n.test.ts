import { en } from './en';
import { translate } from './index';
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
