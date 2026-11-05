import { wipeLocalData } from '@/features/settings/wipe';
import { sessionState, supabase } from '@/sync/client';
import { claimLocalData, forgetCursor, releaseLocalData, requestCloudSync } from '@/sync/engine';

import { setOnboarded } from './onboarding';

// Hesap işlemleri. Şifre yok: e-postaya 6 haneli kod gider (Supabase Auth, Resend SMTP üzerinden).

function client() {
  if (!supabase) throw new Error('accounts not configured');
  return supabase;
}

/** Kod gönderir; hesap yoksa açılır (ayrı "kayıt ol" adımı yok). */
export async function sendCode(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

/**
 * Kodu doğrular. Başarılıysa telefondaki kayıtlar hesaba geçer ve eşitleme başlar (hesaptaki kayıtlarla birleşir).
 * Eşitleme hatası girişi bozmaz: kayıtlar telefonda güvende, sonraki tetikte gider.
 */
export async function verifyCode(email: string, code: string): Promise<void> {
  const { data, error } = await client().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
  const uid = data.user?.id ?? data.session?.user.id;
  if (!uid) throw new Error('no session');
  claimLocalData(uid);
  setOnboarded(true);
  // Oturum bilgisi bir sonraki olayda güncellenir; eşitleme kısa bir beklemeyle başlar.
  requestCloudSync();
}

/**
 * Çıkış. keepLocal: kayıtlar telefonda hesapsız kalır (sonra girilen hesaba yüklenir).
 * Değilse telefondaki kopya silinir; hesaptaki kayıtlar sunucuda durur, tekrar girince geri gelir.
 */
export async function signOut(keepLocal: boolean): Promise<void> {
  const session = sessionState();
  if (session.status !== 'signedIn') return;
  if (keepLocal) releaseLocalData(session.userId);
  else {
    wipeLocalData();
    forgetCursor(session.userId);
  }
  // Sunucudaki oturumu da kapatmayı dener; internet yoksa yalnız telefondaki oturum silinir.
  const { error } = await client().auth.signOut();
  if (error) await client().auth.signOut({ scope: 'local' });
}

/**
 * Hesabı sil (Apple şartı): sunucudaki kullanıcı ve bütün kayıtları silinir (delete_account, RLS ile yalnız kendisi),
 * sonra telefondaki kopya ve oturum. Uygulama karşılama ekranına döner. İnternet gerekir; hata olursa hiçbir şey silinmez.
 */
export async function deleteAccount(): Promise<void> {
  const session = sessionState();
  if (session.status !== 'signedIn') return;
  const { error } = await client().rpc('delete_account');
  if (error) throw error;
  wipeLocalData();
  forgetCursor(session.userId);
  await client().auth.signOut({ scope: 'local' });
  setOnboarded(false);
}
