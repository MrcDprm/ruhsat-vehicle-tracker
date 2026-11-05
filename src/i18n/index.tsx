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

/**
 * Dile göre büyük harf: Türkçede i → İ, ı → I ("Verilerim" → "VERİLERİM").
 * iOS'taki textTransform: 'uppercase' ve JS toUpperCase() dil kuralı uygulamaz, "VERILERIM" yazar.
 * toLocaleUpperCase('tr-TR') da motorun Intl desteğine bağlı olduğu için harfler elle çevrilir.
 */
export function upperCase(text: string, locale: Locale): string {
  return locale === 'tr' ? text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase() : text.toUpperCase();
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
  /** Tutar, ayarlardaki biçimle: "1.682,41 ₺", "₺1.682,41" ya da "1.682,41 TL". Para birimi TL. */
  money: (n: number, fractionDigits?: number) => string;
  currencyFormat: CurrencyFormat;
  setCurrencyFormat: (f: CurrencyFormat) => void;
  /** Yerel biçimde tarih, ör. { day: 'numeric', month: 'short' } → "5 Kas" / "5 Nov". */
  date: (ms: number, options: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

/** Para birimi biçimi (Ayarlar): sembol sonda, sembol başta ya da TL kısaltması. */
export const CURRENCY_FORMATS = ['symbolAfter', 'symbolBefore', 'code'] as const;
export type CurrencyFormat = (typeof CURRENCY_FORMATS)[number];
const CURRENCY_KEY = 'pref.currency';

export function formatMoney(formatted: string, format: CurrencyFormat): string {
  if (format === 'symbolBefore') return formatted.startsWith('-') ? `-₺${formatted.slice(1)}` : `₺${formatted}`;
  return `${formatted} ${format === 'code' ? 'TL' : '₺'}`;
}

/** React dışındaki kod için (widget metni) geçerli para birimi biçimi. */
export function currentCurrencyFormat(): CurrencyFormat {
  return readCurrency();
}

function readCurrency(): CurrencyFormat {
  const v = Storage.getItemSync(CURRENCY_KEY);
  return CURRENCY_FORMATS.includes(v as CurrencyFormat) ? (v as CurrencyFormat) : 'symbolAfter';
}

function readPreference(): LocalePreference {
  const v = Storage.getItemSync(KEY);
  return v === 'tr' || v === 'en' ? v : 'system';
}

/** React dışındaki kod için (bildirim metinleri) geçerli dil. */
export function currentLocale(): Locale {
  const p = readPreference();
  return p === 'system' ? systemLocale() : p;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<LocalePreference>(readPreference);
  const [currencyFormat, setCurrency] = useState<CurrencyFormat>(readCurrency);
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
      money: (n, fractionDigits = 2) => formatMoney(number(n, fractionDigits), currencyFormat),
      currencyFormat,
      setCurrencyFormat: (f) => {
        Storage.setItemSync(CURRENCY_KEY, f);
        setCurrency(f);
      },
      date: (ms, options) => new Intl.DateTimeFormat(tag, options).format(new Date(ms)),
    };
  }, [locale, preference, currencyFormat]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Sağlayıcı dışında da çalışır (ör. göç hatası ekranı): o zaman kayıtlı tercihten okunur. */
export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? currentLocale();
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n I18nProvider dışında kullanıldı');
  return v;
}
