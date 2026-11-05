import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/Card';
import { Row } from '@/components/SettingsRow';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { APP_VERSION, CONTACT_EMAIL, PRIVACY_URL } from '@/constants/app';
import { exportCsv, type ExportKind } from '@/features/export/share';
import {
  setNotificationsEnabled,
  useNotificationPermission,
  useNotificationsEnabled,
} from '@/features/reminders/notifications';
import { deleteAllRecords } from '@/features/settings/wipe';
import { AccountSection } from '@/features/account/AccountSection';
import { useSession } from '@/sync/client';
import { CURRENCY_FORMATS, formatMoney, useI18n, type LocalePreference } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Text variant="section" tone="muted" style={{ marginTop: 8, marginLeft: 4 }}>
        {title}
      </Text>
      {children}
    </>
  );
}

export default function SettingsScreen() {
  const {
    t,
    locale,
    preference: localePref,
    setPreference: setLocale,
    currencyFormat,
    setCurrencyFormat,
    number,
  } = useI18n();
  const { preference: themePref, setPreference: setTheme } = useTheme();
  const notificationsOn = useNotificationsEnabled();
  const permission = useNotificationPermission();
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const signedIn = useSession().status === 'signedIn';

  const locales: { value: LocalePreference; label: string }[] = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
  ];

  const runExport = async (kind: ExportKind) => {
    setExporting(kind);
    try {
      const count = await exportCsv(kind, t, locale);
      if (count === 0) Alert.alert(t('settings.export.empty'));
    } catch {
      Alert.alert(t('settings.export.failed'));
    } finally {
      setExporting(null);
    }
  };

  // İki adımlı onay: geri dönüşü olmayan tek işlem.
  const confirmWipe = () =>
    Alert.alert(t('settings.wipe.title'), t(signedIn ? 'settings.wipe.textAccount' : 'settings.wipe.text'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.wipe.continue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('settings.wipe.confirmTitle'), t('settings.wipe.confirmText'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.wipe.confirm'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteAllRecords();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.navigate('/');
                } catch {
                  Alert.alert(t('settings.wipe.failed'));
                }
              },
            },
          ]),
      },
    ]);

  return (
    <Screen>
      <Text variant="title">{t('tab.settings')}</Text>

      <Section title={t('account.title')}>
        <AccountSection />
      </Section>

      <Section title={t('settings.appearance')}>
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {THEMES.map((p) => (
              <Chip key={p} label={t(`settings.theme.${p}`)} selected={themePref === p} onPress={() => setTheme(p)} />
            ))}
          </View>
        </Card>
      </Section>

      <Section title={t('settings.language')}>
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {locales.map((l) => (
              <Chip
                key={l.value}
                label={l.label}
                selected={localePref === l.value}
                onPress={() => setLocale(l.value)}
              />
            ))}
          </View>
        </Card>
      </Section>

      <Section title={t('settings.currency')}>
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CURRENCY_FORMATS.map((f) => (
              <Chip
                key={f}
                label={formatMoney(number(1250), f)}
                selected={currencyFormat === f}
                onPress={() => setCurrencyFormat(f)}
              />
            ))}
          </View>
        </Card>
      </Section>

      <Section title={t('settings.notifications')}>
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="body">{t('settings.notifications.reminders')}</Text>
              <Text variant="caption" tone="muted">
                {t('settings.notifications.help')}
              </Text>
            </View>
            <Toggle
              value={notificationsOn}
              onChange={(v) => setNotificationsEnabled(v)}
              label={t('settings.notifications.reminders')}
            />
          </View>
          {notificationsOn && permission === 'denied' ? (
            <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()}>
              <Text variant="caption" tone="amber" style={{ fontFamily: fonts.bodySemi }}>
                {t('settings.notifications.denied')}
              </Text>
            </Pressable>
          ) : null}
        </Card>
      </Section>

      <Section title={t('settings.data')}>
        <Card style={{ overflow: 'hidden' }}>
          <Row
            first
            icon="fuelpump"
            label={t('settings.export.fuel')}
            detail="CSV"
            busy={exporting === 'fuel'}
            onPress={() => runExport('fuel')}
          />
          <Row
            icon="wrench.and.screwdriver"
            label={t('settings.export.expenses')}
            detail="CSV"
            busy={exporting === 'expenses'}
            onPress={() => runExport('expenses')}
          />
          <Row icon="trash" label={t('settings.wipe.row')} danger onPress={confirmWipe} />
        </Card>
        <Text variant="caption" tone="muted" style={{ marginHorizontal: 4 }}>
          {t('settings.export.help')}
        </Text>
      </Section>

      <Section title={t('settings.about')}>
        <Card style={{ overflow: 'hidden' }}>
          <Row first icon="info.circle" label={t('settings.version')} detail={APP_VERSION} />
          <Row
            icon="hand.raised"
            label={t('settings.privacy')}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => Linking.openURL(PRIVACY_URL))}
          />
          <Row
            icon="envelope"
            label={t('settings.contact')}
            detail={CONTACT_EMAIL}
            onPress={() =>
              Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Ruhsat ${APP_VERSION}`)}`).catch(
                () => Alert.alert(CONTACT_EMAIL),
              )
            }
          />
        </Card>
      </Section>
    </Screen>
  );
}
