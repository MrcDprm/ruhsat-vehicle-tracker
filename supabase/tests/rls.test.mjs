// RLS testleri: supabase/migrations/0001 ve 0003 gerçek bir Postgres'te (PGlite, WebAssembly) çalıştırılır;
// Supabase'in auth şeması, rolleri ve varsayılan yetkileri taklit edilir. Böylece veriyi koruyan şey Supabase'teki gibi
// gerçekten RLS olur. İki kullanıcı (A, B) birbirinin kaydını okuyamamalı ve yazamamalı.
//
//   npm run test:rls                 → hepsi geçmeli
//   RLS_BREAK=1 npm run test:rls     → okuma kuralı bilerek "herkes görür" yapılır; testler DÜŞMELİ
//   RLS_BREAK=quota npm run test:rls → satır kotası bilerek kaldırılır; kota testi DÜŞMELİ
//                                      (testlerin gerçekten hata yakaladığının kanıtı)
// 0002 (pg_cron) Supabase'e özgü eklenti istediği için burada çalıştırılmaz.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const migrations = ['0001_sync_tables.sql', '0003_quotas_and_values.sql'].map((f) =>
  readFileSync(join(here, '..', 'migrations', f), 'utf8'),
);

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const VA = '10000000-0000-4000-8000-00000000000a';
const VB = '10000000-0000-4000-8000-00000000000b';

// Supabase'in hazır kurduğu şeylerin küçük karşılığı.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Supabase public şemadaki her tabloya anon ve authenticated için bütün yetkileri verir; koruma RLS'tedir.
  alter default privileges in schema public grant all on tables to anon, authenticated;
`;

let db;

/** Telefondaki istemcinin yaptığı gibi: rol + JWT'deki kullanıcı. */
async function as(user, sql, params = []) {
  const role = user ? 'authenticated' : 'anon';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}

const vehicle = (id, userId, over = {}) => ({
  id,
  user_id: userId,
  created_at: 1000,
  updated_at: 1000,
  name: 'Clio',
  fuel_types: '["petrol"]',
  odometer_km: 10000,
  ...over,
});

// PostgREST'in upsert'ü: insert ... on conflict (id) do update.
const UPSERT_VEHICLE = `
  insert into public.vehicles (id, user_id, created_at, updated_at, name, fuel_types, odometer_km)
  values ($1, $2, $3, $4, $5, $6::jsonb, $7)
  on conflict (id) do update set updated_at = excluded.updated_at, name = excluded.name,
    odometer_km = excluded.odometer_km, user_id = excluded.user_id`;
const upsertVehicle = (user, v) =>
  as(user, UPSERT_VEHICLE, [v.id, v.user_id, v.created_at, v.updated_at, v.name, v.fuel_types, v.odometer_km]);

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const m of migrations) await db.exec(m);
  if (process.env.RLS_BREAK === '1') {
    await db.exec(`alter policy "own rows: select" on public.vehicles using (true);`);
  }
  if (process.env.RLS_BREAK === 'quota') {
    await db.exec(`drop trigger vehicles_quota on public.vehicles;`);
  }
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');`);
});

after(async () => {
  await db?.close();
});

describe('RLS: kendi satırların', () => {
  it('kullanıcı kendi aracını ekler ve okur', async () => {
    await upsertVehicle(A, vehicle(VA, A));
    await upsertVehicle(B, vehicle(VB, B, { name: 'Doblo' }));
    const rows = await as(A, 'select id, name from public.vehicles');
    assert.deepEqual(rows.rows, [{ id: VA, name: 'Clio' }]);
  });

  it('başkasının kaydını okuyamaz', async () => {
    const rows = await as(B, 'select id from public.vehicles where id = $1', [VA]);
    assert.equal(rows.rows.length, 0);
  });

  it('başkası adına kayıt ekleyemez (user_id başkası)', async () => {
    await assert.rejects(upsertVehicle(A, vehicle('20000000-0000-4000-8000-000000000001', B)), /row-level security/);
  });

  it('başkasının satırını güncelleyemez: etkilenen satır yok, veri aynı', async () => {
    const res = await as(B, `update public.vehicles set name = 'hacked' where id = $1`, [VA]);
    assert.equal(res.affectedRows, 0);
    const own = await as(A, 'select name from public.vehicles where id = $1', [VA]);
    assert.equal(own.rows[0].name, 'Clio');
  });

  it('başkasının kimliğiyle upsert edip sahipliği ele geçiremez', async () => {
    await assert.rejects(upsertVehicle(B, vehicle(VA, B, { updated_at: 9999, name: 'hacked' })), /row-level security/);
    const own = await as(A, 'select name, user_id from public.vehicles where id = $1', [VA]);
    assert.deepEqual(own.rows[0], { name: 'Clio', user_id: A });
  });

  it('kaydını başkasının aracına bağlayamaz', async () => {
    await assert.rejects(
      as(
        A,
        `insert into public.fuel_entries (id, user_id, created_at, updated_at, vehicle_id, date, odometer_km,
           liters, total_price, unit_price, fuel_type, is_full)
         values ('30000000-0000-4000-8000-000000000001', $1, 1, 1, $2, 1, 100, 40, 1600, 40, 'petrol', true)`,
        [A, VB],
      ),
      /foreign key/,
    );
  });

  it('satır silemez; silme işaretle yapılır', async () => {
    await assert.rejects(as(A, 'delete from public.vehicles where id = $1', [VA]), /permission denied/);
    const res = await as(A, 'update public.vehicles set deleted_at = 5000, updated_at = 5000 where id = $1', [VA]);
    assert.equal(res.affectedRows, 1);
  });

  it('giriş yapmamış (anon) hiçbir şeyi okuyamaz', async () => {
    await assert.rejects(as(null, 'select * from public.vehicles'), /permission denied/);
  });
});

