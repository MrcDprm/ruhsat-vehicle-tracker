import type { Expense, FuelEntry } from '@/db/schema';

import { BOM, csvCell, expenseCsv, fuelCsv, isoDate, toCsv } from './csv';

const t = (key: string) => key.split('.').pop()!;

describe('csvCell', () => {
  it('sayı: binlik ayırıcı yok, Türkçede virgüllü ondalık, kuruşa yuvarlı', () => {
    expect(csvCell(1682.41, 'tr')).toBe('1682,41');
    expect(csvCell(1682.41, 'en')).toBe('1682.41');
    expect(csvCell(87_421, 'tr')).toBe('87421');
    expect(csvCell(43.789, 'tr')).toBe('43,79');
  });

  it('boş değer boş hücre', () => expect(csvCell(null, 'tr')).toBe(''));

  it.each(['=HYPERLINK("x")', '+90 555', '-1+1', '@SUM(A1)', '\tx'])(
    'formül gibi başlayan metin etkisizleşir: %p',
    (v) => {
      expect(csvCell(v, 'en').replace(/^"/, '').startsWith("'")).toBe(true);
    },
  );

  it('ayırıcı, tırnak ya da satır sonu içeren metin tırnağa alınır, iç tırnak ikilenir', () => {
    expect(csvCell('a;b', 'tr')).toBe('"a;b"');
    expect(csvCell('a;b', 'en')).toBe('a;b');
    expect(csvCell('a,b', 'en')).toBe('"a,b"');
    expect(csvCell('5" jant', 'tr')).toBe('"5"" jant"');
    expect(csvCell('iki\nsatır', 'tr')).toBe('"iki\nsatır"');
  });

  it('Türkçe karakterler olduğu gibi kalır', () =>
    expect(csvCell('Şişli Ğ ı İ ç ö ü', 'tr')).toBe('Şişli Ğ ı İ ç ö ü'));
});

describe('toCsv', () => {
  it('BOM ile başlar, satır sonu CRLF, dile göre ayırıcı', () => {
    expect(toCsv(['a', 'b'], [[1.5, 'x']], 'tr')).toBe(`${BOM}a;b\r\n1,5;x\r\n`);
    expect(toCsv(['a', 'b'], [[1.5, 'x']], 'en')).toBe(`${BOM}a,b\r\n1.5,x\r\n`);
  });
});

describe('isoDate', () => {
  it('yerel tarih, iki haneli ay ve gün', () =>
    expect(isoDate(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05'));
});

const vehicles = [
  { id: 'v1', name: 'Clio' },
  { id: 'v2', name: 'Doblo' },
];

describe('fuelCsv', () => {
  it('başlık ve satırlar: araç, tarih sırası, birim, tam depo', () => {
    const entries = [
      {
        vehicleId: 'v1',
        date: new Date(2026, 10, 5, 12).getTime(),
        createdAt: 2,
        odometerKm: 88000,
        fuelType: 'petrol',
        liters: 38.42,
        unitPrice: 43.79,
        totalPrice: 1682.41,
        isFull: true,
        station: 'Opet; Kadıköy',
        note: null,
      },
      {
        vehicleId: 'v1',
        date: new Date(2026, 9, 1, 12).getTime(),
        createdAt: 1,
        odometerKm: 87500,
        fuelType: 'lpg',
        liters: 30,
        unitPrice: 20,
        totalPrice: 600,
        isFull: false,
        station: null,
        note: '=1+1',
      },
    ] as FuelEntry[];
    const lines = fuelCsv(vehicles, entries, t, 'tr').replace(BOM, '').trim().split('\r\n');
    expect(lines).toEqual([
      'vehicle;date;km;fuelType;amount;unit;unitPrice;total;full;station;note',
      "Clio;2026-10-01;87500;lpg;30;L;20;600;no;;'=1+1",
      'Clio;2026-11-05;88000;petrol;38,42;L;43,79;1682,41;yes;"Opet; Kadıköy";',
    ]);
  });
});

describe('expenseCsv', () => {
  it('bakımda yapılanlar tek hücrede; diğerlerinde boş', () => {
    const entries = [
      {
        vehicleId: 'v2',
        date: new Date(2026, 10, 1, 12).getTime(),
        createdAt: 1,
        odometerKm: null,
        category: 'parking_toll',
        subtypes: null,
        amount: 120,
        note: null,
      },
      {
        vehicleId: 'v1',
        date: new Date(2026, 9, 1, 12).getTime(),
        createdAt: 2,
        odometerKm: 87000,
        category: 'service',
        subtypes: ['oil', 'filter'],
        amount: 3250.5,
        note: 'Bosch',
      },
    ] as Expense[];
    const lines = expenseCsv(vehicles, entries, t, 'en').replace(BOM, '').trim().split('\r\n');
    expect(lines).toEqual([
      'vehicle,date,km,category,items,total,note',
      'Clio,2026-10-01,87000,service,"oil, filter",3250.5,Bosch',
      'Doblo,2026-11-01,,parking_toll,,120,',
    ]);
  });

  it('kayıt yoksa yalnız başlık', () => {
    expect(expenseCsv(vehicles, [], t, 'tr')).toBe(`${BOM}vehicle;date;km;category;items;total;note\r\n`);
  });
});
