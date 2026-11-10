import { ErrorCode } from 'expo-iap/build/types';

import type * as Purchase from './purchase';

// Satın alma akışı expo-iap'ın sahtesiyle denenir; yerel modül testte yoktur. Hata kodları kütüphanenin kendi
// listesinden gelir: kütüphane bir kodun adını değiştirirse bu testler düşer.
const SKU = 'com.miracdeprem.ruhsat.removeads';
const mockIap = {
  initConnection: jest.fn(),
  purchaseUpdatedListener: jest.fn(),
  purchaseErrorListener: jest.fn(),
  fetchProducts: jest.fn(),
  getAvailablePurchases: jest.fn(),
  requestPurchase: jest.fn(),
  restorePurchases: jest.fn(),
  finishTransaction: jest.fn(),
};
const mockSetAdsRemoved = jest.fn();

jest.mock('expo-iap', () => mockIap);
jest.mock('./config', () => ({
  nativeStoreAvailable: true,
  REMOVE_ADS_SKU: 'com.miracdeprem.ruhsat.removeads',
}));
jest.mock('./entitlement', () => ({
  setAdsRemoved: (value: boolean) => mockSetAdsRemoved(value),
}));

let store: typeof Purchase;
let onUpdate: (purchase: unknown) => Promise<void>;
let onError: (error: unknown) => void;

/** Kütüphanenin hata biçimi: kodu taşıyan Error. */
function storeError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/** Gerçek kütüphane gibi: hata önce purchaseErrorListener'a iletilir, sonra istek reddedilir. */
function failPurchaseWith(code: string) {
  mockIap.requestPurchase.mockImplementation(async () => {
    const error = storeError(code);
    onError(error);
    throw error;
  });
}

beforeEach(() => {
  Object.values(mockIap).forEach((fn) => fn.mockReset());
  mockSetAdsRemoved.mockReset();
  mockIap.initConnection.mockResolvedValue(true);
  mockIap.purchaseUpdatedListener.mockImplementation((listener) => {
    onUpdate = listener;
    return { remove: jest.fn() };
  });
  mockIap.purchaseErrorListener.mockImplementation((listener) => {
    onError = listener;
    return { remove: jest.fn() };
  });
  mockIap.fetchProducts.mockResolvedValue([{ id: SKU, displayPrice: '₺149,99' }]);
  mockIap.getAvailablePurchases.mockResolvedValue([]);
  mockIap.restorePurchases.mockResolvedValue(undefined);
  mockIap.finishTransaction.mockResolvedValue(undefined);
  // Modülün durumu (bağlantı, dinleyiciler, bildirim) her testte sıfırdan başlar.
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require('./purchase');
  });
});

describe('noticeForStoreError', () => {
  it('vazgeçmek uyarı göstermez', () => {
    expect(store.noticeForStoreError(storeError(ErrorCode.UserCancelled))).toBeNull();
  });

  it('Satın Almak İçin Sor onay bekliyor bildirimi verir', () => {
    expect(store.noticeForStoreError(storeError(ErrorCode.DeferredPayment))).toBe('pending');
  });

  it('başka her hata ve kodsuz hata başarısız sayılır', () => {
    expect(store.noticeForStoreError(storeError(ErrorCode.NetworkError))).toBe('failed');
    expect(store.noticeForStoreError(storeError(ErrorCode.Unknown))).toBe('failed');
    expect(store.noticeForStoreError(new Error('bağlantı yok'))).toBe('failed');
    expect(store.noticeForStoreError('bağlantı yok')).toBe('failed');
    expect(store.noticeForStoreError(null)).toBe('failed');
    expect(store.noticeForStoreError(undefined)).toBe('failed');
  });
});

describe('Reklamları kaldır', () => {
  it('ödeme penceresini kapatan kullanıcıya uyarı çıkmaz', async () => {
    failPurchaseWith(ErrorCode.UserCancelled);
    await store.buyRemoveAds();
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: null });
    expect(mockSetAdsRemoved).not.toHaveBeenCalledWith(true);
  });

  it('Satın Almak İçin Sor isteğinde onay beklendiği söylenir', async () => {
    failPurchaseWith(ErrorCode.DeferredPayment);
    await store.buyRemoveAds();
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: 'pending' });
  });

  it('gerçek bir hatada başarısız bildirimi verilir', async () => {
    failPurchaseWith(ErrorCode.NetworkError);
    await store.buyRemoveAds();
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: 'failed' });
  });

  it('hata dinleyicisi tek başına uyarı vermez, yalnız beklemeyi kapatır', async () => {
    await store.startStore();
    onError(storeError(ErrorCode.NetworkError));
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: null });
  });

  it('başarılı satın alma reklamları kaldırır ve işlemi bitirir', async () => {
    const purchase = { productId: SKU, purchaseState: 'purchased' };
    mockIap.requestPurchase.mockImplementation(async () => {
      await onUpdate(purchase);
      return purchase;
    });
    await store.buyRemoveAds();
    expect(mockSetAdsRemoved).toHaveBeenLastCalledWith(true);
    expect(mockIap.finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: 'purchased' });
  });

  it('ödemesi tamamlanmamış işlem reklamları kaldırmaz', async () => {
    await store.startStore();
    mockSetAdsRemoved.mockClear();
    await onUpdate({ productId: SKU, purchaseState: 'pending' });
    expect(mockSetAdsRemoved).not.toHaveBeenCalled();
    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
    expect(store.storeSnapshot().notice).toBe('pending');
  });
});

describe('Satın alımları geri yükle', () => {
  it('Apple kimliği penceresini kapatan kullanıcıya uyarı çıkmaz', async () => {
    mockIap.restorePurchases.mockRejectedValue(storeError(ErrorCode.UserCancelled));
    await store.restorePurchases();
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: null });
  });

  it('bu Apple kimliğinde satın alma yoksa bunu söyler', async () => {
    await store.restorePurchases();
    expect(mockSetAdsRemoved).toHaveBeenLastCalledWith(false);
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: 'nothing' });
  });

  it('satın alma bulunursa reklamlar kalkar', async () => {
    mockIap.getAvailablePurchases.mockResolvedValue([{ productId: SKU }]);
    await store.restorePurchases();
    expect(mockSetAdsRemoved).toHaveBeenLastCalledWith(true);
    expect(store.storeSnapshot()).toMatchObject({ busy: null, notice: 'restored' });
  });
});

describe('mağaza bağlantısı', () => {
  it('açılışta fiyatı alır ve hakkı doğrular', async () => {
    await store.startStore();
    expect(mockIap.fetchProducts).toHaveBeenCalledWith({ skus: [SKU], type: 'in-app' });
    expect(store.storeSnapshot().price).toBe('₺149,99');
    expect(mockSetAdsRemoved).toHaveBeenLastCalledWith(false);
  });

  it('fiyat alınamazsa yeniden dener ama dinleyicileri bir kez kurar', async () => {
    mockIap.fetchProducts.mockRejectedValueOnce(storeError(ErrorCode.NetworkError));
    await store.startStore();
    expect(store.storeSnapshot().price).toBeNull();

    await store.startStore();
    expect(mockIap.initConnection).toHaveBeenCalledTimes(2);
    expect(store.storeSnapshot().price).toBe('₺149,99');
    expect(mockIap.purchaseUpdatedListener).toHaveBeenCalledTimes(1);
    expect(mockIap.purchaseErrorListener).toHaveBeenCalledTimes(1);
  });
});
