import type { SymbolViewProps } from 'expo-symbols';

import type { ExpenseCategory, ServiceSubtype } from '@/db/schema';

// Masraf türlerinin SF Symbols simgeleri; formda ve geçmiş listesinde aynı simge kullanılır.
export const CATEGORY_ICONS: Record<ExpenseCategory, SymbolViewProps['name']> = {
  service: 'wrench.and.screwdriver.fill',
  inspection: 'checkmark.seal.fill',
  traffic_insurance: 'shield.lefthalf.filled',
  casco: 'shield.fill',
  road_tax: 'building.columns.fill',
  fine: 'exclamationmark.octagon.fill',
  parking_toll: 'road.lanes',
  wash: 'drop.fill',
  other: 'ellipsis.circle.fill',
};

export const SUBTYPE_ICONS: Record<ServiceSubtype, SymbolViewProps['name']> = {
  oil: 'drop.triangle.fill',
  filter: 'aqi.medium',
  tyre: 'circle.circle.fill',
  brake: 'exclamationmark.brakesignal',
  battery: 'minus.plus.batteryblock.fill',
  other: 'wrench.fill',
};
