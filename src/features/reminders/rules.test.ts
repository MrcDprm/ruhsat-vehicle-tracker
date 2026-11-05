import {
  addMonths,
  applyExpense,
  byUrgency,
  daysBetween,
  dueInfo,
  estimateDateForKm,
  inspectionDue,
  kmPerDay,
  notificationTimes,
  roadTaxDue,
  serviceDue,
  type ReminderFields,
} from './rules';

const D = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const day = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const NOW = D(2026, 11, 5);

const base: ReminderFields = {
  kind: 'custom',
  dueDate: null,
  dueKm: null,
  intervalMonths: null,
  intervalKm: null,
  lastDoneDate: null,
  lastDoneKm: null,
};
const ctx = { now: NOW, odometerKm: 88_000, kmPerDay: 40 };

describe('tarih yardımcıları', () => {
  it('addMonths ay sonunu taşırmaz', () => {
    expect(day(addMonths(D(2026, 1, 31), 1))).toBe('2026-02-28');
    expect(day(addMonths(D(2028, 1, 31), 1))).toBe('2028-02-29');
    expect(day(addMonths(D(2026, 11, 5), 24))).toBe('2028-11-05');
    expect(day(addMonths(D(2026, 3, 15), -3))).toBe('2025-12-15');
  });

  it('daysBetween saate bakmaz', () => {
    expect(daysBetween(D(2026, 11, 5, 23), D(2026, 11, 6, 1))).toBe(1);
    expect(daysBetween(D(2026, 11, 5), D(2026, 11, 5, 8))).toBe(0);
    expect(daysBetween(D(2026, 11, 5), D(2026, 11, 1))).toBe(-4);
  });
});

describe('inspectionDue', () => {
  it('özel araç: son muayeneden 2 yıl sonra', () => {
    expect(day(inspectionDue({ lastDate: D(2025, 3, 10), commercial: false })!)).toBe('2027-03-10');
  });
  it('özel araç hiç muayene olmadıysa trafiğe çıkıştan 3 yıl sonra', () => {
    expect(day(inspectionDue({ firstRegistrationDate: D(2024, 6, 1), commercial: false })!)).toBe('2027-06-01');
  });
  it('ticari: her yıl', () => {
    expect(day(inspectionDue({ lastDate: D(2026, 2, 1), commercial: true })!)).toBe('2027-02-01');
    expect(day(inspectionDue({ firstRegistrationDate: D(2026, 2, 1), commercial: true })!)).toBe('2027-02-01');
  });
  it('bilgi yoksa null', () => expect(inspectionDue({ commercial: false })).toBeNull());
});

describe('roadTaxDue (MTV)', () => {
  it.each([
    ['Ocak içinde, ödeme yok', D(2026, 1, 10), null, '2026-01-31', '2026-01-01'],
    ['Şubat, ödeme yok: Temmuz', D(2026, 2, 10), null, '2026-07-31', '2026-07-01'],
    ['Ağustos, ödeme yok: sonraki Ocak', D(2026, 8, 1), null, '2027-01-31', '2027-01-01'],
    ['Ocak taksiti ödendi: Temmuz', D(2026, 1, 20), D(2026, 1, 15), '2026-07-31', '2026-07-01'],
    ['Temmuz ödendi, Kasım: sonraki Ocak', NOW, D(2026, 7, 20), '2027-01-31', '2027-01-01'],
    ['Temmuz ödenmedi, Ağustos: Temmuz gecikmiş', D(2026, 8, 10), D(2026, 1, 15), '2026-07-31', '2026-07-01'],
    ['Aralıkta geç ödenen Temmuz taksiti', D(2026, 12, 20), D(2026, 12, 5), '2027-01-31', '2027-01-01'],
    ['çok eski ödeme: yalnız son dönem', D(2026, 11, 1), D(2023, 1, 10), '2026-07-31', '2026-07-01'],
  ] as const)('%s', (_, now, paid, due, start) => {
    const r = roadTaxDue(now, paid);
    expect(day(r.dueDate)).toBe(due);
    expect(day(r.periodStart)).toBe(start);
  });

  it('Ocak 31 gün sonuna kadar dönem içindedir', () => {
    expect(day(roadTaxDue(D(2026, 1, 31, 23), null).dueDate)).toBe('2026-01-31');
  });
});

