import { Children } from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { upperCase, useLocale } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'heading' | 'section' | 'body' | 'bodyMedium' | 'label' | 'caption' | 'figure';

// Büyük harfli stillerde (section, label) satır yüksekliği şart: yoksa Saira ve Onest'te "İ"nin noktası kesilir.
const styles: Record<Variant, { fontFamily: string; fontSize: number; lineHeight?: number; letterSpacing?: number }> = {
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  section: { fontFamily: fonts.displayMedium, fontSize: 14, lineHeight: 20, letterSpacing: 1.3 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 16, letterSpacing: 1.5 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  figure: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
};

export function Text({
  variant = 'body',
  tone = 'ink',
  style,
  children,
  ...rest
}: TextProps & { variant?: Variant; tone?: 'ink' | 'muted' | 'amber' | 'rust' | 'sage' }) {
  const { colors } = useTheme();
  const locale = useLocale();
  const upper = variant === 'section' || variant === 'label';
  // textTransform yerine metnin kendisi dile göre büyütülür (Türkçede i → İ).
  const content = upper ? Children.map(children, (c) => (typeof c === 'string' ? upperCase(c, locale) : c)) : children;
  return (
    <RNText {...rest} style={[styles[variant], { color: colors[tone] }, style]}>
      {content}
    </RNText>
  );
}
