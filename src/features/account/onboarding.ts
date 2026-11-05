import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

// İlk açılış seçimi yapıldı mı ("E-postayla devam et" ya da "Hesapsız devam et"). Yapılmadıysa karşılama ekranı açılır.
const KEY = 'onboarding.done';
const listeners = new Set<(done: boolean) => void>();

export function isOnboarded(): boolean {
  return Storage.getItemSync(KEY) === '1';
}

export function setOnboarded(done: boolean): void {
  if (done) Storage.setItemSync(KEY, '1');
  else Storage.removeItemSync(KEY);
  listeners.forEach((l) => l(done));
}

export function useOnboarded(): boolean {
  const [done, setDone] = useState(isOnboarded);
  useEffect(() => {
    listeners.add(setDone);
    return () => {
      listeners.delete(setDone);
    };
  }, []);
  return done;
}
