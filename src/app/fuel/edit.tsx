import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { HeaderButton } from '@/components/HeaderButton';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import type { EntryFuelType } from '@/db/schema';
import { derive, derivedField, touch, type PriceField } from '@/features/fuel/price';
import {
  createFuelEntry,
  deleteFuelEntry,
  getFuelEntry,
  updateFuelEntry,
  useFuelEntries,
} from '@/features/fuel/repository';
import {
  entryFuelTypes,
  neighbors,
  normalizeDate,
  toInput,
  validateFuel,
  type FuelErrors,
  type FuelInput,
  type FuelWarning,
} from '@/features/fuel/validation';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { parseNumber } from '@/features/vehicles/validation';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

// Formdaki fiyat alanları ile PriceField eşleşmesi.
const PRICE_KEYS: Record<PriceField, 'liters' | 'totalPrice' | 'unitPrice'> = {
  liters: 'liters',
  total: 'totalPrice',
  unit: 'unitPrice',
};

export default function FuelEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, number, locale } = useI18n();
  const { colors } = useTheme();
  const { active: vehicle } = useActiveVehicle();
  const entries = useFuelEntries(vehicle?.id);
  const allowed = useMemo(() => entryFuelTypes(vehicle?.fuelTypes ?? []), [vehicle?.fuelTypes]);

  // Yeni kayıtta yakıt türü son kayıttaki tür (LPG'li araçta çoğu dolum aynı yakıt), yoksa aracın ilk yakıtı.
  const lastFuel = entries[0]?.fuelType;
  const preferredFuel = lastFuel && allowed.includes(lastFuel) ? lastFuel : (allowed[0] ?? null);

  const [form, setForm] = useState<FuelInput>(() => ({
    date: Date.now(),
    odometerKm: '',
    liters: '',
    totalPrice: '',
    unitPrice: '',
    fuelType: preferredFuel,
    isFull: true,
    station: '',
    note: '',
  }));
  const [initial, setInitial] = useState<FuelInput>(form);
  const fuelPicked = useRef(false);
  const [createdAt, setCreatedAt] = useState<number | undefined>();
  const [recent, setRecent] = useState<PriceField[]>([]);
  const [errors, setErrors] = useState<FuelErrors>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done) router.back();
  }, [done]);

  useEffect(() => {
    if (!id) return;
    getFuelEntry(id).then((e) => {
      if (e) {
        const values: FuelInput = {
          date: e.date,
          odometerKm: String(e.odometerKm),
          liters: toInput(e.liters, locale),
          totalPrice: toInput(e.totalPrice, locale),
          unitPrice: toInput(e.unitPrice, locale),
          fuelType: e.fuelType,
          isFull: e.isFull,
          station: e.station ?? '',
          note: e.note ?? '',
        };
        setInitial(values);
        setForm(values);
        setCreatedAt(e.createdAt);
      }
      setLoaded(true);
    });
    // Form sadece açılışta doldurulur; dil değişince yeniden yüklenmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Kayıtlar veritabanından ilk çizimden sonra gelir; kullanıcı yakıt seçmediyse önerilen tür o zaman yerleşir.
  // initial da güncellenir: dokunulmamış form "kaydedilmemiş değişiklik" sayılmasın.
  useEffect(() => {
    if (id || fuelPicked.current) return;
    setForm((f) => ({ ...f, fuelType: preferredFuel }));
    setInitial((i) => ({ ...i, fuelType: preferredFuel }));
  }, [id, preferredFuel]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  usePreventRemove(dirty && !done, ({ repeat }) => {
    Alert.alert(t('vehicle.discardTitle'), t('vehicle.discardText'), [
      { text: t('vehicle.keepEditing'), style: 'cancel' },
      { text: t('vehicle.discard'), style: 'destructive', onPress: repeat },
    ]);
  });

  const set = <K extends keyof FuelInput>(key: K, value: FuelInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // İki fiyat alanı girilince üçüncüsü hesaplanır; hangisinin hesaplanacağını son dokunulan iki alan belirler.
  const setPrice = (field: PriceField, raw: string) => {
    const nextRecent = touch(recent, field);
    setRecent(nextRecent);
    setForm((f) => {
      const next = { ...f, [PRICE_KEYS[field]]: raw };
      const num = (k: PriceField) => parseNumber(next[PRICE_KEYS[k]]);
      const result = derive({ liters: num('liters'), total: num('total'), unit: num('unit') }, nextRecent);
      if (result) next[PRICE_KEYS[result.field]] = toInput(result.value, locale);
      return next;
    });
    setErrors((e) => ({ ...e, liters: undefined, totalPrice: undefined, unitPrice: undefined }));
  };

  if (!vehicle) return null;

  const lastSameFuel = entries.find((e) => e.fuelType === form.fuelType && e.id !== id);
  const { previous, next } = neighbors(
    entries,
    normalizeDate(form.date),
    id && createdAt !== undefined ? { id, createdAt } : undefined,
  );
  const electric = form.fuelType === 'electric';
  const computed = derivedField(recent);

  const warningText = (w: FuelWarning) =>
    w === 'odometerBelowPrevious'
      ? t('fuel.warn.below', { km: number(previous?.odometerKm ?? 0) })
      : w === 'odometerAboveNext'
        ? t('fuel.warn.above', { km: number(next?.odometerKm ?? 0) })
        : t('fuel.warn.tank', { liters: number(vehicle.tankLiters ?? 0) });

  const persist = async (value: Parameters<typeof createFuelEntry>[1]) => {
    setSaving(true);
    try {
      if (id) await updateFuelEntry(id, vehicle.id, value);
      else await createFuelEntry(vehicle.id, value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch {
      Alert.alert(t('vehicle.saveFailed'));
      setSaving(false);
    }
  };

  const save = () => {
    const result = validateFuel(form, {
      allowedFuelTypes: allowed,
      tankLiters: vehicle.tankLiters,
      previous,
      next,
    });
    if (!result.ok) {
      setErrors(result.errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (result.warnings.length === 0) {
      persist(result.value);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('fuel.warn.title'), result.warnings.map(warningText).join('\n\n'), [
      { text: t('fuel.warn.fix'), style: 'cancel' },
      { text: t('fuel.warn.saveAnyway'), onPress: () => persist(result.value) },
    ]);
  };

  const confirmDelete = () =>
    Alert.alert(t('fuel.deleteTitle'), t('fuel.deleteText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (id) await deleteFuelEntry(id);
          setDone(true);
        },
      },
    ]);

  const err = (k: keyof FuelInput) => (errors[k] ? t(errors[k]) : undefined);
  const amountUnit = electric ? 'kWh' : 'L';
  const priceField = (field: PriceField, label: string, placeholder: string) => (
    <View style={{ flex: 1 }}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={form[PRICE_KEYS[field]]}
        onChangeText={(v) => setPrice(field, v)}
        error={err(PRICE_KEYS[field])}
        help={recent.length >= 2 && computed === field ? t('fuel.computed') : undefined}
        keyboardType="decimal-pad"
        maxLength={10}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: id ? t('fuel.editTitle') : t('fuel.newTitle'),
          headerLeft: () => <HeaderButton title={t('common.cancel')} onPress={() => router.back()} />,
          headerRight: () => <HeaderButton title={t('common.save')} bold onPress={save} />,
        }}
      />
      {loaded ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}>
          <Section title={vehicle.name} index={0}>
            {allowed.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {allowed.map((f: EntryFuelType) => (
                  <Chip
                    key={f}
                    label={t(`fuel.${f}`)}
                    selected={form.fuelType === f}
                    onPress={() => {
                      fuelPicked.current = true;
                      set('fuelType', f);
                    }}
                  />
                ))}
              </View>
            ) : null}
            {errors.fuelType ? (
              <Text variant="caption" tone="rust">
                {t(errors.fuelType)}
              </Text>
            ) : null}
            <TextField
              label={t('fuel.odometer')}
              placeholder={number(vehicle.odometerKm)}
              value={form.odometerKm}
              onChangeText={(v) => set('odometerKm', v)}
              error={err('odometerKm')}
              help={previous ? t('fuel.previousKm', { km: number(previous.odometerKm) }) : t('fuel.odometerHelp')}
              keyboardType="number-pad"
              maxLength={9}
              autoFocus={!id}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {priceField('liters', `${t(electric ? 'fuel.energy' : 'fuel.liters')} (${amountUnit})`, '38,4')}
              {priceField(
                'unit',
                `${t('fuel.unitPrice')} (₺/${amountUnit})`,
                lastSameFuel ? toInput(lastSameFuel.unitPrice, locale) : '43,79',
              )}
            </View>
            {priceField('total', `${t('fuel.total')} (₺)`, '1.680')}
            <Text variant="caption" tone="muted">
              {t('fuel.priceHint')}
            </Text>
          </Section>

          <Section title={t('fuel.section.fill')} index={1}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: form.isFull }}
              onPress={() => {
                Haptics.selectionAsync();
                set('isFull', !form.isFull);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: form.isFull ? colors.amber : colors.line,
                  backgroundColor: form.isFull ? colors.amber : colors.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {form.isFull ? (
                  <Text style={{ color: colors.onAmber, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18 }}>
                    ✓
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">{t(electric ? 'fuel.fullCharge' : 'fuel.full')}</Text>
                <Text variant="caption" tone="muted">
                  {t('fuel.fullHelp')}
                </Text>
              </View>
            </Pressable>
            <DateField
              label={t('fuel.date')}
              value={form.date}
              onChange={(ms) => set('date', ms)}
              past
              error={err('date')}
            />
          </Section>

          <Section title={t('fuel.section.more')} index={2}>
            <TextField
              label={t('fuel.station')}
              hint={t('common.optional')}
              placeholder={t('fuel.stationPlaceholder')}
              value={form.station}
              onChangeText={(v) => set('station', v)}
              error={err('station')}
              maxLength={80}
            />
            <TextField
              label={t('fuel.note')}
              hint={t('common.optional')}
              value={form.note}
              onChangeText={(v) => set('note', v)}
              error={err('note')}
              maxLength={240}
            />
          </Section>

          <Animated.View entering={FadeInDown.delay(210).duration(320)} style={{ gap: 10 }}>
            <Button title={t('common.save')} onPress={save} disabled={saving} />
            {id ? <Button title={t('common.delete')} kind="danger" onPress={confirmDelete} /> : null}
          </Animated.View>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}
