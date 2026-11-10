import { useSyncExternalStore } from 'react';

import { REMOVE_ADS_SKU, nativeStoreAvailable } from './config';
import { setAdsRemoved } from './entitlement';

// "Reklamları kaldır" satın alması: StoreKit 2 (expo-iap). Modül yalnız kendi derlememizde yüklenir (Expo Go'da yok).
// StoreKit işlemi cihazda Apple imzasıyla doğrular; tek ürün ve kilitli içerik olmadığı için sunucu doğrulaması yok.

type Iap = typeof import('expo-iap');
// Expo Go'da modülü içe aktarmak bile çöktürür; yalnız gerektiğinde ve yalnız derlemede yüklenir.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iap = (): Iap | null => (nativeStoreAvailable ? (require('expo-iap') as Iap) : null);

/** Son işlemin sonucu; Ayarlar ekranı bir kez gösterir. */
export type StoreNotice = 'purchased' | 'restored' | 'nothing' | 'pending' | 'failed' | 'unavailable';

export type StoreState = {
  /** Ürünün yerel fiyatı ("₺149,99"); mağazaya ulaşılamadıysa null. */
  price: string | null;
  busy: 'buy' | 'restore' | null;
  notice: StoreNotice | null;
};

let state: StoreState = { price: null, busy: null, notice: null };
const listeners = new Set<() => void>();
function set(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Anlık durum; useStore bunu izler, testler doğrudan okur. */
export function storeSnapshot(): StoreState {
  return state;
}

export function useStore(): StoreState {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, storeSnapshot);
}

export function clearNotice(): void {
  set({ notice: null });
}

/**
 * Satın alma ya da geri yükleme hatasında kullanıcıya ne söyleneceği.
 * Vazgeçmek hata değildir: ödeme ya da Apple kimliği penceresini kapatan kullanıcıya uyarı çıkmaz.
 * Aile paylaşımındaki Satın Almak İçin Sor isteğini StoreKit ertelenmiş ödeme hatasıyla bitirir; kullanıcıya onay
 * beklendiği söylenir, onay gelince satın alma purchaseUpdatedListener'a düşer.
 */
export function noticeForStoreError(error: unknown): StoreNotice | null {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (code === 'user-cancelled') return null;
  if (code === 'deferred-payment') return 'pending';
  return 'failed';
}

/** Apple kimliğinde bu ürün var mı (StoreKit 2 current entitlements; giriş penceresi açmaz). */
async function owned(m: Iap): Promise<boolean> {
  const purchases = await m.getAvailablePurchases();
  return purchases.some((p) => p.productId === REMOVE_ADS_SKU);
}

let started = false;
let listening = false;

/**
 * Açılışta bir kez: mağazaya bağlanır, satın alma olaylarını dinler, fiyatı alır ve hakkı sessizce doğrular
 * (yeniden kurulumda reklamlar kendiliğinden kalkar, iade edilen satın almada geri gelir).
 * Mağaza yanıt vermezse son bilinen durum korunur.
 */
export async function startStore(): Promise<void> {
  const m = iap();
  if (!m || started) return;
  started = true;
  try {
    await m.initConnection();
    // Dinleyiciler bir kez kurulur: fiyat alınamayıp bağlantı yeniden denendiğinde aynı satın alma iki kez işlenmez.
    if (!listening) {
      listening = true;
      m.purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== REMOVE_ADS_SKU) return;
        // Ödemesi tamamlanmamış işlem reklamları kaldırmaz.
        if (purchase.purchaseState === 'pending') {
          set({ busy: null, notice: 'pending' });
          return;
        }
        setAdsRemoved(true);
        await m.finishTransaction({ purchase, isConsumable: false }).catch(() => {});
        set({ busy: null, notice: state.busy === 'restore' ? 'restored' : 'purchased' });
      });
      // expo-iap hatayı hem bu dinleyiciye hem isteğin kendisine iletir. Uyarı yalnız istekten verilir,
      // burada yalnız bekleme göstergesi kapanır; ikisi birden uyarı verince aynı pencere iki kez çıkabiliyordu.
      m.purchaseErrorListener(() => set({ busy: null }));
    }
    const products = await m.fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' });
    set({ price: products?.[0]?.displayPrice ?? null });
    setAdsRemoved(await owned(m));
  } catch {
    // Ağ yok ya da mağaza hazır değil: sonraki açılışta yeniden denenir.
    started = false;
  }
}

export async function buyRemoveAds(): Promise<void> {
  const m = iap();
  if (!m) return set({ notice: 'unavailable' });
  set({ busy: 'buy', notice: null });
  try {
    await startStore();
    // Başarılı satın alma purchaseUpdatedListener'a düşer; vazgeçme ve hata bu isteğin reddiyle gelir.
    await m.requestPurchase({ request: { apple: { sku: REMOVE_ADS_SKU } }, type: 'in-app' });
  } catch (error) {
    set({ busy: null, notice: noticeForStoreError(error) });
  }
}

/** "Satın alımları geri yükle": kullanıcı ister; App Store ile eşitlenir (gerekirse Apple kimliği sorulur). */
export async function restorePurchases(): Promise<void> {
  const m = iap();
  if (!m) return set({ notice: 'unavailable' });
  set({ busy: 'restore', notice: null });
  try {
    await startStore();
    await m.restorePurchases();
    const has = await owned(m);
    setAdsRemoved(has);
    set({ busy: null, notice: has ? 'restored' : 'nothing' });
  } catch (error) {
    set({ busy: null, notice: noticeForStoreError(error) });
  }
}
