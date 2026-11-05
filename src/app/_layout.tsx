import { AzeretMono_600SemiBold } from '@expo-google-fonts/azeret-mono';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { SairaSemiCondensed_600SemiBold, SairaSemiCondensed_700Bold } from '@expo-google-fonts/saira-semi-condensed';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { Text } from '@/components/Text';
import { db } from '@/db/client';
import { I18nProvider } from '@/i18n';
import { fonts } from '@/theme/colors';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, scheme } = useTheme();
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
      <Stack screenOptions={header}>
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

// Göç başarısızsa uygulama veriye dokunmadan durur; kullanıcı ne olduğunu görür.
function MigrationError({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 8 }}>
      <Text variant="heading">Veritabanı güncellenemedi / Database update failed</Text>
      <Text tone="muted" selectable>
        {message}
      </Text>
    </View>
  );
}
