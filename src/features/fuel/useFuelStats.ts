import { useMemo } from 'react';

import { summarize } from './consumption';
import { useFuelEntries } from './repository';

/** Aracın kayıtları ve tüketim özeti; kayıt değişince ikisi birlikte yenilenir. */
export function useFuelStats(vehicleId: string | null | undefined) {
  const entries = useFuelEntries(vehicleId);
  const stats = useMemo(() => summarize(entries), [entries]);
  return { entries, stats };
}