describe('sunucu kuralları', () => {
  it('eski updated_at yeniyi ezmez; yenisi yazılır ve çekme imleci ilerler', async () => {
    const before1 = (await as(A, 'select server_updated_at from public.vehicles where id = $1', [VA])).rows[0];
    await upsertVehicle(A, vehicle(VA, A, { updated_at: 4000, name: 'eski' }));
    let row = (await as(A, 'select name, updated_at, server_updated_at from public.vehicles where id = $1', [VA]))
      .rows[0];
    assert.equal(Number(row.updated_at), 5000);
    assert.notEqual(row.name, 'eski');

    await upsertVehicle(A, vehicle(VA, A, { updated_at: 6000, name: 'yeni' }));
    row = (await as(A, 'select name, server_updated_at from public.vehicles where id = $1', [VA])).rows[0];
    assert.equal(row.name, 'yeni');
    assert.ok(Number(row.server_updated_at) > Number(before1.server_updated_at));
  });

  it('geçersiz veri sunucuda reddedilir (CHECK)', async () => {
    await assert.rejects(
      as(
        A,
        `insert into public.fuel_entries (id, user_id, created_at, updated_at, vehicle_id, date, odometer_km,
           liters, total_price, unit_price, fuel_type, is_full)
         values ('30000000-0000-4000-8000-000000000002', $1, 1, 1, $2, 1, 100, -5, 1600, 40, 'nitro', true)`,
        [A, VA],
      ),
      /check constraint/,
    );
  });
});

describe('kota ve değerler', () => {
  it('araç kotası (100) dolunca yeni araç eklenemez, mevcut araç düzenlenebilir', async () => {
    // B'nin 1 aracı var; 99 tane daha (kota tam dolar).
    await db.exec(`
      insert into public.vehicles (id, user_id, created_at, updated_at, name, fuel_types, odometer_km)
      select gen_random_uuid(), '${B}', 1, 1, 'Araç ' || g, '["petrol"]', 0 from generate_series(1, 99) g;`);
    await assert.rejects(upsertVehicle(B, vehicle('20000000-0000-4000-8000-000000000101', B)), /row quota exceeded/);
    await upsertVehicle(B, vehicle(VB, B, { updated_at: 7000, name: 'Doblo düzenlendi' }));
    const row = await as(B, 'select name from public.vehicles where id = $1', [VB]);
    assert.equal(row.rows[0].name, 'Doblo düzenlendi');
  });

  it('kota kullanıcı başınadır: başkasının dolu kotası seni etkilemez', async () => {
    await upsertVehicle(A, vehicle('20000000-0000-4000-8000-000000000102', A, { name: 'İkinci' }));
    const rows = await as(A, 'select count(*)::int as n from public.vehicles');
    assert.equal(rows.rows[0].n, 2);
  });

  it('dizi sütunlarında yalnız bilinen değerler', async () => {
    await assert.rejects(
      upsertVehicle(A, vehicle('20000000-0000-4000-8000-000000000103', A, { fuel_types: '["nitro"]' })),
      /check constraint/,
    );
    await assert.rejects(
      as(
        A,
        `insert into public.expenses (id, user_id, created_at, updated_at, vehicle_id, date, category, subtypes, amount)
         values ('40000000-0000-4000-8000-000000000001', $1, 1, 1, $2, 1, 'service', '["oil","rocket"]', 100)`,
        [A, VA],
      ),
      /check constraint/,
    );
    await as(
      A,
      `insert into public.expenses (id, user_id, created_at, updated_at, vehicle_id, date, category, subtypes, amount)
       values ('40000000-0000-4000-8000-000000000002', $1, 1, 1, $2, 1, 'service', '["oil","filter"]', 100)`,
      [A, VA],
    );
  });
});

describe('hesap silme', () => {
  it('giriş yapmamış çağıramaz', async () => {
    await assert.rejects(as(null, 'select public.delete_account()'), /permission denied/);
  });

  it('kullanıcı yalnız kendini ve kendi kayıtlarını siler', async () => {
    await as(A, 'select public.delete_account()');
    const users = await db.query('select id from auth.users order by id');
    assert.deepEqual(
      users.rows.map((r) => r.id),
      [B],
    );
    // A'nın hiçbir kaydı kalmadı (araçlar ve onlara bağlı masraflar); B'nin bütün araçları duruyor.
    const ofA = await db.query(
      `select (select count(*) from public.vehicles where user_id = $1)::int as v,
              (select count(*) from public.expenses where user_id = $1)::int as e`,
      [A],
    );
    assert.deepEqual(ofA.rows[0], { v: 0, e: 0 });
    const ofB = await db.query('select count(*)::int as n from public.vehicles where user_id = $1', [B]);
    assert.equal(ofB.rows[0].n, 100);
  });
});
