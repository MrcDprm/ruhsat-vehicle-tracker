import { View } from 'react-native';

import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useI18n, type LocalePreference } from '@/i18n';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { t, preference: localePref, setPreference: setLocale } = useI18n();
  const { preference: themePref, setPreference: setTheme } = useTheme();
  const locales: { value: LocalePreference; label: string }[] = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
  ];
  return (
    <Screen>
      <Text variant="title">{t('tab.settings')}</Text>

      <Text variant="section" tone="muted" style={{ marginTop: 8 }}>
        {t('settings.appearance')}
      </Text>
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {THEMES.map((p) => (
            <Chip key={p} label={t(`settings.theme.${p}`)} selected={themePref === p} onPress={() => setTheme(p)} />
          ))}
        </View>
      </Card>

      <Text variant="section" tone="muted" style={{ marginTop: 8 }}>
        {t('settings.language')}
      </Text>
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {locales.map((l) => (
            <Chip key={l.value} label={l.label} selected={localePref === l.value} onPress={() => setLocale(l.value)} />
          ))}
        </View>
      </Card>
    </Screen>
  );
}
