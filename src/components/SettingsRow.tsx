import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable } from 'react-native';

import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

/** Ayar satırı: simge, ad, sağda değer ya da ok; dokununca eylem. */
export function Row({
  icon,
  label,
  detail,
  onPress,
  danger,
  busy,
  first,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  detail?: string;
  onPress?: () => void;
  danger?: boolean;
  busy?: boolean;
  first?: boolean;
}) {
  const { colors } = useTheme();
  const tint = danger ? colors.rust : colors.ink;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.line,
        opacity: pressed ? 0.6 : 1,
      })}>
      <SymbolView name={icon} size={18} tintColor={danger ? colors.rust : colors.muted} />
      <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: tint }}>{label}</Text>
      {busy ? <ActivityIndicator color={colors.muted} /> : null}
      {detail ? (
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      ) : null}
      {onPress && !busy ? <SymbolView name="chevron.right" size={13} tintColor={colors.muted} /> : null}
    </Pressable>
  );
}
