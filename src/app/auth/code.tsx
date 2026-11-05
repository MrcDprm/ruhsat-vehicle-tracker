import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { sendCode, verifyCode } from '@/features/account/actions';
import { CODE_LENGTH, RESEND_SECONDS, authErrorKey, sanitizeCode } from '@/features/account/validation';
import { useI18n } from '@/i18n';
import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Giriş 2/2: e-postaya gelen 6 haneli kod. Altı kutu tek bir gizli alanın görünümü: yapıştırma ve iOS'un
 * postadaki kodu klavyenin üstünde önermesi (oneTimeCode) çalışır. Altıncı hanede kendiliğinden doğrulanır.
 * Hatalı kodda kutular sallanır ve anlamlı mesaj çıkar; kodu yeniden gönderme 60 saniyelik sayaçla.
 */
export default function CodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [info, setInfo] = useState<string | undefined>();
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const fail = (message: string) => {
    setError(message);
    setCode('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  };

  const verify = async (value: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await verifyCode(email, value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Ayarlar'dan gelindiyse oraya, karşılamadan gelindiyse Özet'e döner.
      router.dismissTo('/');
    } catch (e) {
      fail(t(authErrorKey(e)));
    } finally {
      setBusy(false);
    }
  };

  const onChange = (raw: string) => {
    const value = sanitizeCode(raw);
    setCode(value);
    setError(undefined);
    if (value.length === CODE_LENGTH) verify(value);
  };

  const resend = async () => {
    setInfo(undefined);
    setError(undefined);
    try {
      await sendCode(email);
      setWait(RESEND_SECONDS);
      setInfo(t('auth.code.resent'));
    } catch (e) {
      setError(t(authErrorKey(e)));
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 22 }}>
        <View style={{ gap: 6 }}>
          <Text variant="title">{t('auth.code.title')}</Text>
          <Text variant="body" tone="muted">
            {t('auth.code.text', { email })}
          </Text>
        </View>

        <Pressable accessibilityLabel={t('auth.code.label')} onPress={() => input.current?.focus()}>
          <Animated.View style={[{ flexDirection: 'row', gap: 8 }, shakeStyle]}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const filled = i < code.length;
              const active = i === code.length && !busy;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 58,
                    borderRadius: radius.field,
                    borderCurve: 'continuous',
                    borderWidth: active ? 2 : 1.5,
                    borderColor: error ? colors.rust : active ? colors.amber : colors.line,
                    backgroundColor: colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 24, lineHeight: 30, color: colors.ink }}>
                    {filled ? code[i] : ''}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH + 4}
          autoFocus
          editable={!busy}
          caretHidden
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        {busy ? <ActivityIndicator color={colors.amber} /> : null}
        {error ? (
          <Text variant="caption" tone="rust" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : info ? (
          <Text variant="caption" tone="sage">
            {info}
          </Text>
        ) : null}

        <Pressable accessibilityRole="button" disabled={wait > 0} onPress={resend} hitSlop={8}>
          <Text variant="caption" tone={wait > 0 ? 'muted' : 'amber'} style={{ fontFamily: fonts.bodySemi }}>
            {wait > 0 ? t('auth.code.resendIn', { seconds: wait }) : t('auth.code.resend')}
          </Text>
        </Pressable>
        <Text variant="caption" tone="muted">
          {t('auth.code.spam')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
