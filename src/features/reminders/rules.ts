import type { Expense, Reminder, ReminderKind } from '@/db/schema';

// Hatırlatma kuralları (Türkiye). Saf fonksiyonlar; tarihler epoch ms, hesaplar cihazın yerel saatine göre.

const DAY = 86_400_000;

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Takvim günü farkı; yaz saati geçişinde 23/25 saatlik günler yuvarlanır. */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY);
}

/** Ay ekler; hedef ayda o gün yoksa ayın son günü (31 Ocak + 1 ay = 28/29 Şubat). */
export function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1, d.getHours(), d.getMinutes());
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target.getTime();
}

// ── Muayene ─────────────────────────────────────────────────────────────
// Özel otomobil: trafiğe çıkıştan 3 yıl sonra, sonra 2 yılda bir. Ticari: yılda bir.
export const INSPECTION_MONTHS = { firstPrivate: 36, private: 24, commercial: 12 } as const;

export function inspectionDue({
  lastDate,
  firstRegistrationDate,
  commercial,
}: {
  lastDate?: number | null;
  firstRegistrationDate?: number | null;
  commercial: boolean;
}): number | null {
  if (lastDate) return addMonths(lastDate, commercial ? INSPECTION_MONTHS.commercial : INSPECTION_MONTHS.private);
  if (firstRegistrationDate) {
    return addMonths(firstRegistrationDate, commercial ? INSPECTION_MONTHS.commercial : INSPECTION_MONTHS.firstPrivate);
  }
  return null;
}

// ── MTV ─────────────────────────────────────────────────────────────────
// Yılda iki taksit: Ocak ve Temmuz, ayın sonuna kadar. Dönem numarası = yıl × 2 + (Temmuz ise 1).
const periodStart = (n: number) => new Date(Math.floor(n / 2), (n % 2) * 6, 1).getTime();
const periodEnd = (n: number) => new Date(Math.floor(n / 2), (n % 2) * 6 + 1, 1).getTime() - 1;
/** Başlangıcı ms'den önce ya da ona eşit olan son dönem. */
const periodAt = (ms: number) => {
  const d = new Date(ms);
  return d.getFullYear() * 2 + (d.getMonth() >= 6 ? 1 : 0);
};

/**
 * Sıradaki ödenecek taksit. Bir ödeme, başlangıcı ödemeden önce olan son dönemi karşılar
 * (Aralık'ta yapılan geç ödeme Temmuz taksitidir). Hiç kayıt yoksa bugünün ya da sonraki dönemin taksiti;
 * ödeme kaydı çok eskiyse yalnızca en son dönem gecikmiş gösterilir, yıllar öncesi değil.
 */
export function roadTaxDue(now: number, lastPaid: number | null): { dueDate: number; periodStart: number } {
  const current = periodAt(now);
  let n: number;
  if (lastPaid === null) {
    n = periodEnd(current) >= now ? current : current + 1;
  } else {
    n = Math.max(periodAt(lastPaid) + 1, current);
    // Bugünkü dönem ödenmemiş ama bitmişse (Ağustos'ta Temmuz) gecikmiş olarak kalır; n = current.
  }
  return { dueDate: startOfDay(periodEnd(n)), periodStart: periodStart(n) };
}

// ── Bakım ───────────────────────────────────────────────────────────────

export function serviceDue(r: {
  lastDoneDate: number | null;
  lastDoneKm: number | null;
  intervalMonths: number | null;
  intervalKm: number | null;
}): { dueDate: number | null; dueKm: number | null } {
  return {
    dueDate: r.lastDoneDate !== null && r.intervalMonths ? addMonths(r.lastDoneDate, r.intervalMonths) : null,
    dueKm: r.lastDoneKm !== null && r.intervalKm ? r.lastDoneKm + r.intervalKm : null,
  };
}

// ── Kullanım hızı ───────────────────────────────────────────────────────

export const USAGE = { windowDays: 365, minSpanDays: 14 } as const;

/**
 * Günlük ortalama km: son bir yıldaki km okumalarının (yakıt, masraf, araç kaydı) ilk ve sonundan.
 * En az iki hafta aralıklı iki okuma yoksa tahmin yapılmaz.
 */
