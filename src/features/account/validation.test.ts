import { authErrorKey, isValidEmail, normalizeEmail, sanitizeCode } from './validation';

describe('e-posta', () => {
  it('boşlukları atar, küçük harfe çevirir', () =>
    expect(normalizeEmail('  Miraç@Example.COM ')).toBe('miraç@example.com'));

  it.each(['a@b.co', 'ad.soyad+ruhsat@gmail.com', 'x@mail.example.com.tr'])('geçerli: %p', (e) =>
    expect(isValidEmail(e)).toBe(true),
  );

  it.each(['', 'abc', 'a@b', 'a@b.c', 'a b@c.com', '@c.com', 'a@.com', 'a@b..com', `${'x'.repeat(250)}@b.com`])(
    'geçersiz: %p',
    (e) => expect(isValidEmail(e)).toBe(false),
  );
});

describe('sanitizeCode', () => {
  it('yalnız rakam, en çok 6 hane', () => {
    expect(sanitizeCode('123 456')).toBe('123456');
    expect(sanitizeCode('Kodun: 987654.')).toBe('987654');
    expect(sanitizeCode('12345678')).toBe('123456');
    expect(sanitizeCode('abc')).toBe('');
  });
});

describe('authErrorKey', () => {
  it.each([
    [{ code: 'otp_expired', status: 403 }, 'auth.error.codeWrong'],
    [{ code: 'over_email_send_rate_limit', status: 429 }, 'auth.error.rateLimit'],
    [{ status: 429 }, 'auth.error.rateLimit'],
    [{ code: 'email_address_invalid' }, 'auth.error.email'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'auth.error.offline'],
    [{ message: 'Network request failed' }, 'auth.error.offline'],
    [{ code: 'unexpected_failure', status: 500 }, 'auth.error.generic'],
    [null, 'auth.error.generic'],
  ])('%p → %s', (error, key) => expect(authErrorKey(error)).toBe(key));
});
