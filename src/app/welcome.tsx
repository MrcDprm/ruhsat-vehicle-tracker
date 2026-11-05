import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Guilloche } from '@/components/Guilloche';
import { Odometer } from '@/components/Odometer';
import { Text } from '@/components/Text';
import { setOnboarded } from '@/features/account/onboarding';
import { accountsEnabled } from '@/sync/client';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

function Point({ icon, text, index }: { icon: SymbolViewProps['name']; text: string; index: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(250 + index * 90).duration(360)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.amberSoft,
        }}>
        <SymbolView name={icon} size={16} tintColor={colors.ink} />
      </View>
      <Text variant="body" style={{ flex: 1 }}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * İlk açılış: "E-postayla devam et" ya da "Hesapsız devam et". Hesapsızda kayıtların telefonda kalacağı açıkça söylenir
 * ve kabul edilince devam edilir (rakiplerin en büyük şikâyeti telefon değişince kaybolan kayıtlar).
 */
export default function WelcomeScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const continueWithout = () =>
    Alert.alert(t('welcome.guestTitle'), t('welcome.guestText'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('welcome.guestAccept'), onPress: () => setOnboarded(true) },
    ]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
      }}>
      <View style={{ position: 'absolute', right: -70, top: insets.top - 10, opacity: 0.9 }}>
        <Guilloche size={300} />
      </View>

      <View style={{ gap: 28, marginTop: 40 }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 6 }}>
          <Text variant="label" tone="muted">
            {t('summary.registration')}
          </Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 60, color: colors.ink }}>Ruhsat</Text>
          <Text variant="body" tone="muted">
            {t('welcome.tagline')}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ alignSelf: 'flex-start' }}>
          <Odometer km={128406} label="128.406 km" />
        </Animated.View>
        <View style={{ gap: 14 }}>
          <Point index={0} icon="fuelpump.fill" text={t('welcome.point.fuel')} />
          <Point index={1} icon="bell.badge.fill" text={t('welcome.point.reminders')} />
          <Point index={2} icon="icloud.fill" text={t('welcome.point.sync')} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={{ gap: 10 }}>
        {accountsEnabled ? <Button title={t('welcome.email')} onPress={() => router.push('/auth/email')} /> : null}
        <Button title={t('welcome.guest')} kind="secondary" onPress={continueWithout} />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 4 }}>
          {t('welcome.later')}
        </Text>
      </Animated.View>
    </View>
  );
}
