import { Pressable } from 'react-native';

import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

/** Modal formların başlık çubuğundaki Vazgeç / Kaydet düğmesi. */
export function HeaderButton({ title, onPress, bold }: { title: string; onPress: () => void; bold?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} style={{ paddingHorizontal: 4 }}>
      <Text
        style={{
          fontFamily: bold ? fonts.bodySemi : fonts.body,
          fontSize: 17,
          color: bold ? colors.amber : colors.ink,
        }}>
        {title}
      </Text>
    </Pressable>
  );
}
