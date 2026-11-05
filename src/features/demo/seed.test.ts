import { summarize } from '@/features/fuel/consumption';
import { buildReminders } from '@/features/reminders/setup';

import { buildDemoData } from './seed';

const NOW = new Date(2026, 10, 6, 15, 0).getTime();

describe('örnek veriler', () => {
  const data = buildDemoData(NOW, 'tr');

  it('dolumlar eskiden yeniye, km artarak ve depoya sığarak gelir', () => {
    data.fuel.forEach((e, i) => {
      expect(e.liters).toBeGreaterThan(0);
      expect(e.liters).toBeLessThanOrEqual(data.vehicle.tankLiters ?? Infinity);
      expect(e.totalPrice).toBeCloseTo(e.liters * e.unitPrice, 1);
      expect(e.date).toBeLessThan(NOW);
      if (i > 0) {
        expect(e.date).toBeGreaterThan(data.fuel[i - 1].date);
        expect(e.odometerKm).toBeGreaterThan(data.fuel[i - 1].odometerKm);
      }
    });
    expect(data.vehicle.odometerKm).toBe(data.fuel[data.fuel.length - 1].odometerKm);
  });

  it('son dolum bugün: ayın ilk sabahı yüklense de "Bu ay" boş kalmaz', () => {
    const morning = new Date(2026, 10, 1, 8, 30).getTime();
    const last = buildDemoData(morning, 'tr').fuel.at(-1);
    expect(new Date(last?.date ?? 0).toDateString()).toBe(new Date(morning).toDateString());
  });

  it('hatırlatma tarihleri ileride: muayene 12, sigorta 213, kasko 270 gün sonra', () => {
    const daysAhead = (ms: number) => Math.round((ms - NOW) / 86_400_000);
    expect(daysAhead(data.setup.inspection.date)).toBe(12);
    expect(daysAhead(data.setup.trafficInsurance.date)).toBe(213);
    expect(daysAhead(data.setup.casco.date)).toBe(270);
  });

  it('tüketim gerçekçi çıkar ve hiçbir aralık işaretlenmez', () => {
    const stats = summarize(data.fuel.map((e, i) => ({ ...e, id: `f${i}`, createdAt: e.date })));
    const petrol = stats.byFuel.petrol;
    expect(petrol?.flaggedIntervals).toBe(0);
    expect(petrol?.last).toBeCloseTo(6.35, 2);
    expect(petrol?.average).toBeGreaterThan(6.2);
    expect(petrol?.average).toBeLessThan(6.7);
  });

  it('hatırlatma kurulumu doğrulamadan geçer', () => {
    expect(buildReminders(data.setup, { now: NOW, odometerKm: data.vehicle.odometerKm }).ok).toBe(true);
  });

  it('bakım masrafının km değeri araç göstergesini aşmaz', () => {
    for (const e of data.expenses) {
      expect(e.date).toBeLessThan(NOW);
      if (e.odometerKm !== null) expect(e.odometerKm).toBeLessThan(data.vehicle.odometerKm);
    }
  });

  it('araç adı ve notlar uygulamanın dilinde', () => {
    const en = buildDemoData(NOW, 'en');
    expect(data.vehicle.name).toBe('Aile arabası');
    expect(en.vehicle.name).toBe('Family car');
    expect(en.expenses.find((e) => e.category === 'service')?.note).toBe('Oil, oil and air filter');
  });
});
