import { isRunningInExpoGo } from 'expo';

// Reklam ve "Reklamları kaldır" ayarları (docs/plan.md "Reklam ve Reklamları kaldır").

/**
 * AdMob ve StoreKit yerel modüldür, Expo Go'da yoktur: orada reklam ve satın alma kapalı, uygulama çökmeden çalışır.
 * Kendi derlememizde (EAS development/production build) açılır.
 */
export const nativeStoreAvailable = !isRunningInExpoGo();

/** App Store Connect'teki tek seferlik (non-consumable) ürünün kimliği. */
export const REMOVE_ADS_SKU = 'com.miracdeprem.ruhsat.removeads';

/**
 * AdMob banner birimi. Kimlikler gizli değildir (uygulamanın içinde durur). Gerçek kimlik yayından önce yazılır;
 * null kaldıkça ve geliştirmede her zaman Google'ın test reklamı gösterilir: kendi reklamına dokunmak AdMob kuralı ihlalidir.
 */
export const BANNER_UNIT_ID_IOS: string | null = null;
