import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

// Sekme ekranlarının sağ altındaki yuvarlak eylem düğmesi; yüzen iOS sekme çubuğunun üstünde durur.
// Dokununca seçenekler (Yakıt, Masraf) yukarı doğru açılır; arka plan karartılır, boşluğa dokununca kapanır.
const TAB_BAR_CLEARANCE = 72;

export type FabAction = { icon: SymbolViewProps['name']; label: string; onPress: () => void };

export function Fab({ label, actions }: { label: string; actions: FabAction[] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const bottom = insets.bottom + TAB_BAR_CLEARANCE;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen((o) => !o);
  };

  return (
    <>
      {open ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityLabel={label}
            onPress={() => setOpen(false)}
            style={{ flex: 1, backgroundColor: colors.background, opacity: 0.82 }}
          />
        </Animated.View>
      ) : null}

      {open ? (
        <View style={{ position: 'absolute', right: 20, bottom: bottom + 72, alignItems: 'flex-end', gap: 12 }}>
          {actions.map((a, i) => (
            <Animated.View
              key={a.label}
              entering={FadeInDown.delay((actions.length - 1 - i) * 40)
                .springify()
                .damping(16)}
              exiting={FadeOutDown.duration(120)}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Haptics.selectionAsync();
                  setOpen(false);
                  a.onPress();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  height: 48,
                  paddingLeft: 16,
                  paddingRight: 18,
                  borderRadius: 24,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.line,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
                })}>
                <SymbolView name={a.icon} size={20} tintColor={colors.amber} weight="semibold" />
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink }}>{a.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ) : null}

      <Animated.View entering={ZoomIn.springify().damping(14)} style={{ position: 'absolute', right: 20, bottom }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.amber,
            transform: [{ scale: pressed ? 0.94 : 1 }, { rotate: open ? '45deg' : '0deg' }],
            boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
          })}>
          <SymbolView name="plus" size={26} tintColor={colors.onAmber} weight="bold" />
        </Pressable>
      </Animated.View>
    </>
  );
}

/** Özet ve Geçmiş'teki ortak "kayıt ekle" düğmesi. */
export function AddEntryFab() {
  const { t } = useI18n();
  const actions: FabAction[] = [
    { icon: 'fuelpump.fill', label: t('fab.fuel'), onPress: () => router.push('/fuel/edit') },
    { icon: 'wrench.and.screwdriver.fill', label: t('fab.expense'), onPress: () => router.push('/expenses/edit') },
  ];
  return <Fab label={t('fab.add')} actions={actions} />;
}
