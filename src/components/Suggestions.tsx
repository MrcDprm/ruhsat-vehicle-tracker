import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

// Alanın altında yatay kayan öneri kutucukları; dokununca alan dolar.
export function Suggestions({ items, onPick }: { items: string[]; onPick: (value: string) => void }) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            onPress={() => {
              Haptics.selectionAsync();
              onPick(item);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              height: 36,
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: pressed ? colors.amber : colors.amberSoft,
            })}>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15 }}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
