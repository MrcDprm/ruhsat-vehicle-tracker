import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useI18n } from '@/i18n';

export default function StatsScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <Text variant="title">{t('tab.stats')}</Text>
      <EmptyState text={t('stats.empty')} illustration={false} />
    </Screen>
  );
}
