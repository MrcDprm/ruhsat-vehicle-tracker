import { NativeTabs } from 'expo-router/native-tabs';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <NativeTabs tintColor={colors.amber} labelStyle={{ color: colors.muted }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tab.summary')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gauge.with.dots.needle.67percent" md="speed" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>{t('tab.history')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>{t('tab.stats')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('tab.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