describe('serviceDue', () => {
  it('son bakım + ay ve km aralığı', () => {
    const r = serviceDue({ lastDoneDate: D(2026, 5, 1), lastDoneKm: 80_000, intervalMonths: 12, intervalKm: 15_000 });
    expect(day(r.dueDate!)).toBe('2027-05-01');
    expect(r.dueKm).toBe(95_000);
  });
  it('yalnız km ya da yalnız ay', () => {
    expect(
      serviceDue({ lastDoneDate: D(2026, 5, 1), lastDoneKm: 80_000, intervalMonths: null, intervalKm: 10_000 }),
    ).toEqual({
      dueDate: null,
      dueKm: 90_000,
    });
    expect(serviceDue({ lastDoneDate: null, lastDoneKm: null, intervalMonths: 6, intervalKm: 10_000 })).toEqual({
      dueDate: null,
      dueKm: null,
    });
  });
});

describe('kmPerDay', () => {
  it('son bir yıldaki ilk ve son okumadan', () => {
    const points = [
      { date: NOW - 100 * 86_400_000, odometerKm: 84_000 },
      { date: NOW - 50 * 86_400_000, odometerKm: 86_100 },
      { date: NOW, odometerKm: 88_000 },
    ];
    expect(kmPerDay(points, NOW)).toBeCloseTo(40);
  });
  it('bir yıldan eski okumaları saymaz', () => {
    const points = [
      { date: NOW - 800 * 86_400_000, odometerKm: 10_000 },
      { date: NOW - 20 * 86_400_000, odometerKm: 87_000 },
      { date: NOW, odometerKm: 88_000 },
    ];
    expect(kmPerDay(points, NOW)).toBeCloseTo(50);
  });
  it.each([
    ['tek okuma', [{ date: NOW, odometerKm: 1 }]],
    [
      'iki haftadan kısa aralık',
      [
        { date: NOW - 5 * 86_400_000, odometerKm: 87_000 },
        { date: NOW, odometerKm: 88_000 },
      ],
    ],
    [
      'km geriye gitmiş',
      [
        { date: NOW - 30 * 86_400_000, odometerKm: 90_000 },
        { date: NOW, odometerKm: 88_000 },
      ],
    ],
  ])('%s → null', (_, points) => expect(kmPerDay(points, NOW)).toBeNull());
});

describe('estimateDateForKm', () => {
  it('kalan km / günlük km kadar gün sonra', () => {
    expect(day(estimateDateForKm(89_000, 88_000, 40, NOW)!)).toBe('2026-11-30');
  });
  it('hedef geçildiyse bugün, hız yoksa null', () => {
    expect(day(estimateDateForKm(87_000, 88_000, null, NOW)!)).toBe('2026-11-05');
    expect(estimateDateForKm(90_000, 88_000, null, NOW)).toBeNull();
  });

  it('son okumanın gününden sayar: 20 gün önceki okumadan sonra 1.000 km', () => {
    expect(day(estimateDateForKm(89_000, 88_000, 40, NOW, NOW - 20 * 86_400_000)!)).toBe('2026-11-10');
  });
});

