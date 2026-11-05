/**
 * @jest-environment node
 */
// Rakiplerin en büyük şikâyeti güncelleme sonrası veri kaybı (bir uygulama bütün tarihleri 01.01.1900 yaptı).
// Bu test, uygulamaya gömülen göç dosyalarını gerçek SQLite'ta (Node'un node:sqlite modülü) sırayla çalıştırır:
// her göçten sonra o sürüme ait örnek veri yazılır, kalan göçler uygulanır, sonunda bütün örnekler aynen okunur.
// Yeni bir göç eklenince FIXTURES'a o sürümün örneği de eklenir.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dir = join(__dirname, '..', '..', 'drizzle');
const journal = JSON.parse(readFileSync(join(dir, 'meta', '_journal.json'), 'utf8')) as {
  entries: { idx: number; tag: string }[];
};

function apply(db: DatabaseSync, tag: string) {
  const sql = readFileSync(join(dir, `${tag}.sql`), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) db.exec(statement);
  }
}

type Fixture = { insert: (db: DatabaseSync) => void; check: (db: DatabaseSync) => void };

const FIXTURES: Record<string, Fixture> = {
  '0000_init': {
    insert: (db) =>
      db
        .prepare(
          `INSERT INTO vehicles (id, created_at, updated_at, name, make, model, year, plate, fuel_types, tank_liters, odometer_km)
           VALUES ('v-0000', 1730700000000, 1730700000000, 'Clio', 'Renault', 'Clio', 2019, '34 ABC 123', '["petrol","lpg"]', 45.5, 87421)`,
        )
        .run(),
    check: (db) => {
      const row = db.prepare(`SELECT * FROM vehicles WHERE id = 'v-0000'`).get() as Record<string, unknown>;
      expect(row).toMatchObject({
        name: 'Clio',
        created_at: 1730700000000,
        updated_at: 1730700000000,
        deleted_at: null,
        dirty: 1,
        year: 2019,
        plate: '34 ABC 123',
        fuel_types: '["petrol","lpg"]',
        tank_liters: 45.5,
        odometer_km: 87421,
      });
    },
  },
  '0001_fuel_entries': {
    insert: (db) =>
      db
        .prepare(
          `INSERT INTO fuel_entries (id, created_at, updated_at, vehicle_id, date, odometer_km, liters, total_price, unit_price, fuel_type, is_full, station, note)
           VALUES ('f-0001', 1730800000000, 1730800000000, 'v-0000', 1730790000000, 87900, 38.42, 1652.06, 43, 'petrol', 1, 'Opet Kadıköy', 'ilk kayıt')`,
        )
        .run(),
    check: (db) => {
      const row = db.prepare(`SELECT * FROM fuel_entries WHERE id = 'f-0001'`).get() as Record<string, unknown>;
      expect(row).toMatchObject({
        vehicle_id: 'v-0000',
        date: 1730790000000,
        odometer_km: 87900,
        liters: 38.42,
        total_price: 1652.06,
        unit_price: 43,
        fuel_type: 'petrol',
        is_full: 1,
        station: 'Opet Kadıköy',
        note: 'ilk kayıt',
        deleted_at: null,
        dirty: 1,
      });
    },
  },
  '0002_expenses_reminders': {
    insert: (db) => {
      db.prepare(
        `INSERT INTO expenses (id, created_at, updated_at, vehicle_id, date, odometer_km, category, subtype, amount, note)
         VALUES ('x-0002', 1730900000000, 1730900000000, 'v-0000', 1730890000000, 88000, 'service', 'oil', 3250.5, 'yağ + filtre')`,
      ).run();
      db.prepare(
        `INSERT INTO reminders (id, created_at, updated_at, vehicle_id, kind, due_date, interval_months, last_done_date)
         VALUES ('r-0002', 1730900000000, 1730900000000, 'v-0000', 'inspection', 1793000000000, 24, 1730000000000)`,
      ).run();
    },
    check: (db) => {
      expect(db.prepare(`SELECT * FROM expenses WHERE id = 'x-0002'`).get()).toMatchObject({
        vehicle_id: 'v-0000',
        odometer_km: 88000,
        category: 'service',
        // 0003'te tek alt tür diziye taşındı, 0004'te eski sütun kaldırıldı.
        subtypes: '["oil"]',
        amount: 3250.5,
        note: 'yağ + filtre',
        dirty: 1,
      });
      expect(db.prepare(`SELECT * FROM reminders WHERE id = 'r-0002'`).get()).toMatchObject({
        kind: 'inspection',
        due_date: 1793000000000,
        due_km: null,
        interval_months: 24,
        last_done_date: 1730000000000,
        enabled: 1,
      });
    },
  },
  '0003_expense_subtypes': {
    // Bu sürümde iki sütun birlikte: eski kayıt subtype'la, yeni kayıt subtypes'la yazılır.
    insert: (db) =>
      db
        .prepare(
          `INSERT INTO expenses (id, created_at, updated_at, vehicle_id, date, category, subtypes, amount)
           VALUES ('x-0003', 1731000000000, 1731000000000, 'v-0000', 1731000000000, 'service', '["oil","filter"]', 4100)`,
        )
        .run(),
    check: (db) => {
      expect(db.prepare(`SELECT subtypes FROM expenses WHERE id = 'x-0003'`).get()).toEqual({
        subtypes: '["oil","filter"]',
      });
    },
  },
  '0004_drop_expense_subtype': {
    insert: (db) =>
      db
        .prepare(
          `INSERT INTO expenses (id, created_at, updated_at, vehicle_id, date, category, amount)
           VALUES ('x-0004', 1731100000000, 1731100000000, 'v-0000', 1731100000000, 'wash', 300)`,
        )
        .run(),
    check: (db) => {
      const columns = (db.prepare(`PRAGMA table_info(expenses)`).all() as { name: string }[]).map((c) => c.name);
      expect(columns).toContain('subtypes');
      expect(columns).not.toContain('subtype');
      expect(db.prepare(`SELECT subtypes, amount FROM expenses WHERE id = 'x-0004'`).get()).toEqual({
        subtypes: null,
        amount: 300,
      });
    },
  },
};

describe('veritabanı göçleri', () => {
  it('her göç için bir örnek veri var', () => {
    for (const { tag } of journal.entries) expect(FIXTURES[tag]).toBeDefined();
  });

  it('boş veritabanına baştan sona uygulanır', () => {
    const db = new DatabaseSync(':memory:');
    for (const { tag } of journal.entries) apply(db, tag);
    db.close();
  });

  it('her sürümde yazılan veri sonraki göçlerden bozulmadan çıkar', () => {
    const db = new DatabaseSync(':memory:');
    for (const { tag } of journal.entries) {
      apply(db, tag);
      FIXTURES[tag].insert(db);
    }
    for (const { tag } of journal.entries) FIXTURES[tag].check(db);
    db.close();
  });
});
