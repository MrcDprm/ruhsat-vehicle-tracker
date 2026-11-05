import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setActiveVehicleId } from '@/features/vehicles/repository';

import { requestSync } from './notifications';

/**
 * Görünmez bileşen (kök yerleşimde, göçlerden sonra):
 * - açılışta ve uygulama her öne geldiğinde bildirim planını yeniler (gün değişmiş, izin Ayarlar'dan açılmış olabilir);
 * - bildirime dokunulunca o aracı seçip Özet'i açar (uygulama kapalıyken dokunulsa da).
 */
export function NotificationBridge() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const vehicleId = response?.notification.request.content.data?.vehicleId;
    // Bildirim verisine körü körüne güvenilmez: yalnız metin kimlik kabul edilir; araç silinmişse seçici ilk araca düşer.
    if (typeof vehicleId === 'string' && vehicleId.length <= 64) {
      setActiveVehicleId(vehicleId);
      router.navigate('/');
    }
  }, [response]);

  useEffect(() => {
    requestSync();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') requestSync();
    });
    return () => sub.remove();
  }, []);

  return null;
}
