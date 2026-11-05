// RLS testleri: supabase/migrations/0001_sync_tables.sql gerçek bir Postgres'te (PGlite, WebAssembly) çalıştırılır;
// Supabase'in auth şeması, rolleri ve varsayılan yetkileri taklit edilir. Böylece veriyi koruyan şey Supabase'teki gibi
// gerçekten RLS olur. İki kullanıcı (A, B) birbirinin kaydını okuyamamalı ve yazamamalı.
//
//   npm run test:rls                 → hepsi geçmeli
//   RLS_BREAK=1 npm run test:rls     → okuma kuralı bilerek "herkes görür" yapılır; testler DÜŞMELİ
//                                      (testin gerçekten hata yakaladığının kanıtı)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(join(here, '..', 'migrations', '0001_sync_tables.sql'), 'utf8');

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
  await db.exec(migration);
  if (process.env.RLS_BREAK === '1') {
    await db.exec(`alter policy "own rows: select" on public.vehicles using (true);`);
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
    const left = await db.query('select id, user_id from public.vehicles');
    assert.deepEqual(left.rows, [{ id: VB, user_id: B }]);
  });
});
