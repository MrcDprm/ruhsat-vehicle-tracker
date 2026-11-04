import { View } from 'react-native';

import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

const HEIGHT = 36;

// Plaka: solda TR şeridi, yazı kutunun ortasında (yatay ve dikey).
export function Plate({ plate }: { plate: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={plate}
      style={{
        flexDirection: 'row',
        alignSelf: 'flex-start',
        height: HEIGHT,
        minWidth: 190,
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: 24,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 4,
        }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 10, lineHeight: 12, color: colors.background }}>TR</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}>
        <Text
          style={{ fontFamily: fonts.display, fontSize: 21, lineHeight: 24, letterSpacing: 1.5, textAlign: 'center' }}>
          {plate}
        </Text>
      </View>
    </View>
  );
}
