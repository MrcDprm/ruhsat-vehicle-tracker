import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';

import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function Button({
  title,
  kind = 'primary',
  onPress,
  disabled,
  ...rest
}: Omit<PressableProps, 'children'> & { title: string; kind?: 'primary' | 'secondary' | 'danger' }) {
  const { colors } = useTheme();
  const bg = kind === 'primary' ? colors.amber : 'transparent';
  const fg = kind === 'primary' ? colors.onAmber : kind === 'danger' ? colors.rust : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={(e) => {
        Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => ({
        height: 50,
        borderRadius: radius.field,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: kind === 'primary' ? 0 : 1.5,
        borderColor: kind === 'danger' ? colors.rust : colors.line,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
      {...rest}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}
