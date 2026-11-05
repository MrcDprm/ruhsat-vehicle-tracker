import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { sendCode } from '@/features/account/actions';
import { authErrorKey, isValidEmail, normalizeEmail } from '@/features/account/validation';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

/** Giriş 1/2: e-posta. Hesap yoksa açılır; ayrı "kayıt ol" yok, şifre yok. */
export default function EmailScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const value = normalizeEmail(email);
    if (!isValidEmail(value)) {
      setError(t('auth.error.email'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSending(true);
    try {
      await sendCode(value);
      router.push({ pathname: '/auth/code', params: { email: value } });
    } catch (e) {
      setError(t(authErrorKey(e)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ gap: 6 }}>
          <Text variant="title">{t('auth.email.title')}</Text>
          <Text variant="body" tone="muted">
            {t('auth.email.text')}
          </Text>
        </View>
        <TextField
          label={t('auth.email.label')}
          placeholder="ad@ornek.com"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(undefined);
          }}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          maxLength={254}
          autoFocus
        />
        <Button title={t('auth.email.send')} onPress={submit} disabled={sending} />
        <Text variant="caption" tone="muted">
          {t('auth.email.privacy')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
