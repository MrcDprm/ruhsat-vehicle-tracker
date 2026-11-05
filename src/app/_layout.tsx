import { AzeretMono_600SemiBold } from '@expo-google-fonts/azeret-mono';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { SairaSemiCondensed_600SemiBold, SairaSemiCondensed_700Bold } from '@expo-google-fonts/saira-semi-condensed';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { APP_VERSION, CONTACT_EMAIL } from '@/constants/app';
import { db } from '@/db/client';
import { useOnboarded } from '@/features/account/onboarding';
import { startStore } from '@/features/ads/purchase';
import { NotificationBridge } from '@/features/reminders/NotificationBridge';
import { I18nProvider, useI18n } from '@/i18n';
import { SyncBridge } from '@/sync/SyncBridge';
import { fonts } from '@/theme/colors';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, scheme } = useTheme();
  const onboarded = useOnboarded();
  // Mağaza bağlantısı açılışta bir kez: fiyat ve "reklamlar kaldırıldı" hakkı sessizce doğrulanır (Expo Go'da kapalı).
  useEffect(() => {
    startStore();
  }, []);
  const header = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  };
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationBridge />
      <SyncBridge />
      <Stack screenOptions={header}>
        {/* İlk açılış seçimi yapılmadıysa yalnız karşılama ve giriş ekranları açılabilir. */}
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="vehicles/index"
            options={{
              headerShown: false,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.5, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen name="vehicles/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="fuel/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="expenses/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reminders/setup" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="auth/email" options={{ title: '' }} />
        <Stack.Screen name="auth/code" options={{ title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SairaSemiCondensed_600SemiBold,
    SairaSemiCondensed_700Bold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    AzeretMono_600SemiBold,
  });
  const { success, error } = useMigrations(db, migrations);
  const ready = (fontsLoaded || fontError) && (success || error);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <ThemeProvider>
      <I18nProvider>{error ? <MigrationError message={error.message} /> : <AppStack />}</I18nProvider>
    </ThemeProvider>
  );
}

// Göç başarısızsa uygulama veriye dokunmadan durur. Kullanıcıya sade bir açıklama gösterilir; ham hata metni yalnız
// geliştirmede ekranda görünür, yayında yalnız kullanıcı "E-postayla bildir" derse e-postanın içine girer.
function MigrationError({ message }: { message: string }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const report = () =>
    Linking.openURL(
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Ruhsat ${APP_VERSION}: ${t('migration.subject')}`)}` +
        `&body=${encodeURIComponent(message.slice(0, 1500))}`,
    ).catch(() => {});
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text variant="heading">{t('migration.title')}</Text>
      <Text tone="muted">{t('migration.text')}</Text>
      {__DEV__ ? (
        <Text variant="caption" tone="rust" selectable>
          {message}
        </Text>
      ) : null}
      <Button title={t('migration.report')} kind="secondary" onPress={report} />
    </View>
  );
}
