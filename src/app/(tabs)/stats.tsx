import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { LineChart, type Series } from '@/components/charts/LineChart';
import { StackedBars } from '@/components/charts/StackedBars';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ENTRY_FUEL_TYPES, type EntryFuelType } from '@/db/schema';
import { useExpenses } from '@/features/expenses/repository';
import { useFuelEntries } from '@/features/fuel/repository';
import {
  RANGES,
  SPEND_GROUPS,
  consumptionSeries,
  monthlySpend,
  rangeStart,
  summarizeRange,
  yearlyTotals,
  type RangeKey,
  type SpendGroup,
} from '@/features/stats/stats';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="section" tone="muted" style={{ marginTop: 10, marginLeft: 4 }}>
      {children}
    </Text>
  );
}

export default function StatsScreen() {
  const { t, number, money, date } = useI18n();
  const { colors } = useTheme();
  const { active } = useActiveVehicle();
  const fuel = useFuelEntries(active?.id);
  const expenses = useExpenses(active?.id);
  const now = useNow();
  const [range, setRange] = useState<RangeKey>('6m');
  const [selected, setSelected] = useState<string | null>(null);

  const groupColor: Record<SpendGroup, string> = {
    fuel: colors.amber,
    maintenance: colors.sage,
    insurance_tax: colors.ink,
    other: colors.muted,
  };
  const fuelColor: Record<EntryFuelType, string> = {
    petrol: colors.amber,
    diesel: colors.ink,
    lpg: colors.sage,
    electric: colors.rust,
  };

  const data = useMemo(() => {
    const earliest = Math.min(...fuel.map((e) => e.date), ...expenses.map((e) => e.date));
    const from = rangeStart(range, now, Number.isFinite(earliest) ? earliest : null);
    return {
      bars: monthlySpend(fuel, expenses, from, now),
      summary: summarizeRange(fuel, expenses, from, now),
      years: yearlyTotals(fuel, expenses),
      points: consumptionSeries(fuel, from, now),
    };
  }, [fuel, expenses, range, now]);

  if (!active || (fuel.length === 0 && expenses.length === 0)) {
    return (
      <Screen>
        <Text variant="title">{t('tab.stats')}</Text>
        <EmptyState text={t('stats.empty')} illustration={false} />
      </Screen>
    );
  }

  const { bars, summary, years, points } = data;
  const monthLabel = (year: number, month: number) => date(new Date(year, month, 1).getTime(), { month: 'short' });
  const picked = bars.find((b) => b.key === selected) ?? null;
  const headline = picked
    ? {
        label: date(new Date(picked.year, picked.month, 1).getTime(), { month: 'long', year: 'numeric' }),
        total: picked.total,
        groups: picked.groups,
      }
    : { label: t('stats.rangeTotal'), total: summary.total, groups: summary.byGroup };

  const series: Series[] = ENTRY_FUEL_TYPES.flatMap((f) => {
    const pts = points.filter((p) => p.fuelType === f);
    if (pts.length === 0) return [];
    const average = pts.reduce((s, p) => s + p.per100, 0) / pts.length;
    return [{ key: f, color: fuelColor[f], points: pts.map((p) => ({ x: p.date, y: p.per100 })), average }];
  });
  const maxCategory = summary.byCategory[0]?.amount ?? 0;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Text variant="title">{t('tab.stats')}</Text>
        <Text variant="caption" tone="muted">
          {active.name}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RANGES.map((r) => (
          <Chip
            key={r}
            label={t(`stats.range.${r}`)}
            selected={range === r}
            onPress={() => {
              setRange(r);
              setSelected(null);
            }}
          />
        ))}
      </View>

      {/* Masraf: toplam ya da seçilen ay, gruplar, aylık çubuklar */}
      <Animated.View entering={FadeInDown.duration(320)}>
        <Card style={{ padding: 16, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Text variant="label" tone="muted">
              {headline.label}
            </Text>
            <Text variant="figure">{money(headline.total, 0)}</Text>
            {!picked ? (
              <Text variant="caption" tone="muted">
                {t('stats.monthlyAverage', { value: money(summary.monthlyAverage, 0) })}
              </Text>
            ) : null}
          </View>
          <StackedBars
            selected={selected}
            onSelect={setSelected}
            bars={bars.map((b) => ({
              key: b.key,
              label: monthLabel(b.year, b.month),
              total: b.total,
              segments: SPEND_GROUPS.map((g) => ({ value: b.groups[g], color: groupColor[g] })),
            }))}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 }}>
            {SPEND_GROUPS.map((g) => (
              <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: groupColor[g] }} />
                <Text variant="caption" tone="muted">
                  {t(`stats.group.${g}`)}{' '}
                  <Text variant="caption" style={{ fontFamily: fonts.bodySemi }}>
                    {money(headline.groups[g], 0)}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </Animated.View>

      {/* Km ve km başına maliyet. Rakamda lineHeight şart: Saira'nın yüksek harfleri onsuz kırpılıp etikete biniyor. */}
      <Animated.View entering={FadeInDown.delay(60).duration(320)} style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 6 }}>
          <Text variant="label" tone="muted">
            {t('stats.costPerKm')}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: colors.ink }}>
            {summary.costPerKm !== null ? money(summary.costPerKm, 2) : '—'}
          </Text>
        </Card>
        <Card style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 6 }}>
          <Text variant="label" tone="muted">
            {t('stats.kmDriven')}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 30, color: colors.ink }}>
            {summary.km !== null ? `${number(summary.km)} ${t('common.km')}` : '—'}
          </Text>
        </Card>
      </Animated.View>
      {summary.costPerKm === null ? (
        <Text variant="caption" tone="muted" style={{ marginTop: -4, marginHorizontal: 4 }}>
          {t('stats.kmHint')}
        </Text>
      ) : null}

      {/* Türe göre */}
      {summary.byCategory.length > 0 ? (
        <>
          <SectionTitle>{t('stats.byCategory')}</SectionTitle>
          <Card style={{ padding: 16, gap: 12 }}>
            {summary.byCategory.map(({ category, amount }) => (
              <View key={category} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="bodyMedium" style={{ flexShrink: 1 }}>
                    {category === 'fuel' ? t('stats.group.fuel') : t(`expense.category.${category}`)}
                  </Text>
                  <Text variant="bodyMedium">{money(amount, 0)}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: 6,
                      width: `${(amount / maxCategory) * 100}%`,
                      borderRadius: 3,
                      backgroundColor: category === 'fuel' ? colors.amber : colors.sage,
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Tüketim */}
      <SectionTitle>{t('stats.consumption')}</SectionTitle>
      <Card style={{ padding: 16, gap: 12 }}>
        {series.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('summary.fuelWaiting')}
          </Text>
        ) : (
          <>
            <LineChart series={series} format={(y) => number(y, 1)} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 }}>
              {series.map((s) => (
                <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: s.color }} />
                  <Text variant="caption" tone="muted">
                    {t(`fuel.${s.key}`)} ·{' '}
                    {t('stats.averagePer100', {
                      value: number(s.average ?? 0, 1),
                      unit: s.key === 'electric' ? 'kWh' : 'L',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* Yıllık toplam */}
      <SectionTitle>{t('stats.yearly')}</SectionTitle>
      <Card style={{ overflow: 'hidden' }}>
        {years.map((y, i) => (
          <View
            key={y.year}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 14,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.line,
            }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 15, color: colors.ink }}>{y.year}</Text>
            <Text variant="bodyMedium">{money(y.total, 0)}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
