// Giriş ekranlarının saf kuralları: e-posta, 6 haneli kod, hata mesajı. Testler telefonsuz çalışır.

export const CODE_LENGTH = 6;
/** Kodu yeniden gönderme beklemesi; Supabase'in e-posta hız sınırına takılmamak ve spam'i önlemek için. */
export const RESEND_SECONDS = 60;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(email);
}

/** Yapıştırılan "123 456" ya da "Kodun: 123456" gibi metinden yalnız rakamlar, en çok 6. */
export function sanitizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export type AuthErrorKey =
  'auth.error.codeWrong' | 'auth.error.rateLimit' | 'auth.error.email' | 'auth.error.offline' | 'auth.error.generic';

/** Supabase hatasından kullanıcıya gösterilecek anlamlı mesaj (çeviri anahtarı). Ham hata metni hiç gösterilmez. */
export function authErrorKey(error: unknown): AuthErrorKey {
  const e = (error ?? {}) as { code?: string; status?: number; name?: string; message?: string };
  if (e.code === 'otp_expired' || e.code === 'invalid_otp') return 'auth.error.codeWrong';
  if (e.code === 'over_email_send_rate_limit' || e.code === 'over_request_rate_limit' || e.status === 429) {
    return 'auth.error.rateLimit';
  }
  if (e.code === 'email_address_invalid' || e.code === 'validation_failed') return 'auth.error.email';
  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || /network|fetch/i.test(e.message ?? '')) {
    return 'auth.error.offline';
  }
  return 'auth.error.generic';
}
