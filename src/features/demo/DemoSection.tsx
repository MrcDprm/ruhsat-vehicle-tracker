import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Card } from '@/components/Card';
import { Row } from '@/components/SettingsRow';
import { Text } from '@/components/Text';
import { useI18n } from '@/i18n';

import { loadDemoData } from './load';

// Yalnız geliştirme derlemesinde görünür (Ayarlar'da __DEV__ ile); metinler bu yüzden çevrilmedi.
export function DemoSection() {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);

  const run = () =>
    Alert.alert(
      'Örnek veriler',
      'Telefondaki bütün kayıtlar silinip örnek defter yazılacak (uygulamanın diline göre).',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Doldur',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await loadDemoData(locale);
              router.navigate('/');
            } catch (e) {
              Alert.alert(
                'Yüklenemedi',
                e instanceof Error && e.message === 'signed in'
                  ? 'Önce hesaptan çık ("telefondan sil" seçeneğiyle).'
                  : String(e),
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <>
      <Text variant="section" tone="muted" style={{ marginTop: 8, marginLeft: 4 }}>
        Geliştirme
      </Text>
      <Card style={{ overflow: 'hidden' }}>
        <Row first icon="wand.and.stars" label="Örnek verilerle doldur" busy={busy} onPress={run} />
      </Card>
    </>
  );
}
