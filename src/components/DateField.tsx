import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

/**
 * Etiket + iOS'un kendi kompakt tarih seçicisi (SwiftUI). Takvim uygulamanın dilinde açılır.
 * past: yalnız bugün ve öncesi (kayıtlar); future: yalnız bugün ve sonrası (bitiş tarihleri).
 */
export function DateField({
  label,
  value,
  onChange,
  past,
  future,
  error,
}: {
  label: string;
  value: number;
  onChange: (ms: number) => void;
  past?: boolean;
  future?: boolean;
  error?: string;
}) {
  const { locale } = useI18n();
  const { colors, scheme } = useTheme();
  // Ekran açıkken gün değişse de sınır açılıştaki gün kalır; form zaten doğrulamada yeniden bakar.
  const [today] = useState(() => Date.now());
  const min = future ? new Date(today).setHours(0, 0, 0, 0) : undefined;
  const max = past ? today : undefined;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text variant="caption" tone="muted" style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <Host matchContents colorScheme={scheme === 'dark' ? 'dark' : 'light'} seedColor={colors.amber}>
          <DatePicker
            selection={new Date(value)}
            range={{
              start: min !== undefined ? new Date(min) : undefined,
              end: max !== undefined ? new Date(max) : undefined,
            }}
            displayedComponents={['date']}
            onDateChange={(d) => onChange(d.getTime())}
            modifiers={[datePickerStyle('compact'), environment('locale', locale === 'tr' ? 'tr_TR' : 'en_GB')]}
          />
        </Host>
      </View>
      {error ? (
        <Text variant="caption" tone="rust">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
