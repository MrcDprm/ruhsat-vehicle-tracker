import {
  FULL_RESYNC_AFTER_MS,
  PULL_OVERLAP_MS,
  chunk,
  fromRemote,
  pullFrom,
  shouldApplyRemote,
  toRemote,
} from './rows';

const DAY = 86_400_000;

describe('toRemote / fromRemote', () => {
  const local = {
    id: 'f1',
    userId: null,
    createdAt: 1,
    updatedAt: 2,
    deletedAt: null,
    dirty: true,
    vehicleId: 'v1',
    date: 3,
    odometerKm: 88000,
    liters: 38.42,
    totalPrice: 1682.41,
    unitPrice: 43.79,
    fuelType: 'petrol',
    isFull: true,
    station: null,
    note: null,
  };

  it('gönderilen satır snake_case, dirty yok, user_id oturumdaki kullanıcı', () => {
    expect(toRemote(local, 'u1')).toEqual({
      id: 'f1',
      user_id: 'u1',
      created_at: 1,
      updated_at: 2,
      deleted_at: null,
      vehicle_id: 'v1',
      date: 3,
      odometer_km: 88000,
      liters: 38.42,
      total_price: 1682.41,
      unit_price: 43.79,
      fuel_type: 'petrol',
      is_full: true,
      station: null,
      note: null,
    });
  });

  it('gelen satır camelCase, server_updated_at yok, temiz; gidiş-dönüş aynı satırı verir', () => {
    const remote = { ...toRemote(local, 'u1'), server_updated_at: 99 };
    expect(fromRemote(remote)).toEqual({ ...local, userId: 'u1', dirty: false });
  });

  it('JSON dizi sütunları olduğu gibi geçer', () => {
    expect(toRemote({ fuelTypes: ['petrol', 'lpg'], dirty: false }, 'u')).toEqual({
      fuel_types: ['petrol', 'lpg'],
      user_id: 'u',
    });
    expect(fromRemote({ subtypes: ['oil'] })).toEqual({ subtypes: ['oil'], dirty: false });
  });

  it('metin olarak gelen bigint zamanlar sayıya çevrilir', () => {
    expect(fromRemote({ updated_at: '1730000000000', due_date: '5', note: '123' })).toEqual({
      updatedAt: 1730000000000,
      dueDate: 5,
      note: '123',
      dirty: false,
    });
  });
});

describe('shouldApplyRemote: satır başına son yazan kazanır', () => {
  it.each([
    [undefined, 5, true, 'telefonda yok'],
    [{ updatedAt: 4 }, 5, true, 'sunucudaki yeni'],
    [{ updatedAt: 5 }, 5, true, 'aynı sürüm'],
    [{ updatedAt: 6 }, 5, false, 'telefondaki yeni'],
  ] as const)('%p, sunucu %p → %p (%s)', (local, remote, expected, _why) => {
    expect(shouldApplyRemote(local, { updated_at: remote })).toBe(expected);
  });
});

describe('pullFrom', () => {
  const now = 100 * DAY;

  it('ilk eşitleme ya da imleç yok: baştan, tam karşılaştırma', () => {
    expect(pullFrom(0, 0, now)).toEqual({ from: 0, full: true });
  });

  it('düzenli eşitleme: imleçten biraz geri', () => {
    expect(pullFrom(now - DAY, now - DAY, now)).toEqual({ from: now - DAY - PULL_OVERLAP_MS, full: false });
  });

  it('uzun süre eşitlenmeyen telefon tam karşılaştırma yapar', () => {
    expect(pullFrom(now - 40 * DAY, now - FULL_RESYNC_AFTER_MS - 1, now)).toEqual({ from: 0, full: true });
  });
});

describe('chunk', () => {
  it('parçalara böler', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
