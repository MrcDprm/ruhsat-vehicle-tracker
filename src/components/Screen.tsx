import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

/** Sekme ekranı: başlık yok (native tabs), üst boşluk çentik kadar; alt boşluğu sekme çubuğu için iOS ayarlar. */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}>
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}
