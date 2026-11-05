import type { FuelEntry, Reminder, Vehicle } from '@/db/schema';

import { buildWidgetPayload, type WidgetFormatters } from './payload';

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const NOW = D(2026, 11, 20);

const f: WidgetFormatters = {
  t: (key, params) => (params ? `${key}${JSON.stringify(params)}` : key),
  number: (n, d = 0) => n.toFixed(d),
  money: (n) => `${Math.round(n)} TL`,
  upper: (text) => `UP(${text})`,
};

const vehicle = (id: string, name: string, createdAt = 1, odometerKm = 88_000) =>
  ({ id, name, createdAt, odometerKm }) as Vehicle;
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
let seq = 0;
const fuel = (date: number, km: number, liters: number, fuelType: FuelEntry['fuelType'] = 'petrol', isFull = true) =>
  ({
    id: `f${++seq}`,
    vehicleId: 'v1',
    date,
    createdAt: seq,
    odometerKm: km,
    liters,
    totalPrice: liters * 40,
    fuelType,
    isFull,
  }) as FuelEntry;

const empty = { vehicles: [], reminders: [], fuel: [], expenses: [] };

describe('buildWidgetPayload', () => {
  it('araç yoksa boş özet ve "Araç ekle" metni', () => {
    const p = buildWidgetPayload(empty, null, NOW, f);
    expect(p).toMatchObject({ vehicle: null, reminder: null, consumption: null, month: '0 TL' });
    expect(p.labels.noVehicle).toBe('widget.noVehicle');
  });

  it('büyük harfle gösterilen etiketler uygulamada dile göre büyütülür', () => {
    const { labels } = buildWidgetPayload(empty, null, NOW, f);
    expect(labels).toMatchObject({
      next: 'UP(widget.next)',
      consumption: 'UP(widget.consumption)',
      month: 'UP(summary.thisMonth)',
      today: 'reminder.today',
    });
  });

  it('seçili araç silinmişse ilk araca düşer', () => {
    const p = buildWidgetPayload(
      { ...empty, vehicles: [vehicle('v2', 'Doblo', 2), vehicle('v1', 'Clio', 1)] },
      'silinmis',
      NOW,
      f,
    );
    expect(p.vehicle).toBe('Clio');
  });

  it('en acil açık hatırlatma: gecikmiş olan yaklaşandan önce; kapalı ve başka aracınki sayılmaz', () => {
    const p = buildWidgetPayload(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio')],
        reminders: [
          reminder({ kind: 'traffic_insurance', dueDate: D(2026, 12, 1) }),
          reminder({ kind: 'inspection', dueDate: D(2026, 11, 10) }),
          reminder({ kind: 'casco', dueDate: D(2026, 11, 5), enabled: false }),
          reminder({ kind: 'road_tax', vehicleId: 'v2' }),
        ],
      },
      'v1',
      NOW,
      f,
    );
    expect(p.reminder).toEqual({
      title: 'reminder.kind.inspection',
      icon: 'checkmark.seal.fill',
      dueDate: D(2026, 11, 10),
      kmText: null,
    });
  });

  it('tarihi olmayan, yalnız km ile bilinen bakım km metniyle gelir', () => {
    const p = buildWidgetPayload(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio')],
        reminders: [reminder({ kind: 'service', title: 'oil', lastDoneKm: 80_000, intervalKm: 8_500 })],
      },
      'v1',
      NOW,
      f,
    );
    expect(p.reminder).toMatchObject({
      title: 'reminder.service.oil',
      dueDate: null,
      kmText: 'widget.kmLeft{"km":"500"}',
    });
  });

  it('hatırlatma yoksa reminder null', () => {
    expect(buildWidgetPayload({ ...empty, vehicles: [vehicle('v1', 'Clio')] }, 'v1', NOW, f).reminder).toBeNull();
  });

  it("son tüketim: en son tam dolumu yapılan yakıtın (LPG'li araç)", () => {
    const list = [
      fuel(D(2026, 10, 1), 10_000, 40, 'petrol'),
      fuel(D(2026, 10, 10), 10_300, 30, 'petrol'),
      fuel(D(2026, 10, 2), 10_050, 40, 'lpg'),
      fuel(D(2026, 11, 1), 10_450, 36, 'lpg'),
    ];
    const p = buildWidgetPayload({ ...empty, vehicles: [vehicle('v1', 'Clio')], fuel: list }, 'v1', NOW, f);
    expect(p.consumption).toEqual({ value: '9.0', unit: 'L/100 common.km' });
  });

  it('tüketim hesaplanamıyorsa null', () => {
    const p = buildWidgetPayload(
      { ...empty, vehicles: [vehicle('v1', 'Clio')], fuel: [fuel(D(2026, 11, 1), 10_000, 40)] },
      'v1',
      NOW,
      f,
    );
    expect(p.consumption).toBeNull();
  });

  it('bu ay: yakıt + masraf, yalnız bu ay ve bu araç', () => {
    const p = buildWidgetPayload(
      {
        ...empty,
        vehicles: [vehicle('v1', 'Clio')],
        fuel: [fuel(D(2026, 11, 3), 10_000, 10), fuel(D(2026, 10, 30), 9_000, 50)],
        expenses: [
          { vehicleId: 'v1', date: D(2026, 11, 5), odometerKm: null, amount: 250 },
          { vehicleId: 'v2', date: D(2026, 11, 5), odometerKm: null, amount: 999 },
        ],
      },
      'v1',
      NOW,
      f,
    );
    expect(p.month).toBe('650 TL');
  });
});
