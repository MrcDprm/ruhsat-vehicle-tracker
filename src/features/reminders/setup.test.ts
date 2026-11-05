import type { Reminder } from '@/db/schema';
import { normalizeDate } from '@/features/fuel/validation';

import { buildReminders, defaultService, emptySetup, toSetupInput, type SetupInput } from './setup';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const NOW = D(2026, 11, 5);
const ctx = { now: NOW, odometerKm: 88_000 };

function valid(): SetupInput {
  const s = emptySetup(NOW);
  s.inspection.date = D(2025, 3, 10);
  s.trafficInsurance.date = D(2027, 2, 15);
  s.services[0].lastKm = '80.000';
  s.services[0].lastDate = D(2026, 5, 1);
  return s;
}

const byKind = (drafts: { kind: string; title: string | null }[], kind: string, title: string | null = null) =>
  drafts.find((d) => d.kind === kind && (kind !== 'service' || d.title === title));

describe('emptySetup', () => {
  it('muayene, trafik sigortası, MTV ve yağ açık; kasko kapalı', () => {
    const s = emptySetup(NOW);
    expect([s.inspection.enabled, s.trafficInsurance.enabled, s.roadTax.enabled, s.casco.enabled]).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(s.services).toEqual([defaultService('oil', NOW)]);
    expect(s.services[0]).toMatchObject({ intervalKm: '10000', intervalMonths: '12' });
  });
});

describe('buildReminders', () => {
  it('geçerli kurulum: her tür için bir satır, tarih ve km hesaplanmış', () => {
    const r = buildReminders(valid(), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts.map((d) => [d.kind, d.title, d.enabled])).toEqual([
      ['inspection', null, true],
      ['traffic_insurance', null, true],
      ['casco', null, false],
      ['road_tax', null, true],
      ['service', 'oil', true],
    ]);
    expect(byKind(r.drafts, 'inspection')).toMatchObject({
      lastDoneDate: normalizeDate(D(2025, 3, 10)),
      dueDate: normalizeDate(D(2027, 3, 10)),
      intervalMonths: 24,
    });
    expect(byKind(r.drafts, 'traffic_insurance')).toMatchObject({
      dueDate: normalizeDate(D(2027, 2, 15)),
      intervalMonths: 12,
    });
    expect(byKind(r.drafts, 'service', 'oil')).toMatchObject({
      lastDoneKm: 80_000,
      intervalKm: 10_000,
      intervalMonths: 12,
    });
  });

  it('yeni araç: trafiğe çıkıştan 3 yıl; ticari: 1 yıl', () => {
    const s = valid();
    s.inspection = { enabled: true, mode: 'new', date: D(2025, 6, 1), commercial: false };
    const r = buildReminders(s, ctx);
    expect(r.ok && byKind(r.drafts, 'inspection')).toMatchObject({
      dueDate: normalizeDate(D(2028, 6, 1)),
      lastDoneDate: null,
    });
    s.inspection.commercial = true;
    const c = buildReminders(s, ctx);
    expect(c.ok && byKind(c.drafts, 'inspection')).toMatchObject({
      dueDate: normalizeDate(D(2026, 6, 1)),
      intervalMonths: 12,
    });
  });

  it('sıradaki muayene tarihi elle girilebilir (gelecek tarih serbest)', () => {
    const s = valid();
    s.inspection = { enabled: true, mode: 'manual', date: D(2027, 9, 1), commercial: false };
    const r = buildReminders(s, ctx);
    expect(r.ok && byKind(r.drafts, 'inspection')).toMatchObject({
      dueDate: normalizeDate(D(2027, 9, 1)),
      lastDoneDate: null,
    });
  });

  it('son muayene gelecekte olamaz; kapalıysa bakılmaz', () => {
    const s = valid();
    s.inspection.date = D(2027, 1, 1);
    expect(buildReminders(s, ctx)).toMatchObject({ ok: false, errors: { inspection: 'reminder.error.pastDate' } });
    s.inspection.enabled = false;
    expect(buildReminders(s, ctx).ok).toBe(true);
  });

  it('bakım hataları: son km araçtan ileri, aralık sınır dışı, aralık hiç yok', () => {
    const s = valid();
    s.services = [
      { ...defaultService('oil', NOW), lastKm: '90.000', intervalKm: '100' },
      { ...defaultService('brake', NOW), intervalKm: '', intervalMonths: '' },
      { ...defaultService('battery', NOW), intervalMonths: '200' },
    ];
    expect(buildReminders(s, ctx)).toEqual({
      ok: false,
      errors: {
        'service.oil.lastKm': 'reminder.error.lastKmAhead',
        'service.oil.intervalKm': 'reminder.error.intervalKm',
        'service.brake.intervalKm': 'reminder.error.intervalRequired',
        'service.battery.intervalMonths': 'reminder.error.intervalMonths',
      },
    });
  });

  it('son km boş bırakılabilir (yalnız tarihe göre)', () => {
    const s = valid();
    s.services[0].lastKm = '';
    const r = buildReminders(s, ctx);
    expect(r.ok && byKind(r.drafts, 'service', 'oil')).toMatchObject({ lastDoneKm: null });
  });

  it('MTV satırı mevcut son ödemeyi korur', () => {
    const existing = [{ kind: 'road_tax', title: null, lastDoneDate: D(2026, 7, 10) } as Reminder];
    const r = buildReminders(valid(), { ...ctx, existing });
    expect(r.ok && byKind(r.drafts, 'road_tax')).toMatchObject({ lastDoneDate: D(2026, 7, 10) });
  });
});

describe('toSetupInput', () => {
  it('kayıt yoksa başlangıç kurulumu', () => {
    expect(toSetupInput([], NOW)).toEqual(emptySetup(NOW));
  });

  it('kaydedileni geri okur: buildReminders ile gidiş-dönüş aynı satırları verir', () => {
    const s = valid();
    s.casco = { enabled: true, date: D(2027, 4, 1) };
    s.inspection.commercial = true;
    s.services.push({ ...defaultService('brake', NOW), lastKm: '70000', lastDate: D(2025, 1, 1) });
    const first = buildReminders(s, ctx);
    if (!first.ok) throw new Error('kurulum geçersiz');
    const saved = first.drafts.map((d, i) => ({ ...d, id: String(i) }) as Reminder);
    const again = buildReminders(toSetupInput(saved, NOW), { ...ctx, existing: saved });
    expect(again).toEqual(first);
  });

  it('son muayenesi olmayan kayıt elle girilmiş sıradaki tarih olarak açılır', () => {
    const saved = [
      {
        kind: 'inspection',
        title: null,
        enabled: true,
        dueDate: D(2027, 9, 1),
        lastDoneDate: null,
        intervalMonths: 24,
      } as Reminder,
    ];
    expect(toSetupInput(saved, NOW).inspection).toEqual({
      enabled: true,
      mode: 'manual',
      date: D(2027, 9, 1),
      commercial: false,
    });
  });
});
