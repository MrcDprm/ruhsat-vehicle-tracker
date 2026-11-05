import type { ExpenseCategory, ServiceSubtype } from '@/db/schema';
import type { ExpenseValues } from '@/features/expenses/validation';
import { normalizeDate, type FuelValues } from '@/features/fuel/validation';
import { defaultService, type SetupInput } from '@/features/reminders/setup';
import type { VehicleValues } from '@/features/vehicles/validation';
import type { Locale } from '@/i18n';

// Mağaza görüntüleri için örnek veriler (yalnız geliştirme derlemesinde, Ayarlar > Geliştirme).
// Saf: "şimdi"ye göre geriye doğru altı aylık gerçekçi bir defter üretir; yazma işi load.ts'te.

const DAY = 24 * 60 * 60 * 1000;

export type DemoData = {
  vehicle: VehicleValues;
  setup: SetupInput;
  fuel: FuelValues[];
  expenses: ExpenseValues[];
};

// Dolumlar eskiden yeniye: kaç gün önce, önceki dolumdan bu yana km, birim fiyat (TL/L).
// Tam dolumda litre, tam depodan tam depoya tüketim (L/100 km) tutsun diye hesaplanır; kısmi dolumda litre sabittir.
type Fill = { daysAgo: number; km: number; price: number } & ({ per100: number } | { partialLiters: number });

const START_KM = 83_210;
const FIRST_FILL_LITERS = 40.6;
// Son dolum bugün: ana ekrandaki "Bu ay" kartı ayın hangi günü olursa olsun boş görünmesin.
const FILLS: Fill[] = [
  { daysAgo: 170, km: 0, price: 52.9, per100: 0 },
  { daysAgo: 156, km: 560, price: 53.4, per100: 6.42 },
  { daysAgo: 142, km: 545, price: 53.95, per100: 6.31 },
  { daysAgo: 129, km: 580, price: 54.6, per100: 6.55 },
  { daysAgo: 115, km: 530, price: 54.6, per100: 6.38 },
  { daysAgo: 104, km: 300, price: 55.25, partialLiters: 18 },
  { daysAgo: 98, km: 260, price: 55.25, per100: 6.47 },
  { daysAgo: 84, km: 555, price: 55.8, per100: 6.36 },
  { daysAgo: 70, km: 570, price: 56.45, per100: 6.61 },
  { daysAgo: 56, km: 540, price: 56.45, per100: 6.44 },
  { daysAgo: 42, km: 565, price: 57.3, per100: 6.29 },
  { daysAgo: 28, km: 550, price: 57.9, per100: 6.4 },
  { daysAgo: 14, km: 575, price: 58.65, per100: 6.52 },
  { daysAgo: 0, km: 540, price: 59.1, per100: 6.35 },
];
const STATIONS = ['Kadıköy', 'Ataşehir', 'Kozyatağı', 'TEM'];

type Spend = {
  daysAgo: number;
  category: ExpenseCategory;
  amount: number;
  subtypes?: ServiceSubtype[];
  withKm?: boolean;
  note?: Record<Locale, string>;
};

const SPENDS: Spend[] = [
  { daysAgo: 152, category: 'traffic_insurance', amount: 11_840 },
  {
    daysAgo: 120,
    category: 'service',
    amount: 6_450,
    subtypes: ['oil', 'filter'],
    withKm: true,
    note: { tr: 'Yağ, yağ ve hava filtresi', en: 'Oil, oil and air filter' },
  },
  { daysAgo: 109, category: 'road_tax', amount: 4_180 },
  { daysAgo: 95, category: 'casco', amount: 27_600 },
  { daysAgo: 58, category: 'parking_toll', amount: 795 },
  { daysAgo: 33, category: 'parking_toll', amount: 180 },
  { daysAgo: 9, category: 'wash', amount: 450 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildDemoData(now: number, locale: Locale): DemoData {
  // Uygulama tarihleri günün öğlesine sabitler; bugünkü kayıt öğleden önce yüklenirse geleceğe düşmesin.
  const at = (daysAgo: number) => Math.min(normalizeDate(now - daysAgo * DAY), now - 60_000);

  // Dolumlar: km birikerek artar; tam dolumun litresi, aradaki kısmi dolumlar düşülerek tüketimden bulunur.
  const fuel: FuelValues[] = [];
  let km = START_KM;
  let kmSinceFull = 0;
  let partialSinceFull = 0;
  FILLS.forEach((f, i) => {
    km += f.km;
    kmSinceFull += f.km;
    let liters: number;
    let isFull = true;
    if ('partialLiters' in f) {
      liters = f.partialLiters;
      partialSinceFull += liters;
      isFull = false;
    } else {
      liters = i === 0 ? FIRST_FILL_LITERS : round2((kmSinceFull * f.per100) / 100 - partialSinceFull);
      kmSinceFull = 0;
      partialSinceFull = 0;
    }
    fuel.push({
      date: at(f.daysAgo),
      odometerKm: km,
      liters,
      unitPrice: f.price,
      totalPrice: round2(liters * f.price),
      fuelType: 'petrol',
      isFull,
      station: STATIONS[i % STATIONS.length],
      note: null,
    });
  });

  // Masrafın km'si, o güne en yakın önceki dolumdan gün başına ortalama yolla tahmin edilir.
  const kmAt = (daysAgo: number) => {
    const before = [...fuel].reverse().find((e) => e.date <= at(daysAgo)) ?? fuel[0];
    return before.odometerKm + Math.round(((at(daysAgo) - before.date) / DAY) * 40);
  };

  const expenses: ExpenseValues[] = SPENDS.map((s) => ({
    date: at(s.daysAgo),
    category: s.category,
    subtypes: s.subtypes ?? null,
    amount: s.amount,
    odometerKm: s.withKm ? kmAt(s.daysAgo) : null,
    note: s.note?.[locale] ?? null,
  }));

  // Hatırlatmalar: muayene yakında (ana ekranda ilk o görünür); sigorta ve kasko poliçe bitişleri; MTV takvimden.
  // Bakımların son yapılışı eski bir tarih: bakım masrafı kaydedilince kendiliğinden ilerler (uygulamadaki gibi).
  const longAgo = at(400);
  const setup: SetupInput = {
    inspection: { enabled: true, mode: 'manual', date: at(-12), commercial: false },
    trafficInsurance: { enabled: true, date: at(-213) },
    casco: { enabled: true, date: at(-270) },
    roadTax: { enabled: true },
    services: [
      { ...defaultService('oil', longAgo), lastDate: longAgo },
      { ...defaultService('filter', longAgo), lastDate: longAgo },
    ],
  };

  return {
    vehicle: {
      name: locale === 'tr' ? 'Aile arabası' : 'Family car',
      make: null,
      model: null,
      year: 2021,
      plate: '34 RHS 26',
      fuelTypes: ['petrol'],
      tankLiters: 50,
      odometerKm: km,
    },
    setup,
    fuel,
    expenses,
  };
}
