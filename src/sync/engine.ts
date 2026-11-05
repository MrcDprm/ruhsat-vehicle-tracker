import { and, eq, inArray, isNotNull, isNull, lt, ne, notInArray, or } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { db } from '@/db/client';
import { expenses, fuelEntries, reminders, vehicles } from '@/db/schema';
import { requestSync as requestNotificationSync } from '@/features/reminders/notifications';
import { requestWidgetSync } from '@/features/widget/sync';

import { sessionState, supabase } from './client';
import {
  LOCAL_PURGE_AFTER_MS,
  SYNC_TABLES,
  chunk,
  fromRemote,
  pullFrom,
  shouldApplyRemote,
  toRemote,
  type SyncTableName,
} from './rows';

// Çevrimdışı öncelikli eşitleme (docs/plan.md "Eşitleme tasarımı"). Asıl kaynak telefon; sunucu yedek ve köprü.
// 1. Gönder: dirty satırlar toplu upsert. Sunucudaki tetikleyici eski sürümü yazmaz (son yazan kazanır).
// 2. Çek: server_updated_at > imleç olan satırlar; telefondaki daha yeniyse dokunulmaz.
// 3. Temizle: 30 günden eski silinmiş satırlar telefondan kalkar.
// Hata kullanıcıyı durdurmaz: durum Ayarlar'da görünür, sonraki tetikte yeniden denenir.

const TABLES = { vehicles, reminders, fuel_entries: fuelEntries, expenses } as const;
// Drizzle'ın tablo türleri birleşik kullanılınca TypeScript daralamıyor; dört tablo da aynı ortak sütunlara sahip.
const t = (name: SyncTableName) => TABLES[name] as typeof vehicles;

const PAGE = 1000;
const PUSH_CHUNK = 200;
const cursorKey = (uid: string) => `sync.cursor.${uid}`;
const lastKey = (uid: string) => `sync.last.${uid}`;

export type SyncStatus =
  | { state: 'idle'; lastSyncAt: number | null; rejected: number }
  | { state: 'syncing'; lastSyncAt: number | null; rejected: number }
  | { state: 'error'; lastSyncAt: number | null; rejected: number; reason: 'offline' | 'auth' | 'server' };

let status: SyncStatus = { state: 'idle', lastSyncAt: null, rejected: 0 };
const listeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}

/** Eşitleme durumu (Ayarlar > Hesap); dış depoya abonelik. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => status,
  );
}

/** Telefonda henüz sunucuya gitmemiş satır sayısı (çıkışta uyarı için). */
export async function pendingCount(): Promise<number> {
  let n = 0;
  for (const name of SYNC_TABLES) {
    n += (
      await db
        .select({ id: t(name).id })
        .from(t(name))
        .where(eq(t(name).dirty, true))
    ).length;
  }
  return n;
}

function reasonOf(error: unknown): 'offline' | 'auth' | 'server' {
  const msg = String((error as { message?: string })?.message ?? error);
  if (/network|fetch|timed? ?out|offline/i.test(msg)) return 'offline';
  if (/jwt|auth|401|403/i.test(msg)) return 'auth';
  return 'server';
}

const DATA_ERROR = /^(22|23)/; // Postgres: veri hatası (22xxx) ve kısıt ihlali (23xxx)

/** Bir tablonun dirty satırlarını gönderir. Döner: sunucunun kabul etmediği satır sayısı. */
async function push(name: SyncTableName, uid: string): Promise<number> {
  const table = t(name);
  const rows = await db.select().from(table).where(eq(table.dirty, true));
  let rejected = 0;
  for (const part of chunk(rows, PUSH_CHUNK)) {
    let ok = part;
    const { error } = await supabase!.from(name).upsert(
      part.map((r) => toRemote(r, uid)),
      { onConflict: 'id' },
    );
    if (error) {
      // Tek bozuk satır bütün parçayı durdurmasın: veri hatasında satır satır dene, kabul edilmeyeni dirty bırak.
      if (!DATA_ERROR.test(error.code ?? '')) throw error;
      ok = [];
      for (const r of part) {
        const single = await supabase!.from(name).upsert(toRemote(r, uid), { onConflict: 'id' });
        if (single.error) {
          if (!DATA_ERROR.test(single.error.code ?? '')) throw single.error;
          rejected++;
        } else ok.push(r);
      }
    }
    // Yalnız gönderilen sürüm temizlenir: bu arada telefonda yeniden düzenlenen satır dirty kalır.
    db.transaction((tx) => {
      for (const r of ok) {
        tx.update(table)
          .set({ dirty: false, userId: uid })
          .where(and(eq(table.id, r.id), eq(table.updatedAt, r.updatedAt)))
          .run();
      }
    });
  }
  return rejected;
}

