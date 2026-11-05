import { ENTRY_FUEL_TYPES, type EntryFuelType, type FuelType } from '@/db/schema';
import { LIMITS as VEHICLE_LIMITS, parseNumber } from '@/features/vehicles/validation';

import { sortEntries } from './consumption';

// Formdan gelen ham değerler. Tarih seçiciden geldiği için sayı (epoch ms); diğerleri metin.
export type FuelInput = {
  date: number;
  odometerKm: string;
  liters: string;
  totalPrice: string;
  unitPrice: string;
  fuelType: EntryFuelType | null;
  isFull: boolean;
  station: string;
  note: string;
};

export type FuelValues = {
  date: number;
  odometerKm: number;
  liters: number;
  totalPrice: number;
  unitPrice: number;
  fuelType: EntryFuelType;
  isFull: boolean;
  station: string | null;
  note: string | null;
};

// Hata değerleri çeviri anahtarı; ekran kendi dilinde gösterir.
export type FuelErrors = Partial<Record<keyof FuelInput, string>>;

/** Kaydı engellemez; kullanıcıya "yine de kaydet" sorulur. */
export type FuelWarning = 'odometerBelowPrevious' | 'odometerAboveNext' | 'overTank';

export const FUEL_LIMITS = {
  maxLiters: 1000,
  maxKwh: 200,
  maxTotal: 1_000_000,
  maxUnit: 10_000,
  stationMax: 60,
  noteMax: 200,
  /** Depo hacmi üreticinin verdiği yaklaşık değer; boyun dahil biraz fazlası alınabilir. */
  tankTolerance: 1.1,
} as const;

/** Araçtaki yakıt türlerinden kayıtta seçilebilenler: hibrit benzin olarak girilir. */
export function entryFuelTypes(vehicleFuelTypes: readonly FuelType[]): EntryFuelType[] {
  const mapped = vehicleFuelTypes.map((f) => (f === 'hybrid' ? 'petrol' : f));
  return ENTRY_FUEL_TYPES.filter((f) => mapped.includes(f));
}

/**
 * Tarih seçici saati de taşır; kayıt günün ortasına sabitlenir. Böylece saat dilimi değişse de gün kaymaz,
 * aynı gündeki kayıtlar giriş sırasına göre dizilir.
 */
export function normalizeDate(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
}

type Neighbor = { id: string; date: number; createdAt: number; odometerKm: number };

/** Kaydın tarihine göre önceki ve sonraki kayıt (düzenlenen kaydın kendisi hariç). */
export function neighbors<T extends Neighbor>(
  entries: readonly T[],
  date: number,
  self?: { id: string; createdAt: number },
): { previous: T | null; next: T | null } {
  const others = sortEntries(entries.filter((e) => e.id !== self?.id));
  // Yeni kayıt aynı gündeki kayıtlardan sonra girilmiş sayılır.
  const createdAt = self?.createdAt ?? Number.POSITIVE_INFINITY;
  const isBefore = (e: T) => e.date < date || (e.date === date && e.createdAt < createdAt);
  let previous: T | null = null;
  let next: T | null = null;
  for (const e of others) {
    if (isBefore(e)) previous = e;
    else if (!next) next = e;
  }
  return { previous, next };
}

/**
 * Hesaplanan değeri forma yazmak için: binlik ayırıcı yok (parseNumber İngilizce "1,682.41"i
 * ondalık virgül sanar), ondalık ayırıcı dile göre, sondaki sıfırlar atılır.
 */
export function toInput(n: number, locale: 'tr' | 'en', fractionDigits = 2): string {
  const s = String(Number(n.toFixed(fractionDigits)));
  return locale === 'tr' ? s.replace('.', ',') : s;
}

function optionalText(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ');
  return s === '' ? null : s;
}

export type FuelValidateOptions = {
  allowedFuelTypes: readonly EntryFuelType[];
  tankLiters?: number | null;
  previous?: { odometerKm: number } | null;
  next?: { odometerKm: number } | null;
  now?: number;
};

export function validateFuel(
  input: FuelInput,
  { allowedFuelTypes, tankLiters = null, previous = null, next = null, now = Date.now() }: FuelValidateOptions,
): { ok: true; value: FuelValues; warnings: FuelWarning[] } | { ok: false; errors: FuelErrors } {
  const errors: FuelErrors = {};

  const date = normalizeDate(input.date);
  if (date > normalizeDate(now)) errors.date = 'fuel.error.dateFuture';

  if (!input.fuelType || !allowedFuelTypes.includes(input.fuelType)) errors.fuelType = 'fuel.error.fuelType';

  const odometer = parseNumber(input.odometerKm);
  if (odometer === null) errors.odometerKm = 'fuel.error.odometerRequired';
  else if (!Number.isInteger(odometer) || odometer < 0 || odometer > VEHICLE_LIMITS.maxOdometerKm) {
    errors.odometerKm = 'vehicle.error.odometer';
  }

  const maxAmount = input.fuelType === 'electric' ? FUEL_LIMITS.maxKwh : FUEL_LIMITS.maxLiters;
  const liters = parseNumber(input.liters);
  if (liters === null) errors.liters = 'fuel.error.required';
  else if (Number.isNaN(liters) || liters <= 0 || liters > maxAmount) errors.liters = 'fuel.error.amount';

  const total = parseNumber(input.totalPrice);
  if (total === null) errors.totalPrice = 'fuel.error.required';
  else if (Number.isNaN(total) || total <= 0 || total > FUEL_LIMITS.maxTotal) errors.totalPrice = 'fuel.error.price';

  const unit = parseNumber(input.unitPrice);
  if (unit === null) errors.unitPrice = 'fuel.error.required';
  else if (Number.isNaN(unit) || unit <= 0 || unit > FUEL_LIMITS.maxUnit) errors.unitPrice = 'fuel.error.price';

  // Üçü de elle girildiyse birbirini tutmalı; kuruş yuvarlamasına %2 ya da 1 TL pay.
  if (!errors.liters && !errors.totalPrice && !errors.unitPrice) {
    const l = liters as number;
    const t = total as number;
    const u = unit as number;
    if (Math.abs(l * u - t) > Math.max(1, t * 0.02)) errors.totalPrice = 'fuel.error.priceMismatch';
  }

  const station = optionalText(input.station);
  if (station && station.length > FUEL_LIMITS.stationMax) errors.station = 'vehicle.error.tooLong';
  const note = optionalText(input.note);
  if (note && note.length > FUEL_LIMITS.noteMax) errors.note = 'vehicle.error.tooLong';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const value: FuelValues = {
    date,
    odometerKm: odometer as number,
    liters: liters as number,
    totalPrice: total as number,
    unitPrice: unit as number,
    fuelType: input.fuelType as EntryFuelType,
    isFull: input.isFull,
    station,
    note,
  };

  const warnings: FuelWarning[] = [];
  if (previous && value.odometerKm < previous.odometerKm) warnings.push('odometerBelowPrevious');
  if (next && value.odometerKm > next.odometerKm) warnings.push('odometerAboveNext');
  if (tankLiters && value.fuelType !== 'electric' && value.fuelType !== 'lpg') {
    if (value.liters > tankLiters * FUEL_LIMITS.tankTolerance) warnings.push('overTank');
  }
  return { ok: true, value, warnings };
}
