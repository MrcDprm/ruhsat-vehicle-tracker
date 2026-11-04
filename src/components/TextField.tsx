import { TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export function TextField({
  label,
  hint,
  help,
  error,
  ...rest
}: TextInputProps & { label: string; hint?: string; help?: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" tone="muted">
        {label}
        {hint ? ` · ${hint}` : ''}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...rest}
        style={{
          height: 48,
          paddingHorizontal: 14,
          borderRadius: radius.field,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor: error ? colors.rust : colors.line,
          backgroundColor: colors.card,
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: 16,
        }}
      />
      {error ? (
        <Text variant="caption" tone="rust" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text variant="caption" tone="muted">
          {help}
        </Text>
      ) : null}
    </View>
  );
}
