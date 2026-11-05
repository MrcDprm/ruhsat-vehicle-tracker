import { SERVICE_SUBTYPES, type Reminder, type ReminderKind, type ServiceSubtype } from '@/db/schema';
import { normalizeDate } from '@/features/fuel/validation';
import { parseNumber } from '@/features/vehicles/validation';

import { INSPECTION_MONTHS, inspectionDue } from './rules';

// Hatırlatma kurulum formu ↔ reminders satırları. Saf; ekran yalnızca çizer ve kaydeder.

/** last: son muayene tarihi biliniyor; new: hiç muayene olmadı (trafiğe çıkış tarihi); manual: sıradaki tarihi biliyor. */
export type InspectionMode = 'last' | 'new' | 'manual';

export type ServiceSetup = {
  subtype: ServiceSubtype;
  enabled: boolean;
  /** Son yapıldığı km (metin); boşsa yalnız tarihe göre. */
  lastKm: string;
  lastDate: number;
  intervalKm: string;
  intervalMonths: string;
};

export type SetupInput = {
  inspection: { enabled: boolean; mode: InspectionMode; date: number; commercial: boolean };
  trafficInsurance: { enabled: boolean; date: number };
  casco: { enabled: boolean; date: number };
  roadTax: { enabled: boolean };
  services: ServiceSetup[];
};

/** Bakım türlerinin önerilen aralıkları (üreticiye göre değişir; kullanıcı değiştirebilir). */
export const SERVICE_DEFAULTS: Record<ServiceSubtype, { km: number | null; months: number | null }> = {
  oil: { km: 10_000, months: 12 },
  filter: { km: 15_000, months: 12 },
  tyre: { km: 40_000, months: 60 },
  brake: { km: 30_000, months: 24 },
  battery: { km: null, months: 48 },
  other: { km: null, months: 12 },
};

export const SETUP_LIMITS = { minIntervalKm: 500, maxIntervalKm: 200_000, maxIntervalMonths: 120 } as const;

export type ReminderDraft = Pick<
  Reminder,
  'kind' | 'title' | 'dueDate' | 'dueKm' | 'intervalMonths' | 'intervalKm' | 'lastDoneDate' | 'lastDoneKm' | 'enabled'
>;

/** Hata anahtarları: "inspection", "trafficInsurance", "service.oil.lastKm" gibi alan yolları. */
export type SetupErrors = Record<string, string>;

export function defaultService(subtype: ServiceSubtype, now: number, enabled = true): ServiceSetup {
  const d = SERVICE_DEFAULTS[subtype];
  return {
    subtype,
    enabled,
    lastKm: '',
    lastDate: now,
    intervalKm: d.km ? String(d.km) : '',
    intervalMonths: d.months ? String(d.months) : '',
  };
}

/** Hiç hatırlatması olmayan araç için başlangıç: muayene, trafik sigortası, MTV ve yağ bakımı açık; kasko kapalı. */
export function emptySetup(now: number): SetupInput {
  return {
    inspection: { enabled: true, mode: 'last', date: now, commercial: false },
    trafficInsurance: { enabled: true, date: now },
    casco: { enabled: false, date: now },
    roadTax: { enabled: true },
    services: [defaultService('oil', now)],
  };
}

const find = (list: readonly Reminder[], kind: ReminderKind, title: string | null = null) =>
  list.find((r) => r.kind === kind && (kind !== 'service' || r.title === title));

/** Kayıtlı hatırlatmalardan formu doldurur (düzenleme). Kayıt yoksa o bölüm başlangıç değeriyle gelir. */
export function toSetupInput(list: readonly Reminder[], now: number): SetupInput {
  const base = emptySetup(now);
  const ins = find(list, 'inspection');
  const tr = find(list, 'traffic_insurance');
  const casco = find(list, 'casco');
  const tax = find(list, 'road_tax');
  const services = SERVICE_SUBTYPES.flatMap((s): ServiceSetup[] => {
    const r = find(list, 'service', s);
    if (!r) return [];
    return [
      {
        subtype: s,
        enabled: r.enabled,
        lastKm: r.lastDoneKm !== null ? String(r.lastDoneKm) : '',
        lastDate: r.lastDoneDate ?? now,
        intervalKm: r.intervalKm ? String(r.intervalKm) : '',
        intervalMonths: r.intervalMonths ? String(r.intervalMonths) : '',
      },
    ];
  });
  return {
    inspection: ins
      ? {
          enabled: ins.enabled,
          // Son muayene biliniyorsa ondan hesaplanır; yoksa kaydedilen sıradaki tarih elle girilmiş sayılır.
          mode: ins.lastDoneDate !== null ? 'last' : 'manual',
          date: ins.lastDoneDate ?? ins.dueDate ?? now,
          commercial: ins.intervalMonths === INSPECTION_MONTHS.commercial,
        }
      : base.inspection,
    trafficInsurance: tr ? { enabled: tr.enabled, date: tr.dueDate ?? now } : base.trafficInsurance,
    casco: casco ? { enabled: casco.enabled, date: casco.dueDate ?? now } : base.casco,
    roadTax: tax ? { enabled: tax.enabled } : base.roadTax,
    services: list.length === 0 ? base.services : services,
  };
}

