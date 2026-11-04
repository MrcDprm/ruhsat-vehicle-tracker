// Türkiye plakası (Karayolları Trafik Yönetmeliği): il kodu 01-81, 1-3 harf, harf sayısına göre rakam sayısı:
//   1 harf + 4-5 rakam (34 A 1234), 2 harf + 3-4 rakam (34 AB 123), 3 harf + 2-3 rakam (34 ABC 12).
// Harf grubunda Ç, Ğ, İ, Ö, Ş, Ü ve Q, W, X kullanılmaz.
const LETTERS = new Set('ABCDEFGHIJKLMNOPRSTUVYZ');
const DIGITS_FOR_LETTERS: Record<number, [min: number, max: number]> = { 1: [4, 5], 2: [3, 4], 3: [2, 3] };
export const FOREIGN_PLATE_MAX = 12;

/** Türkçe klavyedeki i/ı/İ plakada I olur; geri kalanı büyük harfe çevrilir. */
function upper(raw: string): string {
  return raw.replace(/[iıİ]/g, 'I').toUpperCase();
}

/**
 * Yazarken maske: il kodu (2 rakam) → harfler (en fazla 3, izinli harflerden) → rakamlar (harf sayısının izin verdiği
 * kadar). Sıraya uymayan ya da fazla karakter alınmaz, gruplar arasına boşluk kendiliğinden girer.
 */
export function maskTurkishPlate(raw: string): string {
  const chars = upper(raw).replace(/[^A-Z0-9]/g, '');
  let province = '';
  let letters = '';
  let digits = '';
  for (const c of chars) {
    const isDigit = c >= '0' && c <= '9';
    if (province.length < 2) {
      if (isDigit) province += c;
    } else if (digits === '' && letters.length < 3 && LETTERS.has(c)) {
      letters += c;
    } else if (isDigit && letters.length > 0 && digits.length < DIGITS_FOR_LETTERS[letters.length][1]) {
      digits += c;
    }
  }
  return [province, letters, digits].filter(Boolean).join(' ');
}

/** Yurt dışı plakası: büyük harf, rakam, tek boşluk; en fazla 12 karakter. */
export function maskForeignPlate(raw: string): string {
  return upper(raw)
    .replace(/[-.]/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ /, '')
    .slice(0, FOREIGN_PLATE_MAX);
}

export type PlateProblem = 'province' | 'format' | null;

/** Tamamlanmış Türk plakasını denetler (maskeden geçmiş değer beklenir). */
export function checkTurkishPlate(plate: string): PlateProblem {
  const m = /^(\d{2}) ([A-Z]{1,3}) (\d{2,5})$/.exec(plate);
  if (!m) return 'format';
  const province = Number(m[1]);
  if (province < 1 || province > 81) return 'province';
  const [min, max] = DIGITS_FOR_LETTERS[m[2].length];
  return m[3].length >= min && m[3].length <= max ? null : 'format';
}

export function isTurkishPlate(plate: string): boolean {
  return (
    checkTurkishPlate(maskTurkishPlate(plate)) === null &&
    maskTurkishPlate(plate).replace(/ /g, '') === upper(plate).replace(/[^A-Z0-9]/g, '')
  );
}

/** Karşılaştırma anahtarı: boşluksuz büyük harf ("34abc 123" = "34 ABC 123"). */
export function plateKey(plate: string): string {
  return upper(plate).replace(/[^A-Z0-9]/g, '');
}
