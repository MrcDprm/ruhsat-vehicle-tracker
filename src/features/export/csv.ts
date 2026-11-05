import type { Expense, FuelEntry, Vehicle } from '@/db/schema';

// CSV dışa aktarma: saf fonksiyonlar. Excel'de Türkçe karakterler doğru açılsın diye dosya UTF-8 BOM ile başlar.
// Türkçe Excel ondalık virgül kullandığı için Türkçede ayırıcı noktalı virgül, sayılar virgüllü; İngilizcede virgül ve nokta.

export type CsvLocale = 'tr' | 'en';
type Cell = string | number | null;

export const BOM = '﻿';
const separator = (locale: CsvLocale) => (locale === 'tr' ? ';' : ',');

/**
 * Tek hücre. Sayı binlik ayırıcısız yazılır (Excel sayı olarak okusun). Metin = + - @ sekme ya da satır başıyla
 * başlıyorsa önüne ' konur: kullanıcının notu Excel'de formül olarak çalışmasın (CSV/formül enjeksiyonu).
 */
export function csvCell(value: Cell, locale: CsvLocale): string {
  if (value === null) return '';
  if (typeof value === 'number') {
    const s = String(Math.round(value * 100) / 100);
    return locale === 'tr' ? s.replace('.', ',') : s;
  }
  let s = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (s.includes(separator(locale)) || /["\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[], locale: CsvLocale): string {
  const sep = separator(locale);
  const line = (cells: readonly Cell[]) => cells.map((c) => csvCell(c, locale)).join(sep);
  return BOM + [line(header), ...rows.map(line)].join('\r\n') + '\r\n';
}

/** Yerel tarih, Excel'in her dilde tarih olarak tanıdığı biçimde: 2026-11-05. */
export function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type T = (key: string) => string;
const vehicleName = (vehicles: readonly Pick<Vehicle, 'id' | 'name'>[], id: string) =>
  vehicles.find((v) => v.id === id)?.name ?? '';
const byDate = <E extends { vehicleId: string; date: number; createdAt: number }>(list: readonly E[]) =>
  [...list].sort((a, b) => a.vehicleId.localeCompare(b.vehicleId) || a.date - b.date || a.createdAt - b.createdAt);

export function fuelCsv(
  vehicles: readonly Pick<Vehicle, 'id' | 'name'>[],
  entries: readonly FuelEntry[],
  t: T,
  locale: CsvLocale,
): string {
  const header = [
    t('csv.vehicle'),
    t('csv.date'),
    t('csv.km'),
    t('csv.fuelType'),
    t('csv.amount'),
    t('csv.unit'),
    t('csv.unitPrice'),
    t('csv.total'),
    t('csv.full'),
    t('csv.station'),
    t('csv.note'),
  ];
  const rows = byDate(entries).map((e) => [
    vehicleName(vehicles, e.vehicleId),
    isoDate(e.date),
    e.odometerKm,
    t(`fuel.${e.fuelType}`),
    e.liters,
    e.fuelType === 'electric' ? 'kWh' : 'L',
    e.unitPrice,
    e.totalPrice,
    t(e.isFull ? 'csv.yes' : 'csv.no'),
    e.station,
    e.note,
  ]);
  return toCsv(header, rows, locale);
}

export function expenseCsv(
  vehicles: readonly Pick<Vehicle, 'id' | 'name'>[],
  entries: readonly Expense[],
  t: T,
  locale: CsvLocale,
): string {
  const header = [
    t('csv.vehicle'),
    t('csv.date'),
    t('csv.km'),
    t('csv.category'),
    t('csv.items'),
    t('csv.total'),
    t('csv.note'),
  ];
  const rows = byDate(entries).map((e) => [
    vehicleName(vehicles, e.vehicleId),
    isoDate(e.date),
    e.odometerKm,
    t(`expense.category.${e.category}`),
    (e.subtypes ?? []).map((s) => t(`expense.subtype.${s}`)).join(', ') || null,
    e.amount,
    e.note,
  ]);
  return toCsv(header, rows, locale);
}
