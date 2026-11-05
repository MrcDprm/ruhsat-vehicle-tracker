-- Ruhsat: eşitleme tabloları, sunucu doğrulaması, RLS ve hesap silme (docs/plan.md "Eşitleme tasarımı").
-- Supabase SQL Editor'da bir kez çalıştırılır. Telefondaki SQLite şemasıyla aynı sütunlar; zamanlar epoch milisaniye.

-- Şu anki zaman, milisaniye. clock_timestamp: aynı işlemdeki satırlar da farklı değer alır.
create or replace function public.now_ms() returns bigint
language sql volatile set search_path = ''
as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- ── Tablolar ─────────────────────────────────────────────────────────────
-- Ortak sütunlar: id telefonda üretilen UUID; silme satırı kaldırmaz, deleted_at doldurur (eşitlenebilsin diye);
-- server_updated_at çekme imleci, tetikleyici yazar. Fiziksel silme yalnız hesap silmede (auth.users → cascade).
-- CHECK kısıtları sunucu tarafı doğrulamadır: telefon atlatılsa da bozuk ya da aşırı büyük veri yazılamaz.

create table public.vehicles (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at bigint not null default public.now_ms(),
  name text not null check (char_length(name) between 1 and 80),
  make text check (char_length(make) <= 80),
  model text check (char_length(model) <= 80),
  year integer check (year between 1900 and 2100),
  plate text check (char_length(plate) <= 20),
  fuel_types jsonb not null check (jsonb_typeof(fuel_types) = 'array' and jsonb_array_length(fuel_types) between 1 and 5),
  tank_liters double precision check (tank_liters > 0 and tank_liters <= 1000),
  odometer_km integer not null check (odometer_km between 0 and 2000000),
  unique (id, user_id)
);

-- Kayıt yalnız kendi aracına bağlanabilir: (vehicle_id, user_id) çifti araçlarda olmalı.
create table public.fuel_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at bigint not null default public.now_ms(),
  vehicle_id uuid not null,
  date bigint not null,
  odometer_km integer not null check (odometer_km between 0 and 2000000),
  liters double precision not null check (liters > 0 and liters <= 1000),
  total_price double precision not null check (total_price > 0 and total_price <= 10000000),
  unit_price double precision not null check (unit_price > 0 and unit_price <= 100000),
  fuel_type text not null check (fuel_type in ('petrol', 'diesel', 'lpg', 'electric')),
  is_full boolean not null,
  station text check (char_length(station) <= 120),
  note text check (char_length(note) <= 400),
  foreign key (vehicle_id, user_id) references public.vehicles (id, user_id) on delete cascade
);

create table public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at bigint not null default public.now_ms(),
  vehicle_id uuid not null,
  date bigint not null,
  odometer_km integer check (odometer_km between 0 and 2000000),
  category text not null check (category in (
    'service', 'inspection', 'traffic_insurance', 'casco', 'road_tax', 'fine', 'parking_toll', 'wash', 'other')),
  subtypes jsonb check (subtypes is null or (jsonb_typeof(subtypes) = 'array' and jsonb_array_length(subtypes) <= 6)),
  amount double precision not null check (amount > 0 and amount <= 100000000),
  note text check (char_length(note) <= 400),
  foreign key (vehicle_id, user_id) references public.vehicles (id, user_id) on delete cascade
);

create table public.reminders (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  server_updated_at bigint not null default public.now_ms(),
  vehicle_id uuid not null,
  kind text not null check (kind in ('inspection', 'traffic_insurance', 'casco', 'road_tax', 'service', 'custom')),
  title text check (char_length(title) <= 80),
  due_date bigint,
  due_km integer check (due_km between 0 and 5000000),
  interval_months integer check (interval_months between 1 and 240),
  interval_km integer check (interval_km between 1 and 1000000),
  last_done_date bigint,
  last_done_km integer check (last_done_km between 0 and 2000000),
  enabled boolean not null default true,
  foreign key (vehicle_id, user_id) references public.vehicles (id, user_id) on delete cascade
);

create index vehicles_pull on public.vehicles (user_id, server_updated_at);
create index fuel_entries_pull on public.fuel_entries (user_id, server_updated_at);
create index expenses_pull on public.expenses (user_id, server_updated_at);
create index reminders_pull on public.reminders (user_id, server_updated_at);

-- ── Son yazan kazanır ────────────────────────────────────────────────────
-- Gelen satırın updated_at'i sunucudakinden eskiyse güncelleme sessizce atlanır (satır başına "son yazan kazanır").
-- Sahip ve oluşturma zamanı değiştirilemez; her gerçek yazımda çekme imleci ilerler.
create or replace function public.sync_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.server_updated_at := public.now_ms();
  return new;
end;
$$;

create trigger vehicles_sync before insert or update on public.vehicles
  for each row execute function public.sync_guard();
create trigger fuel_entries_sync before insert or update on public.fuel_entries
  for each row execute function public.sync_guard();
create trigger expenses_sync before insert or update on public.expenses
  for each row execute function public.sync_guard();
create trigger reminders_sync before insert or update on public.reminders
  for each row execute function public.sync_guard();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Yalnız giriş yapmış kullanıcı ve yalnız kendi satırları: okuma, ekleme, güncelleme. Silme politikası yok:
-- silme işaretle yapılır (update), fiziksel silme yalnız delete_account ile. Anon rol hiçbir şeye erişemez.
alter table public.vehicles enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.reminders enable row level security;

create policy "own rows: select" on public.vehicles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.vehicles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.vehicles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.fuel_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.fuel_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.fuel_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.expenses for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.expenses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.expenses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows: select" on public.reminders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.reminders for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.reminders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.vehicles, public.fuel_entries, public.expenses, public.reminders from anon;
revoke delete, truncate on public.vehicles, public.fuel_entries, public.expenses, public.reminders from authenticated;

-- ── Hesap silme (Apple şartı) ────────────────────────────────────────────
-- Çağıran yalnız kendi kullanıcısını siler; bütün tablolar user_id → auth.users cascade ile temizlenir.
-- security definer: auth.users'a yalnız bu fonksiyon dokunabilir. Servis anahtarı hiçbir yerde kullanılmaz.
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
