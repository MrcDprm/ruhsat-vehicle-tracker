import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setActiveVehicleId } from '@/features/vehicles/repository';
import { requestWidgetSync } from '@/features/widget/sync';
import { useI18n } from '@/i18n';

import { requestSync } from './notifications';

/**
 * Görünmez bileşen (kök yerleşimde, göçlerden sonra):
 * - açılışta, dil değişince ve uygulama her öne geldiğinde bildirim planını yeniler (gün değişmiş, izin Ayarlar'dan
 *   açılmış olabilir);
 * - bildirime dokunulunca o aracı seçip Özet'i açar (uygulama kapalıyken dokunulsa da).
 */
export function NotificationBridge() {
  const response = Notifications.useLastNotificationResponse();
  const { locale, currencyFormat } = useI18n();

  useEffect(() => {
    const vehicleId = response?.notification.request.content.data?.vehicleId;
    // Bildirim verisine körü körüne güvenilmez: yalnız metin kimlik kabul edilir; araç silinmişse seçici ilk araca düşer.
    if (typeof vehicleId === 'string' && vehicleId.length <= 64) {
      setActiveVehicleId(vehicleId);
      router.navigate('/');
    }
  }, [response]);

  // Açılışta ve dil değişince: bildirim metinleri yeni dille hemen yeniden kurulur. Dil bilgisi buradan, React
  // bağlamından gelir; dil modülü bildirim modülünü bilmez, ikisi birbirini çağırmaz.
  useEffect(() => {
    requestSync();
  }, [locale]);

  // Widget metinleri dile ve para birimi biçimine bağlı; ikisinden biri değişince yeniden yazılır.
  useEffect(() => {
    requestWidgetSync();
  }, [locale, currencyFormat]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        requestSync();
        requestWidgetSync();
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}
