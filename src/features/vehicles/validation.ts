import { FUEL_TYPES, type FuelType } from '@/db/schema';

import { canonicalMake, canonicalModel, tidyName } from './catalog';
import { FOREIGN_PLATE_MAX, checkTurkishPlate, maskForeignPlate, maskTurkishPlate, plateKey } from './plate';

// Formdan gelen ham metinler. Doğrulama burada, ekrandan bağımsız; testler ekransız çalışır.
export type VehicleInput = {
  name: string;
  make: string;
  model: string;
  year: string;
  plate: string;
  /** Yurt dışı plakası: Türk plakası şablonu uygulanmaz. */
  plateForeign: boolean;
  fuelTypes: FuelType[];
  tankLiters: string;
  odometerKm: string;
};

export type VehicleValues = {
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  fuelTypes: FuelType[];
  tankLiters: number | null;
  odometerKm: number;
};

// Hata değerleri çeviri anahtarı; ekran kendi dilinde gösterir.
export type VehicleErrors = Partial<Record<keyof VehicleInput, string>>;

export const LIMITS = {
  nameMax: 40,
  makeModelMax: 40,
  minYear: 1950,
  maxTankLiters: 300,
  maxOdometerKm: 2_000_000,
} as const;

/** "6,5" ve "6.5" ikisini de kabul eder; binlik ayırıcı noktayı (120.000) sayıdan atar. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (s === '') return null;
  // Tek virgül varsa ondalıktır; noktalar binlik ayırıcıdır ("120.000,5").
  const normalized = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, '')
      : s;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

function optionalText(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ');
  return s === '' ? null : s;
}

export type ValidateOptions = {
  currentYear?: number;
  /** Kullanıcının diğer araçlarının plakaları (aynı plaka iki araca girilemez). */
  takenPlates?: (string | null)[];
};

export function validateVehicle(
  input: VehicleInput,
  { currentYear = new Date().getFullYear(), takenPlates = [] }: ValidateOptions = {},
): { ok: true; value: VehicleValues } | { ok: false; errors: VehicleErrors } {
  const errors: VehicleErrors = {};

  // Öneriye dokunulmasa da katalogla eşleşen ad tek yazıma çevrilir: "ford" → "Ford", "mg" → "MG".
  const rawMake = optionalText(input.make);
  const make = rawMake ? (canonicalMake(rawMake) ?? tidyName(rawMake)) : null;
  if (make && make.length > LIMITS.makeModelMax) errors.make = 'vehicle.error.tooLong';
  const rawModel = optionalText(input.model);
  const model = rawModel ? (canonicalModel(make ?? '', rawModel) ?? tidyName(rawModel)) : null;
  if (model && model.length > LIMITS.makeModelMax) errors.model = 'vehicle.error.tooLong';

  // Takma ad isteğe bağlı: boşsa "Ford Fiesta" gibi marka + model kullanılır; ikisi de yoksa ad istenir.
  const nickname = input.name.trim().replace(/\s+/g, ' ');
  const name = nickname || [make, model].filter(Boolean).join(' ');
  if (name === '') errors.name = 'vehicle.error.nameRequired';
  else if (nickname.length > LIMITS.nameMax) errors.name = 'vehicle.error.tooLong';

  const year = parseNumber(input.year);
  if (year !== null && (!Number.isInteger(year) || year < LIMITS.minYear || year > currentYear + 1)) {
    errors.year = 'vehicle.error.year';
  }

  // Türk plakası şablona göre (il kodu, harf ve rakam sayısı), yurt dışı plakası serbest ama sınırlı.
  const plate = (input.plateForeign ? maskForeignPlate(input.plate).trim() : maskTurkishPlate(input.plate)) || null;
  if (plate && !input.plateForeign) {
    const problem = checkTurkishPlate(plate);
    if (problem) errors.plate = problem === 'province' ? 'vehicle.error.plateProvince' : 'vehicle.error.plateFormat';
  } else if (plate && plate.length > FOREIGN_PLATE_MAX) {
    errors.plate = 'vehicle.error.tooLong';
  }
  if (!errors.plate && plate && takenPlates.some((p) => p && plateKey(p) === plateKey(plate))) {
    errors.plate = 'vehicle.error.plateTaken';
  }

  const fuelTypes = FUEL_TYPES.filter((f) => input.fuelTypes.includes(f));
  if (fuelTypes.length === 0) errors.fuelTypes = 'vehicle.error.fuelRequired';

  // Yalnız elektrikli araçta depo yok; alan gizlenir, eski değer kaydedilmez.
  const tankLiters = fuelTypes.length === 1 && fuelTypes[0] === 'electric' ? null : parseNumber(input.tankLiters);
  if (tankLiters !== null && (Number.isNaN(tankLiters) || tankLiters <= 0 || tankLiters > LIMITS.maxTankLiters)) {
    errors.tankLiters = 'vehicle.error.tank';
  }

  const odometer = parseNumber(input.odometerKm);
  if (odometer === null) errors.odometerKm = 'vehicle.error.odometerRequired';
  else if (!Number.isInteger(odometer) || odometer < 0 || odometer > LIMITS.maxOdometerKm) {
    errors.odometerKm = 'vehicle.error.odometer';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, make, model, year, plate, fuelTypes, tankLiters, odometerKm: odometer as number },
  };
}
