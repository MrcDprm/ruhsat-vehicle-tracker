import type { SymbolViewProps } from 'expo-symbols';

import type { Reminder, ReminderKind, ServiceSubtype } from '@/db/schema';
import { SUBTYPE_ICONS } from '@/features/expenses/categories';

// Hatırlatma adı ve simgesi; Özet'te, kurulumda ve bildirim metninde aynı ad kullanılır.
const KIND_ICONS: Record<Exclude<ReminderKind, 'service'>, SymbolViewProps['name']> = {
  inspection: 'checkmark.seal.fill',
  traffic_insurance: 'shield.lefthalf.filled',
  casco: 'shield.fill',
  road_tax: 'building.columns.fill',
  custom: 'bell.fill',
};

export function reminderIcon(r: Pick<Reminder, 'kind' | 'title'>): SymbolViewProps['name'] {
  if (r.kind === 'service') return SUBTYPE_ICONS[(r.title as ServiceSubtype) ?? 'other'] ?? SUBTYPE_ICONS.other;
  return KIND_ICONS[r.kind];
}

/** Çeviri anahtarı: "reminder.kind.inspection", bakımda "reminder.service.oil". Özel hatırlatmada başlığın kendisi. */
export function reminderTitle(r: Pick<Reminder, 'kind' | 'title'>, t: (key: string) => string): string {
  if (r.kind === 'service') return t(`reminder.service.${r.title ?? 'other'}`);
  if (r.kind === 'custom') return r.title ?? t('reminder.kind.custom');
  return t(`reminder.kind.${r.kind}`);
}
