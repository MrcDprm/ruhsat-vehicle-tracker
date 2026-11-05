-- Son taramadan iki düzeltme (Supabase SQL Editor'da bir kez çalıştırılır; 0001 ve 0002'den sonra).

-- ── 1. Kullanıcı başına satır kotası ─────────────────────────────────────
-- Supabase'in veri API'sinde kullanıcı başına hız sınırı yok: giriş yapmış biri uygulamayı atlayıp sınırsız satır
-- yazarak ücretsiz katmanın veritabanını doldurabilirdi (herkesi etkiler). Gerçek bir kullanıcının hiç yaklaşmayacağı
-- sınırlar konur. Yalnız gerçekten yeni satır sayılır: PostgREST upsert'ünde BEFORE INSERT tetikleyicisi satır zaten
-- varken de çalışır; kotası dolu kullanıcı mevcut kaydını düzenleyebilmeli.
-- Hata kodu check_violation: uygulamanın eşitleme motoru bunu "bu satır kabul edilmedi" sayar, satır telefonda kalır.
create or replace function public.enforce_row_quota() returns trigger
language plpgsql set search_path = ''
as $$
declare
  quota integer := tg_argv[0]::integer;
  existing boolean;
  used bigint;
begin
  execute format('select exists (select 1 from %I.%I where id = $1)', tg_table_schema, tg_table_name)
    into existing using new.id;
  if existing then
    return new;
  end if;
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into used using new.user_id;
  if used >= quota then
    raise exception 'row quota exceeded for %', tg_table_name using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger vehicles_quota before insert on public.vehicles
  for each row execute function public.enforce_row_quota('100');
create trigger fuel_entries_quota before insert on public.fuel_entries
  for each row execute function public.enforce_row_quota('20000');
create trigger expenses_quota before insert on public.expenses
  for each row execute function public.enforce_row_quota('20000');
create trigger reminders_quota before insert on public.reminders
  for each row execute function public.enforce_row_quota('2000');

-- ── 2. Dizi sütunlarının içeriği ────────────────────────────────────────
-- 0001 dizinin varlığını ve uzunluğunu doğruluyordu; içindeki değerler de uygulamanın bildiği değerlerle sınırlanır.
alter table public.vehicles add constraint vehicles_fuel_types_values
  check (fuel_types <@ '["petrol", "diesel", "lpg", "hybrid", "electric"]'::jsonb);
alter table public.expenses add constraint expenses_subtypes_values
  check (subtypes is null or subtypes <@ '["oil", "filter", "tyre", "brake", "battery", "other"]'::jsonb);
