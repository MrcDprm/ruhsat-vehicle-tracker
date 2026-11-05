import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { en } from './en';
import { tr } from './tr';

export type Locale = 'tr' | 'en';
export type LocalePreference = 'system' | Locale;
export type MessageKey = keyof typeof tr;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { tr, en };
const KEY = 'pref.locale';

/** "{count} araç" gibi yer tutucuları doldurur; bilinmeyen anahtar geliştirmede göze çarpsın diye aynen döner. */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const template = dictionaries[locale][key as MessageKey] ?? key;
  return params
    ? template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m))
    : template;
}

export function systemLocale(): Locale {
  return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
}

type I18nValue = {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (p: LocalePreference) => void;
  t: (key: MessageKey | (string & {}), params?: Record<string, string | number>) => string;
  /** Yerel biçimde sayı: tr "87.421" / "6,4", en "87,421" / "6.4". */
  number: (n: number, fractionDigits?: number) => string;
  /** Tutar: tr "1.682,41 ₺", en "1,682.41 ₺". Para birimi şimdilik TL. */
  money: (n: number, fractionDigits?: number) => string;
  /** Yerel biçimde tarih, ör. { day: 'numeric', month: 'short' } → "5 Kas" / "5 Nov". */
  date: (ms: number, options: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function readPreference(): LocalePreference {
  const v = Storage.getItemSync(KEY);
  return v === 'tr' || v === 'en' ? v : 'system';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<LocalePreference>(readPreference);
  const locale = preference === 'system' ? systemLocale() : preference;

  const value = useMemo<I18nValue>(() => {
    const tag = locale === 'tr' ? 'tr-TR' : 'en-GB';
    const number = (n: number, fractionDigits = 0) =>
      new Intl.NumberFormat(tag, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(n);
    return {
      locale,
      preference,
      setPreference: (p) => {
        Storage.setItemSync(KEY, p);
        setPref(p);
      },
      t: (key, params) => translate(locale, key, params),
      number,
      money: (n, fractionDigits = 2) => `${number(n, fractionDigits)} ₺`,
      date: (ms, options) => new Intl.DateTimeFormat(tag, options).format(new Date(ms)),
    };
  }, [locale, preference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n I18nProvider dışında kullanıldı');
  return v;
}
