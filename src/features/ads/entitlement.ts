import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// "Reklamlar kaldırıldı" bilgisi. Kaynağı App Store: satın alma Apple kimliğine bağlıdır, hesaba değil (Apple'ın geri
// yükleme kuralı). Burada yalnız son bilinen durum tutulur; uygulama açılınca StoreKit'ten yeniden doğrulanır
// (iade edilen satın alma reklamları geri getirir). Sunucu yok: tek ürün, kilitli içerik yok (plan: sunucusuz doğrulama).
const KEY = 'ads.removed';
const listeners = new Set<() => void>();
let removed = Storage.getItemSync(KEY) === '1';

export function adsRemoved(): boolean {
  return removed;
}

export function setAdsRemoved(value: boolean): void {
  if (value === removed) return;
  removed = value;
  if (value) Storage.setItemSync(KEY, '1');
  else Storage.removeItemSync(KEY);
  listeners.forEach((l) => l());
}

export function useAdsRemoved(): boolean {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, adsRemoved);
}
