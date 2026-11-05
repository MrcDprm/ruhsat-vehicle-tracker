import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from './client';
import { requestCloudSync } from './engine';

/**
 * Görünmez bileşen (kök yerleşimde): hesap açıksa eşitlemeyi tetikler.
 * - giriş yapılınca ve uygulama açılınca,
 * - uygulama öne gelince,
 * - internet geri gelince.
 * Kayıttan sonraki tetik kayıt fonksiyonlarında (src/sync/changes.ts).
 */
export function SyncBridge() {
  const session = useSession();
  const signedIn = session.status === 'signedIn';

  useEffect(() => {
    if (!signedIn) return;
    requestCloudSync();
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') requestCloudSync();
    });
    let online = true;
    const net = Network.addNetworkStateListener(({ isInternetReachable }) => {
      if (isInternetReachable && !online) requestCloudSync();
      online = isInternetReachable !== false;
    });
    return () => {
      app.remove();
      net.remove();
    };
  }, [signedIn]);

  return null;
}
