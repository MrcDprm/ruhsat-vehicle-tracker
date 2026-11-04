import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const DIGIT_H = 34;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Eski arabalardaki silindirli kilometre sayacı: her hane 0-9 şeridi, değer değişince yuvarlanarak döner.
// Sağdaki hane amber (sayacın son silindiri). Erişilebilirlikte tek bir "87.421 km" etiketi okunur.
function Drum({ digit, index, last }: { digit: number; index: number; last: boolean }) {
  const { colors } = useTheme();
  // 0'dan başlar: ekran açılınca haneler yerine yuvarlanır.
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(index * 60, withTiming(-digit * DIGIT_H, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [digit, index, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const bg = last ? colors.amber : colors.odometer;
  const fg = last ? colors.onAmber : colors.onOdometer;
  return (
    <View style={{ width: 24, height: DIGIT_H, borderRadius: 5, overflow: 'hidden', backgroundColor: bg }}>
      <Animated.View style={style}>
        {DIGITS.map((d) => (
          <Animated.Text
            key={d}
            style={{
              height: DIGIT_H,
              lineHeight: DIGIT_H,
              textAlign: 'center',
              fontFamily: fonts.mono,
              fontSize: 22,
              color: fg,
            }}>
            {d}
          </Animated.Text>
        ))}
      </Animated.View>
      {/* Silindirin üst ve alt gölgesi */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 7, backgroundColor: 'rgba(0,0,0,0.18)' }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, backgroundColor: 'rgba(0,0,0,0.18)' }}
      />
    </View>
  );
}

export function Odometer({ km, label }: { km: number; label: string }) {
  const digits = String(Math.max(0, Math.floor(km)))
    .padStart(6, '0')
    .split('')
    .map(Number);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 3 }}>
      {digits.map((d, i) => (
        <Drum key={digits.length - i} digit={d} index={i} last={i === digits.length - 1} />
      ))}
    </View>
  );
}
