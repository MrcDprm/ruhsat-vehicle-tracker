// Litre, tutar ve birim fiyat: ikisi girilince üçüncüsü hesaplanır.
// Hangisinin hesaplanacağını kullanıcının son dokunduğu iki alan belirler; üçüncüsü türetilir.

export type PriceField = 'liters' | 'total' | 'unit';
export type PriceValues = Record<PriceField, number | null>;

// Hiç dokunulmamış alanlar arasında önce tutar, sonra birim fiyat türetilir:
// düzenlemede litre değişince aynı birim fiyatla tutar yenilenir.
const DERIVE_PREFERENCE: PriceField[] = ['total', 'unit', 'liters'];

/** recent: en son düzenlenen başta. */
export function derivedField(recent: readonly PriceField[]): PriceField {
  const lastTwo = recent.slice(0, 2);
  const untouched = DERIVE_PREFERENCE.filter((f) => !lastTwo.includes(f));
  return untouched[0];
}

/** Son düzenlenen alanı listenin başına alır. */
export function touch(recent: readonly PriceField[], field: PriceField): PriceField[] {
  return [field, ...recent.filter((f) => f !== field)];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const usable = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;

/**
 * Türetilecek alanı diğer ikisinden hesaplar. Diğer ikisinden biri eksik ya da geçersizse null döner
 * (ekran türetilen alana dokunmaz, kullanıcının yazdığı kalır).
 */
export function derive(
  values: PriceValues,
  recent: readonly PriceField[],
): { field: PriceField; value: number } | null {
  const field = derivedField(recent);
  const { liters, total, unit } = values;
  if (field === 'total' && usable(liters) && usable(unit)) return { field, value: round2(liters * unit) };
  if (field === 'unit' && usable(liters) && usable(total)) return { field, value: round2(total / liters) };
  if (field === 'liters' && usable(total) && usable(unit)) return { field, value: round2(total / unit) };
  return null;
}
