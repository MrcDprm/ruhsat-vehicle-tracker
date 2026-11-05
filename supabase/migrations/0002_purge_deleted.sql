-- Silindi işaretli satırları 30 gün sonra sunucudan temizler (docs/plan.md "Eşitleme tasarımı" madde 3).
-- pg_cron gerekir: Supabase panelinde Database > Extensions > pg_cron açılır, sonra bu dosya çalıştırılır.
-- Telefon 30 günden uzun eşitlenmezse ilk eşitlemede tam karşılaştırma yapar (src/sync/engine.ts), hayalet kayıt kalmaz.

create extension if not exists pg_cron;

create or replace function public.purge_deleted() returns void
language sql security definer set search_path = ''
as $$
  delete from public.fuel_entries where deleted_at < public.now_ms() - 30::bigint * 86400000;
  delete from public.expenses where deleted_at < public.now_ms() - 30::bigint * 86400000;
  delete from public.reminders where deleted_at < public.now_ms() - 30::bigint * 86400000;
  delete from public.vehicles where deleted_at < public.now_ms() - 30::bigint * 86400000;
$$;

revoke execute on function public.purge_deleted() from public, anon, authenticated;

-- Her gece 03:30 (UTC).
select cron.schedule('ruhsat-purge-deleted', '30 3 * * *', 'select public.purge_deleted()');
