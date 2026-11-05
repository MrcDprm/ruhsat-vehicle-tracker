import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdBanner } from '@/features/ads/AdBanner';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Sekme ekranlarında iOS'un alt güvenli alanı yüzen sekme çubuğunu zaten içerir (ölçüldü: iPhone'da 83 nokta =
 * 34 ana ekran çizgisi + 49 sekme çubuğu). Banner ve FAB bu sınırın yalnızca bu kadar üstünde durur.
 */
export const TAB_BAR_GAP = 8;

/** Ekranın altında sabit duran banner'ın yüksekliği; FAB bu kadar yukarı kalkar. */
const BottomBarContext = createContext(0);
export const useBottomBarHeight = () => useContext(BottomBarContext);

/**
 * Sekme ekranı: başlık yok (native tabs), üst boşluk çentik kadar; alt boşluğu sekme çubuğu için iOS ayarlar.
 * banner: sekme çubuğunun hemen üstünde sabit reklam (yalnız İstatistik ve Geçmiş). İçerik banner kadar fazla kayar,
 * böylece son kart banner'ın altında kalmaz.
 */
export function Screen({ children, footer, banner }: { children: ReactNode; footer?: ReactNode; banner?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bannerHeight, setBannerHeight] = useState(0);
  return (
    <BottomBarContext.Provider value={bannerHeight}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 120 + bannerHeight,
            gap: 12,
          }}>
          {children}
        </ScrollView>
        {banner ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + TAB_BAR_GAP }}>
            <AdBanner onHeight={setBannerHeight} />
          </View>
        ) : null}
        {footer}
      </View>
    </BottomBarContext.Provider>
  );
}
