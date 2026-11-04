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