describe('dueInfo', () => {
  it('tarihli hatırlatma: kalan gün ve durum', () => {
    expect(dueInfo({ ...base, dueDate: D(2027, 3, 1) }, ctx)).toMatchObject({
      daysLeft: 116,
      state: 'ok',
      basis: 'date',
    });
    expect(dueInfo({ ...base, dueDate: D(2026, 11, 20) }, ctx)).toMatchObject({ daysLeft: 15, state: 'soon' });
    expect(dueInfo({ ...base, dueDate: D(2026, 11, 1) }, ctx)).toMatchObject({ daysLeft: -4, state: 'overdue' });
  });

  it('bakımda km tahmini tarihten önceyse etkin tarih km tahmininden gelir', () => {
    const r = {
      ...base,
      kind: 'service' as const,
      lastDoneDate: D(2026, 6, 1),
      lastDoneKm: 80_000,
      intervalMonths: 12,
      intervalKm: 10_000,
    };
    // 90.000 km'ye 2.000 km kaldı, günde 40 km → 50 gün; tarih 2027-06-01'den önce.
    expect(dueInfo(r, ctx)).toMatchObject({ dueKm: 90_000, kmLeft: 2_000, daysLeft: 50, basis: 'km', state: 'ok' });
  });

  it('km geçildiyse tarih ne olursa olsun gecikmiş', () => {
    const r = {
      ...base,
      kind: 'service' as const,
      lastDoneDate: D(2026, 6, 1),
      lastDoneKm: 75_000,
      intervalMonths: 12,
      intervalKm: 10_000,
    };
    expect(dueInfo(r, ctx)).toMatchObject({ kmLeft: -3_000, state: 'overdue' });
  });

  it('kullanım hızı bilinmeyince km hatırlatması yalnız km ile yaklaşır', () => {
    const r = { ...base, kind: 'service' as const, lastDoneKm: 80_000, intervalKm: 8_500 };
    expect(dueInfo(r, { ...ctx, kmPerDay: null })).toMatchObject({ dueDate: null, kmLeft: 500, state: 'soon' });
  });

  it('bilgi yoksa durum bilinmiyor', () => {
    expect(dueInfo(base, ctx).state).toBe('unknown');
  });

  it('MTV tarihi takvimden gelir', () => {
    const info = dueInfo({ ...base, kind: 'road_tax' }, ctx);
    expect(day(info.dueDate!)).toBe('2027-01-31');
    expect(day(info.periodStart!)).toBe('2027-01-01');
  });

  it('byUrgency: gecikmiş, yaklaşan, sonra uzak; bilinmeyen sonda', () => {
    const list = [
      dueInfo(base, ctx),
      dueInfo({ ...base, dueDate: D(2027, 3, 1) }, ctx),
      dueInfo({ ...base, dueDate: D(2026, 11, 1) }, ctx),
      dueInfo({ ...base, dueDate: D(2026, 11, 20) }, ctx),
    ];
    expect([...list].sort(byUrgency).map((i) => i.state)).toEqual(['overdue', 'soon', 'ok', 'unknown']);
  });
});

describe('notificationTimes', () => {
  const hours = (times: number[]) => times.map((t) => `${day(t)} ${new Date(t).getHours()}`);

  it('sigorta: 30, 7, 1 gün önce ve o gün saat 10:00', () => {
    const info = dueInfo({ ...base, kind: 'traffic_insurance', dueDate: D(2027, 2, 15) }, ctx);
    expect(hours(notificationTimes('traffic_insurance', info, NOW))).toEqual([
      '2027-01-16 10',
      '2027-02-08 10',
      '2027-02-14 10',
      '2027-02-15 10',
    ]);
  });

  it('geçmişte kalan anlar atlanır', () => {
    const info = dueInfo({ ...base, kind: 'casco', dueDate: D(2026, 11, 10) }, ctx);
    expect(hours(notificationTimes('casco', info, NOW))).toEqual(['2026-11-09 10', '2026-11-10 10']);
  });

  it('MTV: dönemin ilk günü ve son haftası', () => {
    const info = dueInfo({ ...base, kind: 'road_tax' }, ctx);
    expect(hours(notificationTimes('road_tax', info, NOW))).toEqual(['2027-01-01 10', '2027-01-24 10']);
  });

  it('tarihi olmayan hatırlatmaya bildirim yok', () => {
    expect(notificationTimes('custom', dueInfo(base, ctx), NOW)).toEqual([]);
  });
});