/** Sunucudaki değişiklikleri çeker ve birleştirir. Döner: [en büyük server_updated_at, görülen kimlikler, değişti mi]. */
async function pull(name: SyncTableName, from: number): Promise<[number, Set<string>, boolean]> {
  const table = t(name);
  let max = 0;
  let changed = false;
  const seen = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase!
      .from(name)
      .select('*')
      .gt('server_updated_at', from)
      .order('server_updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as Record<string, unknown>[];
    if (page.length === 0) break;

    const ids = page.map((r) => String(r.id));
    const locals = new Map(
      (await db.select({ id: table.id, updatedAt: table.updatedAt }).from(table).where(inArray(table.id, ids))).map(
        (l) => [l.id, l],
      ),
    );
    db.transaction((tx) => {
      for (const r of page) {
        seen.add(String(r.id));
        max = Math.max(max, Number(r.server_updated_at));
        if (!shouldApplyRemote(locals.get(String(r.id)), r as { updated_at: number })) continue;
        const row = fromRemote(r) as typeof vehicles.$inferInsert;
        tx.insert(table).values(row).onConflictDoUpdate({ target: table.id, set: row }).run();
        changed = true;
      }
    });
    if (page.length < PAGE) break;
  }
  return [max, seen, changed];
}

let running: Promise<void> | null = null;

/** Şimdi eşitle. Aynı anda ikinci çağrı ilkini bekler; oturum yoksa hiçbir şey yapmaz. */
export function syncNow(): Promise<void> {
  if (!running) running = run().finally(() => (running = null));
  return running;
}

async function run(): Promise<void> {
  const session = sessionState();
  if (!supabase || session.status !== 'signedIn') return;
  const uid = session.userId;
  const lastSyncAt = Number(Storage.getItemSync(lastKey(uid)) ?? 0) || null;
  setStatus({ state: 'syncing', lastSyncAt, rejected: status.rejected });
  try {
    let rejected = 0;
    for (const name of SYNC_TABLES) rejected += await push(name, uid);

    const now = Date.now();
    const cursor = Number(Storage.getItemSync(cursorKey(uid)) ?? 0);
    const { from, full } = pullFrom(cursor, lastSyncAt ?? 0, now);
    let newCursor = cursor;
    let changed = false;
    for (const name of SYNC_TABLES) {
      const [max, seen, didChange] = await pull(name, from);
      newCursor = Math.max(newCursor, max);
      changed ||= didChange;
      // Tam karşılaştırma: sunucuda artık olmayan (30 günde temizlenmiş) ve telefonda bekleyen değişikliği olmayan
      // satırlar telefondan da kalkar; uzun süre çevrimdışı kalan telefonda hayalet kayıt kalmaz.
      if (full) {
        const table = t(name);
        const gone = db
          .delete(table)
          .where(and(eq(table.dirty, false), seen.size ? notInArray(table.id, [...seen]) : undefined))
          .run();
        changed ||= gone.changes > 0;
      }
    }

    // Telefonda 30 günden eski, gönderilmiş silinmiş satırlar temizlenir.
    for (const name of SYNC_TABLES) {
      const table = t(name);
      db.delete(table)
        .where(and(eq(table.dirty, false), isNotNull(table.deletedAt), lt(table.deletedAt, now - LOCAL_PURGE_AFTER_MS)))
        .run();
    }

    Storage.setItemSync(cursorKey(uid), String(newCursor));
    Storage.setItemSync(lastKey(uid), String(now));
    setStatus({ state: 'idle', lastSyncAt: now, rejected });
    if (changed) {
      requestNotificationSync();
      requestWidgetSync();
    }
  } catch (e) {
    setStatus({ state: 'error', lastSyncAt, rejected: status.rejected, reason: reasonOf(e) });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Kayıttan sonra, öne gelince, internet gelince çağrılır; art arda gelenler tek eşitlemede birleşir. */
export function requestCloudSync(): void {
  if (!supabase) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(() => {});
  }, 1500);
}

/**
 * Girişte: telefondaki bütün satırlar bu hesaba geçer ve gönderilmek üzere işaretlenir. Hesapsız eklenen kayıtlar
 * hesaba yüklenir; hesapta zaten kayıt varsa çekmeyle birleşir (kimlikler UUID, çakışmaz).
 */
export function claimLocalData(uid: string): void {
  db.transaction((tx) => {
    for (const name of SYNC_TABLES) {
      const table = t(name);
      tx.update(table)
        .set({ userId: uid, dirty: true })
        .where(or(isNull(table.userId), ne(table.userId, uid)))
        .run();
    }
  });
}

/** Çıkışta kayıtlar telefonda kalırsa: hesapsız kayıt olurlar; sonra hangi hesaba girilirse oraya yüklenirler. */
export function releaseLocalData(uid: string): void {
  db.transaction((tx) => {
    for (const name of SYNC_TABLES) {
      tx.update(t(name)).set({ userId: null, dirty: true }).run();
    }
  });
  forgetCursor(uid);
}

export function forgetCursor(uid: string): void {
  Storage.removeItemSync(cursorKey(uid));
  Storage.removeItemSync(lastKey(uid));
  setStatus({ state: 'idle', lastSyncAt: null, rejected: 0 });
}
