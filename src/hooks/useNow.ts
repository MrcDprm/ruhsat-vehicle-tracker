import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ekranın kullandığı "şimdi". Sekme ekranları günlerce açık kalabilir; uygulama her öne geldiğinde yenilenir,
 * böylece "3 gün kaldı" ertesi gün açınca "2 gün" olur. Render sırasında Date.now() çağırmak yerine bu kullanılır.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);
  return now;
}
