import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={{
        paddingHorizontal: 16,
        height: 38,
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? colors.amber : colors.line,
        backgroundColor: selected ? colors.amberSoft : colors.card,
      }}>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: selected ? colors.ink : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}
