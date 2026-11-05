import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';

export type Bar = { key: string; label: string; total: number; segments: { value: number; color: string }[] };

const HEIGHT = 150;
const SCROLL_FROM = 13; // 12 aydan fazlası yatay kayar

/**
 * Yığılmış çubuk grafik (aylık masraf). Çubuklar alttan büyüyerek gelir; dokunulan çubuk seçilir, diğerleri soluklaşır.
 * View ile çizilir: metin ve dokunma alanı net, ek kütüphane yok.
 */
export function StackedBars({
  bars,
  selected,
  onSelect,
}: {
  bars: Bar[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const { colors } = useTheme();
  const max = Math.max(...bars.map((b) => b.total), 0);
  const grow = useSharedValue(0);
  const signature = bars.map((b) => `${b.key}:${Math.round(b.total)}`).join('|');
  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [signature, grow]);
  const growStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));

  const scroll = bars.length >= SCROLL_FROM;
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: scroll ? 8 : 6, paddingTop: 4 }}>
      {bars.map((b) => {
        const h = max > 0 ? (b.total / max) * HEIGHT : 0;
        const dim = selected !== null && selected !== b.key;
        return (
          <Pressable
            key={b.key}
            accessibilityRole="button"
            accessibilityLabel={`${b.label} ${Math.round(b.total)}`}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(selected === b.key ? null : b.key);
            }}
            style={{ width: scroll ? 22 : undefined, flex: scroll ? undefined : 1, alignItems: 'center', gap: 6 }}>
            <View style={{ height: HEIGHT, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              {b.total === 0 ? (
                <View style={{ height: 2, width: '70%', borderRadius: 1, backgroundColor: colors.line }} />
              ) : (
                <Animated.View
                  style={[
                    {
                      height: Math.max(h, 3),
                      width: '70%',
                      maxWidth: 26,
                      borderRadius: 5,
                      overflow: 'hidden',
                      opacity: dim ? 0.35 : 1,
                      transformOrigin: 'bottom',
                    },
                    growStyle,
                  ]}>
                  {/* Üstten alta: son grup en üstte durur. */}
                  {[...b.segments]
                    .reverse()
                    .map((s, i) =>
                      s.value > 0 ? <View key={i} style={{ flex: s.value, backgroundColor: s.color }} /> : null,
                    )}
                </Animated.View>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: selected === b.key ? fonts.bodySemi : fonts.body,
                fontSize: 10.5,
                color: selected === b.key ? colors.ink : colors.muted,
              }}>
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return scroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: 10_000, y: 0 }}>
      {body}
    </ScrollView>
  ) : (
    body
  );
}
