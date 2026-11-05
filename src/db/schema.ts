import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Eşitlenen her tablonun ortak sütunları (docs/plan.md "Veri modeli").
// id telefonda üretilen UUID; silme kaydı kaldırmaz, deleted_at doldurur (eşitlenebilsin diye).
// Zamanlar epoch milisaniye; dirty = sunucuya gönderilmemiş değişiklik var.
const syncColumns = {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  dirty: integer('dirty', { mode: 'boolean' })
    .notNull()
    .default(sql`1`),
};

// Hibrit (HEV/PHEV) benzinle yakıt alır; yakıt kaydında benzin olarak girilir, şarj ayrıca girilebilir.
export const FUEL_TYPES = ['petrol', 'diesel', 'lpg', 'hybrid', 'electric'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const vehicles = sqliteTable('vehicles', {
  ...syncColumns,
  name: text('name').notNull(),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  plate: text('plate'),
  fuelTypes: text('fuel_types', { mode: 'json' }).$type<FuelType[]>().notNull(),
  tankLiters: real('tank_liters'),
  odometerKm: integer('odometer_km').notNull().default(0),
});

export type Vehicle = typeof vehicles.$inferSelect;

// Yakıt kaydında hibrit yoktur (benzin olarak girilir). Elektrikte "liters" alanı kWh tutar.
export const ENTRY_FUEL_TYPES = ['petrol', 'diesel', 'lpg', 'electric'] as const;
export type EntryFuelType = (typeof ENTRY_FUEL_TYPES)[number];

// Para TL cinsinden ondalık; tutar, litre ve birim fiyatın üçü de saklanır (kullanıcının girdiği değer kaybolmasın).
export const fuelEntries = sqliteTable(
  'fuel_entries',
  {
    ...syncColumns,
    vehicleId: text('vehicle_id').notNull(),
    date: integer('date').notNull(),
    odometerKm: integer('odometer_km').notNull(),
    liters: real('liters').notNull(),
    totalPrice: real('total_price').notNull(),
    unitPrice: real('unit_price').notNull(),
    fuelType: text('fuel_type').$type<EntryFuelType>().notNull(),
    isFull: integer('is_full', { mode: 'boolean' }).notNull(),
    station: text('station'),
    note: text('note'),
  },
  (t) => [index('fuel_entries_vehicle_date').on(t.vehicleId, t.date)],
);

export type FuelEntry = typeof fuelEntries.$inferSelect;
