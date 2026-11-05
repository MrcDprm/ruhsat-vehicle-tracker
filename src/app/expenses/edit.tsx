import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { HeaderButton } from '@/components/HeaderButton';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { EXPENSE_CATEGORIES, SERVICE_SUBTYPES, type ExpenseCategory, type ServiceSubtype } from '@/db/schema';
import { CATEGORY_ICONS } from '@/features/expenses/categories';
import { createExpense, deleteExpense, getExpense, updateExpense } from '@/features/expenses/repository';
import { validateExpense, type ExpenseErrors, type ExpenseInput } from '@/features/expenses/validation';
import { toInput } from '@/features/fuel/validation';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';
import { fonts, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

// Km'nin anlamlı olduğu türler: bunlarda km alanı öne çıkar, hatırlatma km'ye göre ilerler.
const KM_RELEVANT: ExpenseCategory[] = ['service', 'inspection'];

function CategoryTile({
  category,
  selected,
  onPress,
}: {
  category: ExpenseCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        width: '31%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: radius.field,
        borderCurve: 'continuous',
        borderWidth: 1.5,
        borderColor: selected ? colors.amber : colors.line,
        backgroundColor: selected ? colors.amberSoft : colors.card,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <SymbolView name={CATEGORY_ICONS[category]} size={22} tintColor={selected ? colors.ink : colors.muted} />
      <Text
        numberOfLines={2}
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 12.5,
          lineHeight: 16,
          textAlign: 'center',
          color: selected ? colors.ink : colors.muted,
        }}>
        {t(`expense.category.${category}`)}
      </Text>
    </Pressable>
  );
}

export default function ExpenseEditScreen() {
  // category/subtype: Özet'teki hatırlatmadan "Yapıldı" ile gelince form o türle açılır.
  const {
    id,
    category: initialCategory,
    subtype: initialSubtype,
  } = useLocalSearchParams<{ id?: string; category?: ExpenseCategory; subtype?: ServiceSubtype }>();
  const { t, number, locale } = useI18n();
  const { colors } = useTheme();
  const { active: vehicle } = useActiveVehicle();

  const [form, setForm] = useState<ExpenseInput>(() => ({
    date: Date.now(),
    category: initialCategory && EXPENSE_CATEGORIES.includes(initialCategory) ? initialCategory : null,
    subtypes: initialSubtype && SERVICE_SUBTYPES.includes(initialSubtype) ? [initialSubtype] : [],
    amount: '',
    odometerKm: '',
    note: '',
  }));
  const [initial, setInitial] = useState<ExpenseInput>(form);
  const [errors, setErrors] = useState<ExpenseErrors>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done) router.back();
  }, [done]);

  useEffect(() => {
    if (!id) return;
    getExpense(id).then((e) => {
      if (e) {
        const values: ExpenseInput = {
          date: e.date,
          category: e.category,
          subtypes: e.subtypes ?? [],
          amount: toInput(e.amount, locale),
          odometerKm: e.odometerKm !== null ? String(e.odometerKm) : '',
          note: e.note ?? '',
        };
        setInitial(values);
        setForm(values);
      }
      setLoaded(true);
    });
    // Form sadece açılışta doldurulur; dil değişince yeniden yüklenmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  usePreventRemove(dirty && !done, ({ repeat }) => {
    Alert.alert(t('vehicle.discardTitle'), t('vehicle.discardText'), [
      { text: t('vehicle.keepEditing'), style: 'cancel' },
      { text: t('vehicle.discard'), style: 'destructive', onPress: repeat },
    ]);
  });

  const set = <K extends keyof ExpenseInput>(key: K, value: ExpenseInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  if (!vehicle) return null;

  const save = async () => {
    const result = validateExpense(form);
    if (!result.ok) {
      setErrors(result.errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    try {
      if (id) await updateExpense(id, vehicle.id, result.value);
      else await createExpense(vehicle.id, result.value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch {
      Alert.alert(t('vehicle.saveFailed'));
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('fuel.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (id) await deleteExpense(id);
          setDone(true);
        },
      },
    ]);

  const err = (k: keyof ExpenseInput) => (errors[k] ? t(errors[k]) : undefined);
  const kmRelevant = form.category !== null && KM_RELEVANT.includes(form.category);

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: id ? t('fuel.editTitle') : t('expense.newTitle'),
          headerLeft: () => <HeaderButton title={t('common.cancel')} onPress={() => router.back()} />,
          headerRight: () => <HeaderButton title={t('common.save')} bold onPress={save} />,
        }}
      />
      {loaded ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}>
          <Section title={t('expense.section.type')} index={0}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXPENSE_CATEGORIES.map((c) => (
                <CategoryTile key={c} category={c} selected={form.category === c} onPress={() => set('category', c)} />
              ))}
            </View>
            {errors.category ? (
              <Text variant="caption" tone="rust">
                {t(errors.category)}
              </Text>
            ) : null}
            {form.category === 'service' ? (
              <Animated.View entering={FadeInDown.duration(220)} style={{ gap: 8 }}>
                <Text variant="caption" tone="muted">
                  {t('expense.subtype')} · {t('expense.subtypeHint')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SERVICE_SUBTYPES.map((s) => (
                    <Chip
                      key={s}
                      label={t(`expense.subtype.${s}`)}
                      selected={form.subtypes.includes(s)}
                      onPress={() =>
                        set(
                          'subtypes',
                          form.subtypes.includes(s) ? form.subtypes.filter((x) => x !== s) : [...form.subtypes, s],
                        )
                      }
                    />
                  ))}
                </View>
                {errors.subtypes ? (
                  <Text variant="caption" tone="rust">
                    {t(errors.subtypes)}
                  </Text>
                ) : null}
              </Animated.View>
            ) : null}
          </Section>

          <Section title={t('expense.section.details')} index={1}>
            <TextField
              label={`${t('expense.amount')} (₺)`}
              placeholder="1.250"
              value={form.amount}
              onChangeText={(v) => set('amount', v)}
              error={err('amount')}
              keyboardType="decimal-pad"
              maxLength={12}
              autoFocus={!id && form.category !== null}
            />
            <TextField
              label={t('fuel.odometer')}
              hint={t('common.optional')}
              placeholder={number(vehicle.odometerKm)}
              value={form.odometerKm}
              onChangeText={(v) => set('odometerKm', v)}
              error={err('odometerKm')}
              help={kmRelevant ? t('expense.kmHelp') : undefined}
              keyboardType="number-pad"
              maxLength={9}
            />
            <DateField
              label={t('fuel.date')}
              value={form.date}
              onChange={(ms) => set('date', ms)}
              past
              error={err('date')}
            />
            <TextField
              label={t('fuel.note')}
              hint={t('common.optional')}
              placeholder={t('expense.notePlaceholder')}
              value={form.note}
              onChangeText={(v) => set('note', v)}
              error={err('note')}
              maxLength={240}
            />
          </Section>

          <Animated.View entering={FadeInDown.delay(150).duration(320)} style={{ gap: 10 }}>
            <Button title={t('common.save')} onPress={save} disabled={saving} />
            {id ? <Button title={t('common.delete')} kind="danger" onPress={confirmDelete} /> : null}
          </Animated.View>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}
