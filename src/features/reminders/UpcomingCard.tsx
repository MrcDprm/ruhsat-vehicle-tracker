import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import type { ExpenseCategory, Vehicle } from '@/db/schema';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { reminderIcon, reminderTitle } from './labels';
import { useNotificationPermission } from './notifications';
import { useUpcoming, type Upcoming } from './useUpcoming';

const EXPENSE_FOR: Record<string, ExpenseCategory> = {
  inspection: 'inspection',
  traffic_insurance: 'traffic_insurance',
  casco: 'casco',
  road_tax: 'road_tax',
  service: 'service',
};

function UpcomingRow({ item, vehicleId }: { item: Upcoming; vehicleId: string }) {
  const { t, number, date } = useI18n();
  const { colors } = useTheme();
  const { reminder: r, info } = item;
  const title = reminderTitle(r, t);
  const tone = info.state === 'overdue' ? colors.rust : info.state === 'soon' ? colors.amber : colors.muted;

  // Sağdaki büyük değer: kalan gün; tarih bilinmiyorsa kalan km.
  const big =
    info.daysLeft !== null
      ? info.daysLeft < 0
        ? t('reminder.overdueDays', { count: -info.daysLeft })
        : info.daysLeft === 0
          ? t('reminder.today')
          : t('reminder.days', { count: info.daysLeft })
      : info.kmLeft !== null
        ? `${number(info.kmLeft)} ${t('common.km')}`
        : '—';

  const when = info.dueDate ? date(info.dueDate, { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const sub =
    info.basis === 'km' && info.dueKm !== null
      ? t('reminder.atKmEstimated', { km: number(info.dueKm), date: when ?? '' })
      : info.dueKm !== null && info.dueDate === null
        ? t('reminder.atKm', { km: number(info.dueKm) })
        : (when ?? t('reminder.noDate'));

  const onPress = () =>
    Alert.alert(title, sub, [
      {
        text: t('reminder.markDone'),
        onPress: () =>
          router.push({
            pathname: '/expenses/edit',
            params: {
              category: EXPENSE_FOR[r.kind] ?? 'other',
              ...(r.kind === 'service' && r.title ? { subtype: r.title } : {}),
            },
          }),
      },
      { text: t('reminder.edit'), onPress: () => router.push({ pathname: '/reminders/setup', params: { vehicleId } }) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        opacity: pressed ? 0.6 : 1,
      })}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: tone,
        }}>
        <SymbolView name={reminderIcon(r)} size={17} tintColor={tone} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: info.state === 'ok' ? colors.ink : tone }}>
        {big}
      </Text>
    </Pressable>
  );
}

/** Özet'teki "Yaklaşanlar": en acil hatırlatmalar; hiç kurulmadıysa kurulum çağrısı. */
export function UpcomingCard({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { upcoming, reminders } = useUpcoming(vehicle);
  const permission = useNotificationPermission();
  const openSetup = () => router.push({ pathname: '/reminders/setup', params: { vehicleId: vehicle.id } });

  if (reminders.length === 0) {
    return (
      <Card style={{ padding: 16, gap: 12 }}>
        <Text variant="caption" tone="muted">
          {t('summary.upcomingEmpty')}
        </Text>
        <Button title={t('reminder.setup')} kind="secondary" onPress={openSetup} />
      </Card>
    );
  }

  return (
    <Card style={{ overflow: 'hidden' }}>
      {permission === 'denied' && upcoming.length > 0 ? (
        // İzin reddedildi: bildirim gelmeyeceğini söyle, Ayarlar'a tek dokunuşla götür.
        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openSettings()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            backgroundColor: colors.amberSoft,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}>
          <SymbolView name="bell.slash.fill" size={16} tintColor={colors.ink} />
          <Text variant="caption" style={{ flex: 1 }}>
            {t('reminder.notificationsOff')}
          </Text>
          <Text variant="caption" tone="amber" style={{ fontFamily: fonts.bodySemi }}>
            {t('reminder.openSettings')}
          </Text>
        </Pressable>
      ) : null}
      {upcoming.length === 0 ? (
        <Text variant="caption" tone="muted" style={{ padding: 16 }}>
          {t('reminder.allOff')}
        </Text>
      ) : (
        upcoming.map((item, i) => (
          <View key={item.reminder.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
            <UpcomingRow item={item} vehicleId={vehicle.id} />
          </View>
        ))
      )}
      <Pressable
        accessibilityRole="button"
        onPress={openSetup}
        style={{ borderTopWidth: 1, borderTopColor: colors.line, padding: 12, alignItems: 'center' }}>
        <Text variant="caption" tone="amber" style={{ fontFamily: fonts.bodySemi }}>
          {t('reminder.editAll')}
        </Text>
      </Pressable>
    </Card>
  );
}
