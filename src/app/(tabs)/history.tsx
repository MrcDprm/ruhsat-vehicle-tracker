import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useI18n } from '@/i18n';

export default function HistoryScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <Text variant="title">{t('tab.history')}</Text>
      <EmptyState text={t('history.empty')} illustration={false} />
    </Screen>
  );
}
