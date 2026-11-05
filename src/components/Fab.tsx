import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

// Sekme ekranlarının sağ altındaki yuvarlak eylem düğmesi; yüzen iOS sekme çubuğunun üstünde durur.
const TAB_BAR_CLEARANCE = 72;

export function Fab({ icon, label, onPress }: { icon: SymbolViewProps['name']; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14)}
      style={{ position: 'absolute', right: 20, bottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={({ pressed }) => ({
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.amber,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
        })}>
        <SymbolView name={icon} size={26} tintColor={colors.onAmber} weight="semibold" />
      </Pressable>
    </Animated.View>
  );
}
