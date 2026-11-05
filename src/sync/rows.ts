// Telefondaki satır (Drizzle, camelCase) ↔ sunucudaki satır (Postgres, snake_case). Saf; testler telefonsuz çalışır.
// Sütunlar iki tarafta aynı (docs/plan.md "Veri modeli"); yalnız dirty telefonda, server_updated_at sunucuda.

/** Gönderme ve birleştirme sırası: önce araçlar (diğer tablolar araca bağlı), sonra kayıtlar. */
export const SYNC_TABLES = ['vehicles', 'reminders', 'fuel_entries', 'expenses'] as const;
export type SyncTableName = (typeof SYNC_TABLES)[number];

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

type Row = Record<string, unknown>;

/** Gönderilecek satır: dirty düşer, user_id oturumdaki kullanıcı olur (hesapsız eklenmiş satır da hesaba geçer). */
export function toRemote(row: Row, userId: string): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'dirty') continue;
    out[toSnake(k)] = v;
  }
  out.user_id = userId;
  return out;
}

/** Sunucudan gelen satır: server_updated_at düşer, telefonda temiz (dirty = false) olarak yazılır. */
export function fromRemote(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'server_updated_at') continue;
    // Postgres bigint'leri JSON'da sayı ya da metin gelebilir; telefonda hepsi sayı.
    out[toCamel(k)] = typeof v === 'string' && /_at$|^date$|_date$/.test(k) && /^\d+$/.test(v) ? Number(v) : v;
  }
  out.dirty = false;
  return out;
}

/**
 * Sunucudaki satır telefondakinin yerine yazılsın mı? Satır başına "son yazan kazanır":
 * telefonda yoksa ya da sunucudaki daha yeni (ya da aynı) sürümse evet; telefondaki daha yeniyse hayır,
 * o zaman telefondaki dirty satır bir sonraki gönderimde sunucuya gider.
 */
export function shouldApplyRemote(local: { updatedAt: number } | undefined, remote: { updated_at: number }): boolean {
  return local === undefined || Number(remote.updated_at) >= local.updatedAt;
}

/** Çekme imleci: son görülen server_updated_at'ten biraz geri. Aynı anda işlenen yazımlar sırasız düşebilir; kaçmasın. */
export const PULL_OVERLAP_MS = 10 * 60 * 1000;
/** Bu kadar süre eşitlenmeyen telefon tam karşılaştırma yapar: sunucu 30 günde silinmişleri temizler. */
export const FULL_RESYNC_AFTER_MS = 25 * 86_400_000;
export const LOCAL_PURGE_AFTER_MS = 30 * 86_400_000;

export function pullFrom(cursor: number, lastSyncAt: number, now: number): { from: number; full: boolean } {
  const full = cursor <= 0 || lastSyncAt <= 0 || now - lastSyncAt > FULL_RESYNC_AFTER_MS;
  return { from: full ? 0 : Math.max(0, cursor - PULL_OVERLAP_MS), full };
}

/** Toplu gönderim kaç satırlık parçalarla; çok büyük istek zaman aşımına düşmesin. */
export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
