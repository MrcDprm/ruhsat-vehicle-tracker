import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

// Supabase istemcisi. Adres ve "publishable" (anon) anahtar herkese açık olacak şekilde tasarlanmıştır: bütün yetki
// sunucudaki RLS'te (supabase/migrations). Servis anahtarı uygulamaya ve repoya hiç girmez.
// Ortam değişkenleri yoksa (yapılandırılmamış geliştirme kopyası) hesap özellikleri gizlenir, uygulama hesapsız çalışır.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Oturum (erişim + yenileme anahtarı) iOS Anahtar Zinciri'nde, AsyncStorage'da değil (docs/plan.md "Güvenlik").
// Yalnız bu cihaz: yedekten yeni telefona taşınmaz; yeni telefonda e-posta koduyla yeniden girilir.
const keychain = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) =>
    SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { storage: keychain, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
      })
    : null;

export const accountsEnabled = supabase !== null;

// Uygulama öndeyken oturum yenilenir, arka plandayken durur (Supabase'in React Native önerisi).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type SessionState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; userId: string; email: string };

let current: SessionState = supabase ? { status: 'loading' } : { status: 'signedOut' };
const listeners = new Set<() => void>();

function fromSession(s: Session | null): SessionState {
  return s ? { status: 'signedIn', userId: s.user.id, email: s.user.email ?? '' } : { status: 'signedOut' };
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    current = fromSession(session);
    listeners.forEach((l) => l());
  });
}

export function sessionState(): SessionState {
  return current;
}

/** Oturum durumu; dış depoya abonelik (useSyncExternalStore), her değişiklikte yeniden çizer. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, sessionState);
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