export function kmPerDay(points: readonly { date: number; odometerKm: number }[], now: number): number | null {
  const recent = points
    .filter((p) => p.date <= now && p.date >= now - USAGE.windowDays * DAY)
    .sort((a, b) => a.date - b.date);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = (last.date - first.date) / DAY;
  const km = last.odometerKm - first.odometerKm;
  if (days < USAGE.minSpanDays || km <= 0) return null;
  return km / days;
}

/** Hedef km'ye hangi gün varılacağı; hız bilinmiyorsa null, hedef geçildiyse bugün. */
export function estimateDateForKm(
  targetKm: number,
  currentKm: number,
  perDay: number | null,
  now: number,
): number | null {
  const remaining = targetKm - currentKm;
  if (remaining <= 0) return startOfDay(now);
  if (!perDay || perDay <= 0) return null;
  return startOfDay(now) + Math.ceil(remaining / perDay) * DAY;
}

// ── Durum ───────────────────────────────────────────────────────────────

export const SOON = { days: 30, km: 1000 } as const;

export type ReminderFields = Pick<
  Reminder,
  'kind' | 'dueDate' | 'dueKm' | 'intervalMonths' | 'intervalKm' | 'lastDoneDate' | 'lastDoneKm'
>;

export type DueInfo = {
  /** Etkin tarih: verilen tarih ile km'nin tahmini tarihinden önce gelen. */
  dueDate: number | null;
  dueKm: number | null;
  daysLeft: number | null;
  kmLeft: number | null;
  /** Etkin tarih km tahmininden mi geliyor? */
  basis: 'date' | 'km' | null;
  state: 'overdue' | 'soon' | 'ok' | 'unknown';
  /** Yalnız MTV: dönemin başladığı gün (bildirim için). */
  periodStart?: number;
};

export type DueContext = { now: number; odometerKm: number; kmPerDay: number | null };

export function dueInfo(r: ReminderFields, { now, odometerKm, kmPerDay: perDay }: DueContext): DueInfo {
  let date: number | null = r.dueDate;
  let km: number | null = r.dueKm;
  let periodStartMs: number | undefined;

  if (r.kind === 'road_tax') {
    const due = roadTaxDue(now, r.lastDoneDate);
    date = due.dueDate;
    periodStartMs = due.periodStart;
  } else if (r.kind === 'service' && (r.lastDoneDate !== null || r.lastDoneKm !== null)) {
    ({ dueDate: date, dueKm: km } = serviceDue(r));
  }

  const kmDate = km !== null ? estimateDateForKm(km, odometerKm, perDay, now) : null;
  let effective = date;
  let basis: DueInfo['basis'] = date !== null ? 'date' : null;
  if (kmDate !== null && (effective === null || kmDate < effective)) {
    effective = kmDate;
    basis = 'km';
  }

  const daysLeft = effective !== null ? daysBetween(now, effective) : null;
  const kmLeft = km !== null ? km - odometerKm : null;

  let state: DueInfo['state'] = 'unknown';
  if (daysLeft !== null || kmLeft !== null) {
    if ((daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0)) state = 'overdue';
    else if ((daysLeft !== null && daysLeft <= SOON.days) || (kmLeft !== null && kmLeft <= SOON.km)) state = 'soon';
    else state = 'ok';
  }

  return { dueDate: effective, dueKm: km, daysLeft, kmLeft, basis, state, periodStart: periodStartMs };
}

const STATE_ORDER: Record<DueInfo['state'], number> = { overdue: 0, soon: 1, ok: 2, unknown: 3 };

/** En acil başta: gecikmiş, yaklaşan, sonra tarihe göre; tarihi olmayanlar sonda. */
export function byUrgency(a: DueInfo, b: DueInfo): number {
  return (
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY) ||
    (a.kmLeft ?? Number.POSITIVE_INFINITY) - (b.kmLeft ?? Number.POSITIVE_INFINITY)
  );
}

// ── Bildirim zamanları ──────────────────────────────────────────────────

