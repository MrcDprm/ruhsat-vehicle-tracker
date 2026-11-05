import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { HeaderButton } from '@/components/HeaderButton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { SERVICE_SUBTYPES, type Reminder, type ServiceSubtype } from '@/db/schema';
import { SUBTYPE_ICONS } from '@/features/expenses/categories';
import { normalizeDate } from '@/features/fuel/validation';
import { getReminders, saveReminders } from '@/features/reminders/repository';
import { inspectionDue, roadTaxDue, serviceDue } from '@/features/reminders/rules';
import {
  buildReminders,
  defaultService,
  emptySetup,
  toSetupInput,
  type InspectionMode,
  type ServiceSetup,
  type SetupErrors,
  type SetupInput,
} from '@/features/reminders/setup';
import { useVehicles } from '@/features/vehicles/repository';
import { parseNumber } from '@/features/vehicles/validation';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Başlıkta simge, ad, açma/kapama; açıkken altında alanlar ve "Sıradaki: …" önizlemesi. */
function ReminderSection({
  icon,
  title,
  enabled,
  onToggle,
  preview,
  index,
  children,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  preview?: string | null;
  index: number;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const open = enabled ?? true;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: open ? colors.amberSoft : colors.background,
            }}>
            <SymbolView name={icon} size={18} tintColor={open ? colors.ink : colors.muted} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text variant="bodyMedium">{title}</Text>
            {open && preview ? (
              <Text variant="caption" tone="amber" style={{ fontFamily: fonts.bodySemi }}>
                {preview}
              </Text>
            ) : null}
          </View>
          {onToggle ? <Toggle value={open} onChange={onToggle} label={title} /> : null}
        </View>
        {open && children ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
            {children}
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

export default function ReminderSetupScreen() {
  const params = useLocalSearchParams<{ vehicleId: string; first?: string }>();
  const first = params.first === '1';
  const { t, number, date } = useI18n();
  const { colors } = useTheme();
  const vehicle = useVehicles().find((v) => v.id === params.vehicleId) ?? null;

  const [now] = useState(() => Date.now());
  const [form, setForm] = useState<SetupInput>(() => emptySetup(now));
  const [initial, setInitial] = useState<SetupInput>(form);
  const [existing, setExisting] = useState<Reminder[]>([]);
  const [errors, setErrors] = useState<SetupErrors>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done) router.back();
  }, [done]);

  useEffect(() => {
    getReminders(params.vehicleId).then((list) => {
      const values = toSetupInput(list, now);
      setExisting(list);
      setForm(values);
      setInitial(values);
      setLoaded(true);
    });
  }, [params.vehicleId, now]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  // İlk kurulumda "Şimdilik geç" uyarısız kapatır; düzenlemede kaydedilmemiş değişiklik sorulur.
  usePreventRemove(dirty && !done && !first, ({ repeat }) => {
    Alert.alert(t('vehicle.discardTitle'), t('vehicle.discardText'), [
      { text: t('vehicle.keepEditing'), style: 'cancel' },
      { text: t('vehicle.discard'), style: 'destructive', onPress: repeat },
    ]);
  });

  if (!vehicle) return null;

  const patch = <K extends keyof SetupInput>(key: K, value: Partial<SetupInput[K]>) => {
    setForm((f) => ({ ...f, [key]: { ...f[key], ...value } }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const patchService = (subtype: ServiceSubtype, value: Partial<ServiceSetup>) => {
    setForm((f) => ({ ...f, services: f.services.map((s) => (s.subtype === subtype ? { ...s, ...value } : s)) }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`service.${subtype}.`))));
  };

  const addService = (subtype: ServiceSubtype) => {
    Haptics.selectionAsync();
    setForm((f) =>
      f.services.some((s) => s.subtype === subtype)
        ? { ...f, services: f.services.map((s) => (s.subtype === subtype ? { ...s, enabled: true } : s)) }
        : { ...f, services: [...f.services, defaultService(subtype, now)] },
    );
  };

  const save = () => {
    const result = buildReminders(form, { now, odometerKm: vehicle.odometerKm, existing });
    if (!result.ok) {
      setErrors(result.errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    try {
      saveReminders(vehicle.id, result.drafts, existing);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch {
      Alert.alert(t('vehicle.saveFailed'));
      setSaving(false);
    }
  };

  const err = (k: string) => (errors[k] ? t(errors[k]) : undefined);
  const longDate = (ms: number | null) => (ms ? date(ms, { day: 'numeric', month: 'long', year: 'numeric' }) : null);
  const next = (ms: number | null) => (ms ? t('reminder.next', { date: longDate(ms)! }) : null);

  const ins = form.inspection;
  const insDate = normalizeDate(ins.date);
  const inspectionNext =
    ins.mode === 'manual'
      ? insDate
      : inspectionDue({
          lastDate: ins.mode === 'last' ? insDate : null,
          firstRegistrationDate: ins.mode === 'new' ? insDate : null,
          commercial: ins.commercial,
        });
  const insLabel: Record<InspectionMode, string> = {
    last: t('reminder.inspection.lastDate'),
    new: t('reminder.inspection.firstDate'),
    manual: t('reminder.inspection.nextDate'),
  };

  const services = form.services.filter((s) => s.enabled);
  const addable = SERVICE_SUBTYPES.filter((s) => !services.some((x) => x.subtype === s));

  const servicePreview = (s: ServiceSetup) => {
    const due = serviceDue({
      lastDoneDate: normalizeDate(s.lastDate),
      lastDoneKm: parseNumber(s.lastKm),
      intervalMonths: parseNumber(s.intervalMonths),
      intervalKm: parseNumber(s.intervalKm),
    });
    const parts = [
      due.dueKm !== null && Number.isFinite(due.dueKm) ? `${number(due.dueKm)} ${t('common.km')}` : null,
      due.dueDate !== null && Number.isFinite(due.dueDate)
        ? date(due.dueDate, { month: 'long', year: 'numeric' })
        : null,
    ].filter(Boolean);
    return parts.length ? t('reminder.next', { date: parts.join(t('reminder.or')) }) : null;
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: t('reminder.title'),
          headerLeft: () => (
            <HeaderButton title={first ? t('reminder.skip') : t('common.cancel')} onPress={() => router.back()} />
          ),
          headerRight: () => <HeaderButton title={t('common.save')} bold onPress={save} />,
        }}
      />
      {loaded ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Text variant="heading">{vehicle.name}</Text>
            <Text variant="caption" tone="muted">
              {t('reminder.intro')}
            </Text>
          </View>

          <ReminderSection
            index={0}
            icon="checkmark.seal.fill"
            title={t('reminder.kind.inspection')}
            enabled={ins.enabled}
            onToggle={(v) => patch('inspection', { enabled: v })}
            preview={next(inspectionNext)}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['last', 'new', 'manual'] as const).map((m) => (
                <Chip
                  key={m}
                  label={t(`reminder.inspection.mode.${m}`)}
                  selected={ins.mode === m}
                  onPress={() => patch('inspection', { mode: m })}
                />
              ))}
            </View>
            <DateField
              label={insLabel[ins.mode]}
              value={ins.date}
              onChange={(ms) => patch('inspection', { date: ms })}
              past={ins.mode !== 'manual'}
              future={ins.mode === 'manual'}
              error={err('inspection')}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="body">{t('reminder.inspection.commercial')}</Text>
                <Text variant="caption" tone="muted">
                  {t('reminder.inspection.commercialHelp')}
                </Text>
              </View>
              <Toggle
                value={ins.commercial}
                onChange={(v) => patch('inspection', { commercial: v })}
                label={t('reminder.inspection.commercial')}
              />
            </View>
          </ReminderSection>

          <ReminderSection
            index={1}
            icon="shield.lefthalf.filled"
            title={t('reminder.kind.traffic_insurance')}
            enabled={form.trafficInsurance.enabled}
            onToggle={(v) => patch('trafficInsurance', { enabled: v })}>
            <DateField
              label={t('reminder.policyEnd')}
              value={form.trafficInsurance.date}
              onChange={(ms) => patch('trafficInsurance', { date: ms })}
            />
          </ReminderSection>

          <ReminderSection
            index={2}
            icon="shield.fill"
            title={t('reminder.kind.casco')}
            enabled={form.casco.enabled}
            onToggle={(v) => patch('casco', { enabled: v })}>
            <DateField
              label={t('reminder.policyEnd')}
              value={form.casco.date}
              onChange={(ms) => patch('casco', { date: ms })}
            />
          </ReminderSection>

          <ReminderSection
            index={3}
            icon="building.columns.fill"
            title={t('reminder.kind.road_tax')}
            enabled={form.roadTax.enabled}
            onToggle={(v) => patch('roadTax', { enabled: v })}
            preview={next(roadTaxDue(now, existing.find((r) => r.kind === 'road_tax')?.lastDoneDate ?? null).dueDate)}>
            <Text variant="caption" tone="muted">
              {t('reminder.roadTaxHelp')}
            </Text>
          </ReminderSection>

          <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ gap: 8, marginTop: 6 }}>
            <Text variant="section" tone="muted" style={{ marginLeft: 4 }}>
              {t('reminder.services')}
            </Text>
            {services.length === 0 ? (
              <Text variant="caption" tone="muted" style={{ marginLeft: 4 }}>
                {t('reminder.servicesEmpty')}
              </Text>
            ) : null}
          </Animated.View>

          {services.map((s, i) => (
            <ReminderSection
              key={s.subtype}
              index={4 + i}
              icon={SUBTYPE_ICONS[s.subtype]}
              title={t(`reminder.service.${s.subtype}`)}
              preview={servicePreview(s)}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('reminder.everyKm')}
                    placeholder="10000"
                    value={s.intervalKm}
                    onChangeText={(v) => patchService(s.subtype, { intervalKm: v })}
                    error={err(`service.${s.subtype}.intervalKm`)}
                    keyboardType="number-pad"
                    maxLength={7}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('reminder.everyMonths')}
                    placeholder="12"
                    value={s.intervalMonths}
                    onChangeText={(v) => patchService(s.subtype, { intervalMonths: v })}
                    error={err(`service.${s.subtype}.intervalMonths`)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>
              <TextField
                label={t('reminder.lastKm')}
                hint={t('common.optional')}
                placeholder={number(vehicle.odometerKm)}
                value={s.lastKm}
                onChangeText={(v) => patchService(s.subtype, { lastKm: v })}
                error={err(`service.${s.subtype}.lastKm`)}
                keyboardType="number-pad"
                maxLength={9}
              />
              <DateField
                label={t('reminder.lastDate')}
                value={s.lastDate}
                onChange={(ms) => patchService(s.subtype, { lastDate: ms })}
                past
                error={err(`service.${s.subtype}.lastDate`)}
              />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => patchService(s.subtype, { enabled: false })}
                style={{ alignSelf: 'flex-start' }}>
                <Text variant="caption" tone="rust" style={{ fontFamily: fonts.bodySemi }}>
                  {t('reminder.removeService')}
                </Text>
              </Pressable>
            </ReminderSection>
          ))}

          {addable.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {addable.map((s) => (
                <Chip
                  key={s}
                  label={`+ ${t(`reminder.service.${s}`)}`}
                  selected={false}
                  onPress={() => addService(s)}
                />
              ))}
            </View>
          ) : null}

          <View style={{ marginTop: 10 }}>
            <Button title={t('common.save')} onPress={save} disabled={saving} />
          </View>
        </ScrollView>
      ) : null}
    </KeyboardAvoidingView>
  );
}
