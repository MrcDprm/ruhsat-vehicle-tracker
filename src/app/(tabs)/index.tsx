import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Guilloche } from '@/components/Guilloche';
import { Odometer } from '@/components/Odometer';
import { Plate } from '@/components/Plate';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { FuelCard } from '@/features/fuel/FuelCard';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';

export default function SummaryScreen() {
  const { t, number } = useI18n();
  const { vehicles, active } = useActiveVehicle();

  if (!active) {
    return (
      <Screen>
        <EmptyState
          title={t('empty.title')}
          text={t('empty.text')}
          action={t('empty.action')}
          onAction={() => router.push('/vehicles/edit')}
        />
      </Screen>
    );
  }

  const details = [active.make, active.model, active.year].filter(Boolean).join(' ');
  const subtitle = [t('summary.vehicleCount', { count: vehicles.length }), details].filter(Boolean).join(' · ');

  return (
    <Screen footer={<Fab icon="fuelpump.fill" label={t('fuel.newTitle')} onPress={() => router.push('/fuel/edit')} />}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('vehicles.title')}
        onPress={() => router.push('/vehicles')}
        style={{ paddingVertical: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
            {active.name}
          </Text>
          <Text variant="heading" tone="muted">
            ▾
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {subtitle}
        </Text>
      </Pressable>

      <Animated.View entering={FadeInDown.duration(360)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('vehicle.editTitle')}
          onPress={() => router.push({ pathname: '/vehicles/edit', params: { id: active.id } })}>
          <Card style={{ padding: 18, gap: 12, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -40, top: -30 }}>
              <Guilloche />
            </View>
            <Text variant="label" tone="muted">
              {t('summary.registration')}
            </Text>
            {active.plate ? <Plate plate={active.plate} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Odometer km={active.odometerKm} label={`${number(active.odometerKm)} ${t('common.km')}`} />
              <Text tone="muted">{t('common.km')}</Text>
            </View>
          </Card>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(360)} style={{ gap: 12 }}>
        <Text variant="section" tone="muted" style={{ marginTop: 8 }}>
          {t('summary.fuel')}
        </Text>
        <FuelCard vehicle={active} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(360)} style={{ gap: 12 }}>
        <Text variant="section" tone="muted" style={{ marginTop: 8 }}>
          {t('summary.upcoming')}
        </Text>
        <Card style={{ padding: 16 }}>
          <Text variant="caption" tone="muted">
            {t('summary.upcomingEmpty')}
          </Text>
        </Card>
      </Animated.View>
    </Screen>
  );
}
