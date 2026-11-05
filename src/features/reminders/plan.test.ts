import type { Reminder, Vehicle } from '@/db/schema';

import { MAX_SCHEDULED, planNotifications, urgentCount, type Formatters } from './plan';

const D = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = D(2026, 11, 5);
const DAY = 86_400_000;

// Metinleri anahtar + parametre olarak döndüren sahte çeviri: testler dile bağlı kalmaz.
const f: Formatters = {
  t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
  date: (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  },
  number: (n) => String(n),
};

const vehicle = (id: string, name: string, odometerKm = 88_000) => ({ id, name, odometerKm }) as Vehicle;
const reminder = (over: Partial<Reminder>): Reminder =>
  ({
    id: Math.random().toString(),
    vehicleId: 'v1',
    kind: 'custom',
    title: null,
    dueDate: null,
    dueKm: null,
    intervalMonths: null,
    intervalKm: null,
    lastDoneDate: null,
    lastDoneKm: null,
    enabled: true,
    ...over,
  }) as Reminder;

const empty = { fuel: [], expenses: [] };

describe('planNotifications', () => {
  it('sigorta: 30/7/1 gün önce ve o gün, başlıkta araç adı', () => {
    const plan = planNotifications(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio')],
        reminders: [reminder({ kind: 'traffic_insurance', dueDate: D(2027, 2, 15) })],
      },
      NOW,
      f,
    );
    expect(plan.map((p) => f.date(p.at))).toEqual(['2027-1-16', '2027-2-8', '2027-2-14', '2027-2-15']);
    expect(plan[0].title).toBe('Clio · reminder.kind.traffic_insurance');
    expect(plan[0].body).toContain('notify.daysLeft');
    expect(plan[0].body).toContain('"count":30');
    expect(plan[3].body).toContain('notify.today');
    expect(plan.every((p) => p.vehicleId === 'v1')).toBe(true);
  });

  it('kapalı hatırlatma ve tarihi olmayan hatırlatma bildirim üretmez', () => {
    const plan = planNotifications(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio')],
        reminders: [reminder({ kind: 'casco', dueDate: D(2027, 2, 15), enabled: false }), reminder({ kind: 'custom' })],
      },
      NOW,
      f,
    );
    expect(plan).toEqual([]);
  });

  it('MTV: dönem başı ve son hafta ayrı metinle', () => {
    const plan = planNotifications(
      { ...empty, vehicles: [vehicle('v1', 'Clio')], reminders: [reminder({ kind: 'road_tax' })] },
      NOW,
      f,
    );
    expect(plan.map((p) => [f.date(p.at), p.body.split(' ')[0]])).toEqual([
      ['2027-1-1', 'notify.roadTaxStart'],
      ['2027-1-24', 'notify.roadTaxLastWeek'],
    ]);
  });

  it('km tahminine dayanan bakım km ile anlatılır; tahmin yakıt kayıtlarından', () => {
    const fuel = [
      { vehicleId: 'v1', date: NOW - 100 * DAY, odometerKm: 84_000 },
      { vehicleId: 'v1', date: NOW, odometerKm: 88_000 },
    ];
    const plan = planNotifications(
      {
        vehicles: [vehicle('v1', 'Clio')],
        expenses: [],
        fuel,
        reminders: [
          reminder({
            kind: 'service',
            title: 'oil',
            lastDoneDate: D(2026, 6, 1),
            lastDoneKm: 80_000,
            intervalKm: 10_000,
            intervalMonths: 12,
          }),
        ],
      },
      NOW,
      f,
    );
    // Günde 40 km, 2.000 km kaldı → 50 gün sonra (25 Aralık); 7 gün önce ve o gün.
    expect(plan.map((p) => f.date(p.at))).toEqual(['2026-12-18', '2026-12-25']);
    expect(plan[0].body).toContain('notify.serviceKm');
    expect(plan[0].body).toContain('"km":"90000"');
  });

  it('başka aracın kaydı tahmini etkilemez; her araç kendi başlığıyla', () => {
    const plan = planNotifications(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio'), vehicle('v2', 'Doblo')],
        reminders: [
          reminder({ vehicleId: 'v1', kind: 'inspection', dueDate: D(2026, 11, 20) }),
          reminder({ vehicleId: 'v2', kind: 'inspection', dueDate: D(2026, 11, 10) }),
        ],
      },
      NOW,
      f,
    );
    expect(plan.map((p) => [p.vehicleId, f.date(p.at)])).toEqual([
      ['v2', '2026-11-9'],
      ['v2', '2026-11-10'],
      ['v1', '2026-11-13'],
      ['v1', '2026-11-19'],
      ['v1', '2026-11-20'],
    ]);
  });

  it(`en yakın ${MAX_SCHEDULED} bildirim seçilir (iOS sınırı 64)`, () => {
    const reminders = Array.from({ length: 30 }, (_, i) =>
      reminder({ kind: 'custom', title: `R${i}`, dueDate: D(2027, 1, 1) + i * DAY }),
    );
    const plan = planNotifications({ ...empty, vehicles: [vehicle('v1', 'Clio')], reminders }, NOW, f);
    expect(plan).toHaveLength(MAX_SCHEDULED);
    expect(plan.every((p, i) => i === 0 || plan[i - 1].at <= p.at)).toBe(true);
  });
});

describe('simge sayısı (badge)', () => {
  const data = {
    ...empty,
    vehicles: [vehicle('v1', 'Clio'), vehicle('v2', 'Doblo')],
    reminders: [
      reminder({ vehicleId: 'v1', kind: 'inspection', dueDate: D(2026, 11, 20) }),
      reminder({ vehicleId: 'v2', kind: 'inspection', dueDate: D(2026, 11, 10) }),
      reminder({ vehicleId: 'v2', kind: 'casco', dueDate: D(2027, 6, 1) }),
      reminder({ vehicleId: 'v2', kind: 'traffic_insurance', dueDate: D(2026, 11, 1), enabled: false }),
    ],
  };

  it('bugün: gecikmiş ve yaklaşan, bütün araçlarda; kapalı ve uzak olan sayılmaz', () => {
    expect(urgentCount(data, NOW)).toBe(2);
    expect(urgentCount({ ...data, reminders: [] }, NOW)).toBe(0);
  });

  it('her bildirim geldiği günkü sayıyı taşır', () => {
    const plan = planNotifications(data, NOW, f);
    expect(plan.map((p) => [f.date(p.at), p.badge])).toEqual([
      ['2026-11-9', 2],
      ['2026-11-10', 2],
      ['2026-11-13', 2],
      ['2026-11-19', 2],
      ['2026-11-20', 2],
      // Kaskoya 30 gün kala o da yaklaşanlara girer; muayeneler hâlâ yapılmamışsa gecikmiş sayılır.
      ['2027-5-2', 3],
      ['2027-5-25', 3],
      ['2027-5-31', 3],
      ['2027-6-1', 3],
    ]);
  });
});
