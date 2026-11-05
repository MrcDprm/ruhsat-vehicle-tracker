import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';

import { Card } from '@/components/Card';
import { Row } from '@/components/SettingsRow';
import { Text } from '@/components/Text';
import { useI18n } from '@/i18n';

import { showPrivacyOptions, usePrivacyOptionsRequired } from './ads';
import { nativeStoreAvailable } from './config';
import { useAdsRemoved } from './entitlement';
import { buyRemoveAds, clearNotice, restorePurchases, useStore } from './purchase';

/**
 * Ayarlar > Reklamlar: "Reklamları kaldır" (tek seferlik, App Store fiyatıyla), "Satın alımları geri yükle"
 * (Apple'ın zorunlu tuttuğu düğme) ve AB'de Google'ın istediği "Reklam gizlilik seçenekleri".
 */
export function AdsSection() {
  const { t } = useI18n();
  const removed = useAdsRemoved();
  const store = useStore();
  const privacyOptions = usePrivacyOptionsRequired();

  // İşlem sonucu bir kez, sade bir pencereyle bildirilir.
  useEffect(() => {
    if (!store.notice) return;
    if (store.notice === 'purchased' || store.notice === 'restored') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert(t(`ads.notice.${store.notice}`));
    clearNotice();
  }, [store.notice, t]);

  return (
    <>
      <Card style={{ overflow: 'hidden' }}>
        {removed ? (
          <View style={{ padding: 16, gap: 2 }}>
            <Text variant="bodyMedium">{t('ads.removedTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('ads.removedText')}
            </Text>
          </View>
        ) : (
          <Row
            first
            icon="sparkles"
            label={t('ads.remove')}
            detail={store.price ?? undefined}
            busy={store.busy === 'buy'}
            onPress={buyRemoveAds}
          />
        )}
        <Row
          icon="arrow.clockwise"
          label={t('ads.restore')}
          busy={store.busy === 'restore'}
          onPress={restorePurchases}
        />
        {privacyOptions ? (
          <Row icon="hand.raised" label={t('ads.privacyOptions')} onPress={showPrivacyOptions} />
        ) : null}
      </Card>
      <Text variant="caption" tone="muted" style={{ marginHorizontal: 4 }}>
        {nativeStoreAvailable ? t('ads.help') : t('ads.expoGo')}
      </Text>
    </>
  );
}
