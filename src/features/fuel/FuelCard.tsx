import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { ENTRY_FUEL_TYPES, type Vehicle } from '@/db/schema';
import { useI18n } from '@/i18n';
import { fonts } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { monthTotal } from './history';
import { useFuelStats } from './useFuelStats';

/** Özet ekranındaki yakıt kartı: son tüketim ve ortalama (yakıt türü başına), bu ayki harcama, km başına maliyet. */
export function FuelCard({ vehicle }: { vehicle: Vehicle }) {
  const { t, number, money } = useI18n();
  const { colors } = useTheme();
  const { entries, stats } = useFuelStats(vehicle.id);
  const fuels = ENTRY_FUEL_TYPES.filter((f) => stats.byFuel[f]?.last != null);

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/history')}>
      <Card style={{ padding: 16, gap: 14 }}>
        {fuels.length === 0 ? (
          <Text variant="caption" tone="muted">
            {entries.length === 0 ? t('summary.fuelEmpty') : t('summary.fuelWaiting')}
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {fuels.map((f) => {
              const s = stats.byFuel[f]!;
              const unit = f === 'electric' ? 'kWh' : 'L';
              return (
                <View key={f} style={{ gap: 2, minWidth: 120 }}>
                  <Text variant="label" tone="muted">
                    {t(`fuel.${f}`)} · {t('summary.lastFill')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text variant="figure">{number(s.last!, 1)}</Text>
                    <Text variant="caption" tone="muted">
                      {unit}/100 {t('common.km')}
                    </Text>
                  </View>
                  {s.average != null ? (
                    <Text variant="caption" tone="muted">
                      {t('summary.average', { value: number(s.average, 1) })}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 16 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" tone="muted">
              {t('summary.thisMonth')}
            </Text>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink }}>
              {money(monthTotal(entries), 0)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" tone="muted">
              {t('summary.costPerKm')}
            </Text>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink }}>
              {stats.costPerKm != null ? `${number(stats.costPerKm, 2)} ₺/${t('common.km')}` : '—'}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
