import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

// Açma/kapama anahtarı. RN Switch iOS 26'da boyut ve renk sorunları çıkardığı için kendi çizimimiz;
// açıkken amber (gösterge lambası), topuz yayla kayar.
const W = 50;
const H = 30;
const KNOB = 24;

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { colors } = useTheme();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 260 });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + x.value * (W - KNOB - 6) }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!value);
      }}
      style={{
        width: W,
        height: H,
        borderRadius: H / 2,
        justifyContent: 'center',
        backgroundColor: value ? colors.amber : colors.line,
      }}>
      <Animated.View
        style={[
          {
            width: KNOB,
            height: KNOB,
            borderRadius: KNOB / 2,
            backgroundColor: colors.card,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          },
          knob,
        ]}
      />
    </Pressable>
  );
}