const blank = {
  dueDate: null,
  dueKm: null,
  intervalMonths: null,
  intervalKm: null,
  lastDoneDate: null,
  lastDoneKm: null,
};

/**
 * Formu doğrular ve kaydedilecek satırlara çevirir. Kapalı bölümler de satır olarak döner (enabled: false):
 * kullanıcı tekrar açınca girdiği tarih kaybolmasın. MTV'nin son ödemesi korunur (formda yok, masraftan gelir).
 */
export function buildReminders(
  input: SetupInput,
  { now, odometerKm, existing = [] }: { now: number; odometerKm: number; existing?: readonly Reminder[] },
): { ok: true; drafts: ReminderDraft[] } | { ok: false; errors: SetupErrors } {
  const errors: SetupErrors = {};
  const today = normalizeDate(now);
  const drafts: ReminderDraft[] = [];

  // Muayene
  const ins = input.inspection;
  const insDate = normalizeDate(ins.date);
  if (ins.enabled && ins.mode !== 'manual' && insDate > today) errors.inspection = 'reminder.error.pastDate';
  const interval = ins.commercial ? INSPECTION_MONTHS.commercial : INSPECTION_MONTHS.private;
  drafts.push({
    ...blank,
    kind: 'inspection',
    title: null,
    enabled: ins.enabled,
    intervalMonths: interval,
    lastDoneDate: ins.mode === 'last' ? insDate : null,
    dueDate:
      ins.mode === 'manual'
        ? insDate
        : inspectionDue({
            lastDate: ins.mode === 'last' ? insDate : null,
            firstRegistrationDate: ins.mode === 'new' ? insDate : null,
            commercial: ins.commercial,
          }),
  });

  // Sigorta ve kasko: bitiş tarihi; yenilenince bir yıl ileri gider.
  drafts.push({
    ...blank,
    kind: 'traffic_insurance',
    title: null,
    enabled: input.trafficInsurance.enabled,
    intervalMonths: 12,
    dueDate: normalizeDate(input.trafficInsurance.date),
  });
  drafts.push({
    ...blank,
    kind: 'casco',
    title: null,
    enabled: input.casco.enabled,
    intervalMonths: 12,
    dueDate: normalizeDate(input.casco.date),
  });

  // MTV: tarih takvimden; son ödeme varsa korunur.
  drafts.push({
    ...blank,
    kind: 'road_tax',
    title: null,
    enabled: input.roadTax.enabled,
    lastDoneDate: find(existing, 'road_tax')?.lastDoneDate ?? null,
  });

  // Bakımlar: son yapılış + aralık.
  for (const s of input.services) {
    const key = `service.${s.subtype}`;
    const lastKm = parseNumber(s.lastKm);
    const intervalKm = parseNumber(s.intervalKm);
    const intervalMonths = parseNumber(s.intervalMonths);
    const lastDate = normalizeDate(s.lastDate);
    if (s.enabled) {
      if (lastKm !== null && (!Number.isInteger(lastKm) || lastKm < 0))
        errors[`${key}.lastKm`] = 'vehicle.error.odometer';
      else if (lastKm !== null && lastKm > odometerKm) errors[`${key}.lastKm`] = 'reminder.error.lastKmAhead';
      if (
        intervalKm !== null &&
        (!Number.isInteger(intervalKm) ||
          intervalKm < SETUP_LIMITS.minIntervalKm ||
          intervalKm > SETUP_LIMITS.maxIntervalKm)
      ) {
        errors[`${key}.intervalKm`] = 'reminder.error.intervalKm';
      }
      if (
        intervalMonths !== null &&
        (!Number.isInteger(intervalMonths) || intervalMonths < 1 || intervalMonths > SETUP_LIMITS.maxIntervalMonths)
      ) {
        errors[`${key}.intervalMonths`] = 'reminder.error.intervalMonths';
      }
      if (intervalKm === null && intervalMonths === null)
        errors[`${key}.intervalKm`] = 'reminder.error.intervalRequired';
      if (lastDate > today) errors[`${key}.lastDate`] = 'reminder.error.pastDate';
    }
    const valid = (n: number | null) => (n !== null && Number.isFinite(n) ? n : null);
    drafts.push({
      ...blank,
      kind: 'service',
      title: s.subtype,
      enabled: s.enabled,
      lastDoneDate: lastDate,
      lastDoneKm: valid(lastKm),
      intervalKm: valid(intervalKm),
      intervalMonths: valid(intervalMonths),
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, drafts };
}
