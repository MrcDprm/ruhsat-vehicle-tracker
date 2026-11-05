import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { HeaderButton } from '@/components/HeaderButton';
import { Section } from '@/components/Section';
import { Suggestions } from '@/components/Suggestions';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { FUEL_TYPES, type FuelType } from '@/db/schema';
import { canonicalModel, fold, suggestMakes, suggestModels } from '@/features/vehicles/catalog';
import { createVehicle, deleteVehicle, getVehicle, updateVehicle, useVehicles } from '@/features/vehicles/repository';
import { isTurkishPlate, maskForeignPlate, maskTurkishPlate } from '@/features/vehicles/plate';
import { validateVehicle, type VehicleErrors, type VehicleInput } from '@/features/vehicles/validation';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const EMPTY: VehicleInput = {
  name: '',
  make: '',
  model: '',
  year: '',
  plate: '',
  plateForeign: false,
  fuelTypes: ['petrol'],
  tankLiters: '',
  odometerKm: '',
};

export default function VehicleEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, number } = useI18n();
  const { colors } = useTheme();
  const others = useVehicles().filter((v) => v.id !== id);
  const [form, setForm] = useState<VehicleInput>(EMPTY);
  const [initial, setInitial] = useState<VehicleInput>(EMPTY);
  const [errors, setErrors] = useState<VehicleErrors>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [focused, setFocused] = useState<keyof VehicleInput | null>(null);
  // Kayıt/silme bitince kapanış bir sonraki çizimde yapılır; o çizimde çıkış engeli artık kalkmış olur.
  // Yeni araçtan sonra hatırlatma kurulumu açılır (muayene, sigorta, bakım bir kez sorulur).
  const [done, setDone] = useState<'back' | 'dismissAll' | { setup: string } | null>(null);
  useEffect(() => {
    if (done === 'back') router.back();
    else if (done === 'dismissAll') router.dismissAll();
    else if (done) router.replace({ pathname: '/reminders/setup', params: { vehicleId: done.setup, first: '1' } });
  }, [done]);

  useEffect(() => {
    if (!id) return;
    getVehicle(id).then((v) => {
      if (v) {
        const values: VehicleInput = {
          name: v.name,
          make: v.make ?? '',
          model: v.model ?? '',
          year: v.year ? String(v.year) : '',
          plate: v.plate ?? '',
          plateForeign: v.plate ? !isTurkishPlate(v.plate) : false,
          fuelTypes: v.fuelTypes,
          tankLiters: v.tankLiters ? number(v.tankLiters, v.tankLiters % 1 ? 1 : 0) : '',
          odometerKm: String(v.odometerKm),
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

  // Kaydedilmemiş değişiklik varken aşağı kaydırma ya da Vazgeç formu sessizce kapatmaz.
  usePreventRemove(dirty && done === null, ({ repeat }) => {
    Alert.alert(t('vehicle.discardTitle'), t('vehicle.discardText'), [
      { text: t('vehicle.keepEditing'), style: 'cancel' },
      { text: t('vehicle.discard'), style: 'destructive', onPress: repeat },
    ]);
  });

  const set = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Marka değişince eski markanın modeli anlamsızdır: yeni markada da olmayan model silinir.
  const setMake = (make: string) =>
    setForm((f) => {
      const changed = fold(make) !== fold(f.make);
      const keepModel = !changed || f.model === '' || canonicalModel(make, f.model) !== null;
      return { ...f, make, model: keepModel ? f.model : '' };
    });

  const toggleFuel = (f: FuelType) =>
    set('fuelTypes', form.fuelTypes.includes(f) ? form.fuelTypes.filter((x) => x !== f) : [...form.fuelTypes, f]);

  const save = async () => {
    const result = validateVehicle(form, { takenPlates: others.map((v) => v.plate) });
    if (!result.ok) {
      setErrors(result.errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    try {
      if (id) await updateVehicle(id, result.value);
      else {
        const newId = await createVehicle(result.value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone({ setup: newId });
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone('back');
    } catch {
      Alert.alert(t('vehicle.saveFailed'));
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('vehicle.deleteTitle'), t('vehicle.deleteText', { name: form.name || form.make }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (id) await deleteVehicle(id);
          setDone('dismissAll');
        },
      },
    ]);

  const err = (k: keyof VehicleInput) => (errors[k] ? t(errors[k]) : undefined);
  const focus = (k: keyof VehicleInput) => ({
    onFocus: () => setFocused(k),
    onBlur: () => setFocused((f) => (f === k ? null : f)),
  });
  const makeSuggestions = focused === 'make' ? suggestMakes(form.make) : [];
  const modelSuggestions = focused === 'model' ? suggestModels(form.make, form.model) : [];
  const electricOnly = form.fuelTypes.length === 1 && form.fuelTypes[0] === 'electric';
  const autoName = [form.make, form.model]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: id ? t('vehicle.editTitle') : t('vehicle.newTitle'),
          headerLeft: () => <HeaderButton title={t('common.cancel')} onPress={() => router.back()} />,
          headerRight: () => <HeaderButton title={t('common.save')} bold onPress={save} />,
        }}
      />
      {loaded ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}>
          <Section title={t('vehicle.section.car')} index={0}>
            <View style={{ gap: 8 }}>
              <TextField
                label={t('vehicle.make')}
                placeholder={t('vehicle.makePlaceholder')}
                value={form.make}
                onChangeText={setMake}
                error={err('make')}
                maxLength={60}
                autoCorrect={false}
                autoFocus={!id}
                {...focus('make')}
              />
              <Suggestions items={makeSuggestions} onPick={setMake} />
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 3 }}>
                  <TextField
                    label={t('vehicle.model')}
                    placeholder={t('vehicle.modelPlaceholder')}
                    value={form.model}
                    onChangeText={(v) => set('model', v)}
                    error={err('model')}
                    maxLength={60}
                    autoCorrect={false}
                    {...focus('model')}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <TextField
                    label={t('vehicle.year')}
                    placeholder="2019"
                    value={form.year}
                    onChangeText={(v) => set('year', v.replace(/\D/g, ''))}
                    error={err('year')}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              <Suggestions items={modelSuggestions} onPick={(v) => set('model', v)} />
            </View>
            <TextField
              label={t('vehicle.nickname')}
              hint={t('common.optional')}
              placeholder={autoName || t('vehicle.namePlaceholder')}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              error={err('name')}
              help={t('vehicle.nicknameHelp')}
              maxLength={60}
            />
          </Section>

          <Section title={t('vehicle.section.identity')} index={1}>
            <TextField
              label={t('vehicle.plate')}
              hint={t('common.optional')}
              placeholder={form.plateForeign ? 'B MW 1234' : t('vehicle.platePlaceholder')}
              value={form.plate}
              onChangeText={(v) => set('plate', form.plateForeign ? maskForeignPlate(v) : maskTurkishPlate(v))}
              error={err('plate')}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={14}
            />
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                setForm((f) => ({
                  ...f,
                  plateForeign: !f.plateForeign,
                  plate: f.plateForeign ? maskTurkishPlate(f.plate) : maskForeignPlate(f.plate),
                }))
              }
              style={{ alignSelf: 'flex-start', marginTop: -6 }}>
              <Text variant="caption" tone="amber" style={{ fontFamily: fonts.bodySemi }}>
                {form.plateForeign ? t('vehicle.plateTurkish') : t('vehicle.plateForeign')}
              </Text>
            </Pressable>
            <View style={{ gap: 8 }}>
              <Text variant="caption" tone="muted">
                {t('vehicle.fuelTypes')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {FUEL_TYPES.map((f) => (
                  <Chip
                    key={f}
                    label={t(`fuel.${f}`)}
                    selected={form.fuelTypes.includes(f)}
                    onPress={() => toggleFuel(f)}
                  />
                ))}
              </View>
              <Text variant="caption" tone={errors.fuelTypes ? 'rust' : 'muted'}>
                {errors.fuelTypes ? t(errors.fuelTypes) : t('vehicle.fuelHint')}
              </Text>
            </View>
          </Section>

          <Section title={t('vehicle.section.odometer')} index={2}>
            <TextField
              label={t('vehicle.odometer')}
              placeholder="87.421"
              value={form.odometerKm}
              onChangeText={(v) => set('odometerKm', v)}
              error={err('odometerKm')}
              help={t('vehicle.odometerHint')}
              keyboardType="number-pad"
              maxLength={9}
            />
            {electricOnly ? null : (
              <TextField
                label={t('vehicle.tank')}
                hint={t('common.optional')}
                placeholder="45"
                value={form.tankLiters}
                onChangeText={(v) => set('tankLiters', v)}
                error={err('tankLiters')}
                keyboardType="decimal-pad"
                maxLength={6}
              />
            )}
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
