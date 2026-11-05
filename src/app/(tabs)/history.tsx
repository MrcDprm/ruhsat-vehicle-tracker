import { router } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';

export default function HistoryScreen() {
  const { t } = useI18n();
  const { active } = useActiveVehicle();
  return (
    <Screen
      footer={
        active ? (
          <Fab icon="fuelpump.fill" label={t('fuel.newTitle')} onPress={() => router.push('/fuel/edit')} />
        ) : null
      }>
      <Text variant="title">{t('tab.history')}</Text>
      <EmptyState text={t('history.empty')} illustration={false} />
    </Screen>
  );
}
