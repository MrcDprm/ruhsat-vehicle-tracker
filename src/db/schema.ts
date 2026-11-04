import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
