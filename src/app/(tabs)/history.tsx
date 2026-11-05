import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { AddEntryFab } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Expense, FuelEntry } from '@/db/schema';
import { CATEGORY_ICONS, SUBTYPE_ICONS } from '@/features/expenses/categories';
import { useExpenses } from '@/features/expenses/repository';
import type { IntervalFlag } from '@/features/fuel/consumption';
import { groupByMonth, mergeHistory } from '@/features/fuel/history';
import { useFuelStats } from '@/features/fuel/useFuelStats';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

// Gün kutusu: ruhsat belgesindeki tarih damgası.
function DayStamp({ ms }: { ms: number }) {
  const { date } = useI18n();
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 44,
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.line,
      }}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: colors.ink }}>{date(ms, { day: '2-digit' })}</Text>
      <Text variant="label" tone="muted" style={{ fontSize: 9, letterSpacing: 1 }}>
        {date(ms, { weekday: 'short' })}
      </Text>
    </View>
  );
}

const rowStyle = ({ pressed }: { pressed: boolean }) =>
  ({ flexDirection: 'row', gap: 12, padding: 14, opacity: pressed ? 0.6 : 1 }) as const;

function ExpenseRow({ expense }: { expense: Expense }) {
  const { t, number, money } = useI18n();
  const { colors } = useTheme();
  // Bakımda yapılanlar başlıkta: "Bakım · Yağ, Filtre".
  const subtypes = expense.subtypes ?? [];
  const title =
    subtypes.length > 0
      ? `${t('expense.category.service')} · ${subtypes.map((s) => t(`expense.subtype.${s}`)).join(', ')}`
      : t(`expense.category.${expense.category}`);
  const details = [expense.odometerKm !== null ? `${number(expense.odometerKm)} ${t('common.km')}` : null, expense.note]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('fuel.editTitle')}
      onPress={() => router.push({ pathname: '/expenses/edit', params: { id: expense.id } })}
      style={rowStyle}>
      <DayStamp ms={expense.date} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SymbolView
            name={subtypes.length === 1 ? SUBTYPE_ICONS[subtypes[0]] : CATEGORY_ICONS[expense.category]}
            size={14}
            tintColor={colors.muted}
          />
          <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        {details ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {details}
          </Text>
        ) : null}
      </View>
      <Text variant="bodyMedium">{money(expense.amount)}</Text>
    </Pressable>
  );
}

function FuelRow({ entry, per100, flag }: { entry: FuelEntry; per100?: number; flag?: IntervalFlag }) {
  const { t, number, money } = useI18n();
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
      style={rowStyle}>
      <DayStamp ms={entry.date} />
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
  const expenses = useExpenses(active?.id);
  const groups = groupByMonth(mergeHistory(entries, expenses));

  return (
    <Screen banner footer={active ? <AddEntryFab /> : null}>
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
              {g.items.map((item, j) => (
                <View key={item.id} style={j > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                  {item.type === 'fuel' ? (
                    <FuelRow
                      entry={item.entry}
                      per100={stats.per100ByEntry.get(item.id)}
                      flag={stats.flagsByEntry.get(item.id)}
                    />
                  ) : (
                    <ExpenseRow expense={item.entry} />
                  )}
                </View>
              ))}
            </Card>
          </Animated.View>
        ))
      )}
    </Screen>
  );
}
