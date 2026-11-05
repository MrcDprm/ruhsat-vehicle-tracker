import { requestSync as requestNotificationSync } from '@/features/reminders/notifications';
import { requestWidgetSync } from '@/features/widget/sync';

import { requestCloudSync } from './engine';

/**
 * Telefondaki veri değişti (kayıt eklendi, düzenlendi, silindi): bildirim planı ve widget yeniden kurulur, hesap varsa buluta
 * eşitlenir. İkisi de kısa bir beklemeyle birleşir; art arda kayıtlar tek seferde işlenir.
 */
export function dataChanged(): void {
  requestNotificationSync();
  requestWidgetSync();
  requestCloudSync();
}
