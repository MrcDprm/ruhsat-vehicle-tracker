import { NativeTabs } from 'expo-router/native-tabs';

import { useNotificationPermission, useNotificationsEnabled } from '@/features/reminders/notifications';
import { useUpcoming } from '@/features/reminders/useUpcoming';
import { useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { active } = useActiveVehicle();
  const { upcoming } = useUpcoming(active);
  const permission = useNotificationPermission();
  const enabled = useNotificationsEnabled();
  // Bildirim gelmeyecekse (izin reddedildi ya da Ayarlar'dan kapatıldı) gecikmiş ve yaklaşan hatırlatmalar sekmede
  // rozetle gösterilir.
  const urgent = upcoming.filter((u) => u.info.state === 'overdue' || u.info.state === 'soon').length;
  const badge = (permission === 'denied' || !enabled) && urgent > 0 ? String(urgent) : undefined;
  return (
    <NativeTabs tintColor={colors.amber} labelStyle={{ color: colors.muted }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tab.summary')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gauge.with.dots.needle.67percent" md="speed" />
        <NativeTabs.Trigger.Badge hidden={!badge}>{badge}</NativeTabs.Trigger.Badge>
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
