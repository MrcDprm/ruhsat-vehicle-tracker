import { View, type ViewProps } from 'react-native';

import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.card,
          borderCurve: 'continuous',
        },
        style,
      ]}
    />
  );
}
