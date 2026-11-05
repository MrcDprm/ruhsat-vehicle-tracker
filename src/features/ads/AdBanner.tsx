import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { adsModule, useAdsReady } from './ads';
import { BANNER_UNIT_ID_IOS, nativeStoreAvailable } from './config';
import { useAdsRemoved } from './entitlement';

/**
 * Tek banner (yalnız İstatistik ve Geçmiş). Reklamlar kaldırıldıysa, Expo Go'daysa, onay yoksa ya da reklam
 * yüklenemediyse hiçbir şey çizmez; boş alan bırakmaz. Yüksekliği değişince onHeight ile ekranı haberdar eder.
 */
export function AdBanner({ onHeight }: { onHeight: (h: number) => void }) {
  const { colors } = useTheme();
  const removed = useAdsRemoved();
  const ready = useAdsReady();
  const [failed, setFailed] = useState(false);

  const m = adsModule();
  const visible = nativeStoreAvailable && !removed && ready && !failed && m !== null;
  // Banner kalkınca (reklamlar kaldırıldı, yüklenemedi) ekranın ayırdığı boşluk da kalkar.
  useEffect(() => {
    if (!visible) onHeight(0);
  }, [visible, onHeight]);
  if (!visible || !m) return null;

  const unitId = __DEV__ || !BANNER_UNIT_ID_IOS ? m.TestIds.ADAPTIVE_BANNER : BANNER_UNIT_ID_IOS;
  return (
    <View
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={{
        alignItems: 'center',
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}>
      <m.BannerAd
        unitId={unitId}
        // Standart sabit banner; "LARGE" sürümü ekranın daha büyük kısmını kaplar.
        size={m.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
