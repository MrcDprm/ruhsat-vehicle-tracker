import { useEffect, useSyncExternalStore } from 'react';

import { nativeStoreAvailable } from './config';
import { adsRemoved } from './entitlement';

// AdMob başlatma ve onay. Yalnız kişiselleştirilmemiş reklam istenir: takip izni (ATT) penceresi yok.
// AB/AEA'daki kullanıcıya Google'ın onay penceresi (UMP) gösterilir; başka bölgede pencere çıkmaz.
// Başlatma ilk banner görünürken yapılır (açılışta pencere ya da reklam yok); reklamlar kaldırıldıysa hiç yapılmaz.

type Ads = typeof import('react-native-google-mobile-ads');
export const adsModule = (): Ads | null =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeStoreAvailable ? (require('react-native-google-mobile-ads') as Ads) : null;

type AdsState = { ready: boolean; privacyOptions: boolean };
let state: AdsState = { ready: false, privacyOptions: false };
const listeners = new Set<() => void>();
function set(patch: Partial<AdsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let starting: Promise<void> | null = null;

function start(): Promise<void> {
  starting ??= (async () => {
    const m = adsModule();
    if (!m || adsRemoved()) return;
    try {
      const info = await m.AdsConsent.gatherConsent();
      set({ privacyOptions: info.privacyOptionsRequirementStatus === 'REQUIRED' });
      if (!info.canRequestAds) return;
      await m.default().initialize();
      set({ ready: true });
    } catch {
      // Onay formu ya da SDK açılamadıysa reklam yok; uygulama etkilenmez, sonraki açılışta yeniden denenir.
      starting = null;
    }
  })();
  return starting;
}

/** Banner'ın kullandığı durum; ilk çağrıda başlatmayı tetikler. */
export function useAdsReady(): boolean {
  useEffect(() => {
    start();
  }, []);
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => state.ready,
  );
}

/** Ayarlar > "Reklam gizlilik seçenekleri" satırı yalnız Google gerekli dediğinde (AB) görünür. */
export function usePrivacyOptionsRequired(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => state.privacyOptions,
  );
}

export async function showPrivacyOptions(): Promise<void> {
  const m = adsModule();
  if (!m) return;
  await m.AdsConsent.showPrivacyOptionsForm().catch(() => {});
}