export const NOTIFY_HOUR = 10;
/** Tarihli hatırlatmalarda son tarihten kaç gün önce (0 = o gün). */
export const NOTIFY_DAYS_BEFORE: Record<Exclude<ReminderKind, 'road_tax'>, readonly number[]> = {
  inspection: [30, 7, 1, 0],
  traffic_insurance: [30, 7, 1, 0],
  casco: [30, 7, 1, 0],
  custom: [7, 1, 0],
  service: [7, 0],
};

const atHour = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), NOTIFY_HOUR).getTime();
};

/** Gelecekteki bildirim anları (saat 10:00), sıralı. Gecikmiş hatırlatmaya bildirim kurulmaz. */
export function notificationTimes(kind: ReminderKind, info: DueInfo, now: number): number[] {
  if (info.dueDate === null) return [];
  let times: number[];
  if (kind === 'road_tax') {
    // Ayın başında ve son haftada (ayın 24'ü).
    const start = info.periodStart ?? info.dueDate;
    times = [atHour(start), atHour(info.dueDate - 7 * DAY)];
  } else {
    times = NOTIFY_DAYS_BEFORE[kind].map((d) => atHour(info.dueDate! - d * DAY));
  }
  return [...new Set(times)].filter((t) => t > now).sort((a, b) => a - b);
}

// ── Masraf girilince hatırlatmanın yenilenmesi ────────────────────────────

export type ReminderPatch = Partial<Pick<Reminder, 'dueDate' | 'lastDoneDate' | 'lastDoneKm'>>;

/** Masraf türü → ilgili hatırlatma türü. */
export const EXPENSE_REMINDER: Partial<Record<Expense['category'], ReminderKind>> = {
  inspection: 'inspection',
  traffic_insurance: 'traffic_insurance',
  casco: 'casco',
  road_tax: 'road_tax',
  service: 'service',
};

/** Yenilemenin erken yapılabileceği süre: poliçe bitmeden 60 gün içinde ödenen sonraki dönemindir. */
const RENEW_WINDOW_DAYS = 60;

/**
 * Masraf kaydı hatırlatmayı ilerletir mi? İlerletirse değişecek alanlar, ilerletmezse null.
 * Geriye dönük girilen eski bir masraf güncel hatırlatmayı bozmaz.
 */
export function applyExpense(
  r: Pick<Reminder, 'kind' | 'title' | 'dueDate' | 'intervalMonths' | 'lastDoneDate' | 'lastDoneKm'>,
  e: Pick<Expense, 'category' | 'subtype' | 'date' | 'odometerKm'>,
): ReminderPatch | null {
  if (EXPENSE_REMINDER[e.category] !== r.kind) return null;
  const newer = r.lastDoneDate === null || e.date > r.lastDoneDate;

  switch (r.kind) {
    case 'inspection':
      if (!newer) return null;
      return { lastDoneDate: e.date, dueDate: addMonths(e.date, r.intervalMonths ?? INSPECTION_MONTHS.private) };
    case 'traffic_insurance':
    case 'casco': {
      if (!newer) return null;
      if (r.dueDate !== null && e.date < r.dueDate - RENEW_WINDOW_DAYS * DAY) return null;
      // Yeni poliçe eskisinin bittiği gün başlar; çok geç yenilendiyse ödeme gününden.
      const from = r.dueDate !== null && r.dueDate >= e.date - RENEW_WINDOW_DAYS * DAY ? r.dueDate : e.date;
      return { lastDoneDate: e.date, dueDate: addMonths(from, r.intervalMonths ?? 12) };
    }
    case 'road_tax':
      return newer ? { lastDoneDate: e.date } : null;
    case 'service':
      // Bakım hatırlatması alt türe göre (yağ, fren…); "diğer" bakım bir hatırlatmayı ilerletmez.
      if (!e.subtype || e.subtype === 'other' || r.title !== e.subtype || !newer) return null;
      return { lastDoneDate: e.date, ...(e.odometerKm !== null ? { lastDoneKm: e.odometerKm } : {}) };
    default:
      return null;
  }
}
