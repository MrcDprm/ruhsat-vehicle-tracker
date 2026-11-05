import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { FuelEntry } from '@/db/schema';
import type { IntervalFlag } from '@/features/fuel/consumption';
import { groupByMonth } from '@/features/fuel/history';
import { useFuelStats } from '@/features/fuel/useFuelStats';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

function EntryRow({ entry, per100, flag }: { entry: FuelEntry; per100?: number; flag?: IntervalFlag }) {
  const { t, number, money, date } = useI18n();
  const { colors } = useTheme();
  const unit = entry.fuelType === 'electric' ? 'kWh' : 'L';
  const details = [`${number(entry.liters, 2)} ${unit}`, `${number(entry.odometerKm)} ${t('common.km')}`, entry.station]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('fuel.editTitle')}
      onPress={() => router.push({ pathname: '/fuel/edit', params: { id: entry.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 14, opacity: pressed ? 0.6 : 1 })}>
      {/* Gün kutusu: ruhsat belgesindeki tarih damgası */}
      <View
        style={{
          width: 44,
          alignItems: 'center',
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.line,
        }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: colors.ink }}>
          {date(entry.date, { day: '2-digit' })}
        </Text>
        <Text variant="label" tone="muted" style={{ fontSize: 9, letterSpacing: 1 }}>
          {date(entry.date, { weekday: 'short' })}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodyMedium">{t(`fuel.${entry.fuelType}`)}</Text>
          {entry.isFull ? null : (
            <Text variant="caption" tone="muted">
              · {t('history.partial')}
            </Text>
          )}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {details}
        </Text>
        {flag ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <SymbolView name="exclamationmark.triangle.fill" size={12} tintColor={colors.rust} />
            <Text variant="caption" tone="rust">
              {t(flag === 'odometer' ? 'history.flag.odometer' : 'history.flag.outlier')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="bodyMedium">{money(entry.totalPrice)}</Text>
        {per100 !== undefined ? (
          <Text variant="caption" tone="sage" style={{ fontFamily: fonts.bodySemi }}>
            {number(per100, 1)} {unit}/100
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { t, money, date } = useI18n();
  const { colors } = useTheme();
  const { active } = useActiveVehicle();
  const { entries, stats } = useFuelStats(active?.id);
  const groups = groupByMonth(entries);

  return (
    <Screen
      footer={
        active ? (
          <Fab icon="fuelpump.fill" label={t('fuel.newTitle')} onPress={() => router.push('/fuel/edit')} />
        ) : null
      }>
      <View style={{ gap: 2 }}>
        <Text variant="title">{t('tab.history')}</Text>
        {active ? (
          <Text variant="caption" tone="muted">
            {active.name}
          </Text>
        ) : null}
      </View>
      {groups.length === 0 ? (
        <EmptyState text={t('history.empty')} illustration={false} />
      ) : (
        groups.map((g, i) => (
          <Animated.View key={g.key} entering={FadeInDown.delay(Math.min(i, 4) * 60).duration(300)} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginHorizontal: 4 }}>
              <Text variant="section" tone="muted">
                {date(new Date(g.year, g.month, 1).getTime(), { month: 'long', year: 'numeric' })}
              </Text>
              <Text variant="caption" tone="muted" style={{ fontFamily: fonts.bodySemi }}>
                {money(g.total, 0)}
              </Text>
            </View>
            <Card style={{ overflow: 'hidden' }}>
              {g.items.map((e, j) => (
                <View key={e.id} style={j > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                  <EntryRow entry={e} per100={stats.per100ByEntry.get(e.id)} flag={stats.flagsByEntry.get(e.id)} />
                </View>
              ))}
            </Card>
          </Animated.View>
        ))
      )}
    </Screen>
  );
}