describe('applyExpense', () => {
  const inspection = {
    kind: 'inspection' as const,
    title: null,
    dueDate: D(2026, 12, 1),
    intervalMonths: 24,
    lastDoneDate: D(2024, 12, 1),
    lastDoneKm: null,
  };
  const insurance = { ...inspection, kind: 'traffic_insurance' as const, dueDate: D(2026, 12, 1), intervalMonths: 12 };
  const exp = (category: Parameters<typeof applyExpense>[1]['category'], date: number, extra = {}) => ({
    category,
    date,
    subtypes: null,
    odometerKm: null,
    ...extra,
  });

  it('muayene masrafı sonraki muayeneyi aralık kadar ileri alır', () => {
    const p = applyExpense(inspection, exp('inspection', D(2026, 11, 20)))!;
    expect(day(p.lastDoneDate!)).toBe('2026-11-20');
    expect(day(p.dueDate!)).toBe('2028-11-20');
  });

  it('geriye dönük eski muayene kaydı hatırlatmayı bozmaz', () => {
    expect(applyExpense(inspection, exp('inspection', D(2023, 1, 1)))).toBeNull();
  });

  it('erken yenilenen sigorta: yeni poliçe eskisinin bittiği gün başlar', () => {
    expect(day(applyExpense(insurance, exp('traffic_insurance', D(2026, 11, 20)))!.dueDate!)).toBe('2027-12-01');
  });

  it('geç yenilenen sigorta: ödeme gününden bir yıl', () => {
    const late = { ...insurance, dueDate: D(2026, 3, 1) };
    expect(day(applyExpense(late, exp('traffic_insurance', D(2026, 11, 20)))!.dueDate!)).toBe('2027-11-20');
  });

  it('bitişe 60 günden fazla varken girilen sigorta masrafı (ör. ek teminat) dönemi değiştirmez', () => {
    expect(applyExpense(insurance, exp('traffic_insurance', D(2026, 8, 1)))).toBeNull();
  });

  it('başka türdeki masraf etkilemez', () => {
    expect(applyExpense(inspection, exp('wash', D(2026, 11, 20)))).toBeNull();
    expect(applyExpense(insurance, exp('casco', D(2026, 11, 20)))).toBeNull();
  });

  it('MTV ödemesi son ödemeyi günceller', () => {
    const roadTax = { ...inspection, kind: 'road_tax' as const, dueDate: null, lastDoneDate: null };
    expect(applyExpense(roadTax, exp('road_tax', D(2026, 7, 10)))).toEqual({ lastDoneDate: D(2026, 7, 10) });
  });

  it('bakım: masrafta o iş yapıldıysa ilerletir (yağ + filtre → yağ), km verildiyse onu da yazar', () => {
    const oil = {
      ...inspection,
      kind: 'service' as const,
      title: 'oil',
      dueDate: null,
      lastDoneDate: D(2026, 1, 1),
      lastDoneKm: 75_000,
    };
    expect(
      applyExpense(oil, exp('service', D(2026, 11, 1), { subtypes: ['oil', 'filter'], odometerKm: 88_000 })),
    ).toEqual({
      lastDoneDate: D(2026, 11, 1),
      lastDoneKm: 88_000,
    });
    expect(applyExpense(oil, exp('service', D(2026, 11, 1), { subtypes: ['oil'] }))).toEqual({
      lastDoneDate: D(2026, 11, 1),
    });
    expect(applyExpense(oil, exp('service', D(2026, 11, 1), { subtypes: ['brake', 'tyre'] }))).toBeNull();
    expect(applyExpense(oil, exp('service', D(2026, 11, 1), { subtypes: ['other'] }))).toBeNull();
    expect(
      applyExpense({ ...oil, title: 'other' }, exp('service', D(2026, 11, 1), { subtypes: ['other'] })),
    ).toBeNull();
  });
});
