import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { setActiveVehicleId, useActiveVehicle } from '@/features/vehicles/repository';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

// Araç seçici: alttan yarım (kaydırınca tam) açılır; başlık çubuğu yok, başlık içerikte.
// Başlık, liste ve "Yeni araç" tek kayan içerikte: araç sayısı ne olursa olsun hiçbir şey kesilmez.
// Dokununca araç seçilir ve sayfa kapanır, kalem simgesiyle düzenlenir.
export default function VehiclesSheet() {
  const { t, number } = useI18n();
  const { colors } = useTheme();
  const { vehicles, active } = useActiveVehicle();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: 28,
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 14,
      }}>
      <View style={{ gap: 2, paddingHorizontal: 4 }}>
        <Text variant="heading">{t('vehicles.title')}</Text>
        <Text variant="caption" tone="muted">
          {t('vehicles.hint')}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {vehicles.map((v) => {
          const selected = v.id === active?.id;
          const details = [v.make, v.model].filter(Boolean).join(' ');
          return (
            <Card
              key={v.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderColor: selected ? colors.amber : colors.line,
                borderWidth: selected ? 2 : 1,
              }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveVehicleId(v.id);
                  router.back();
                }}
                style={{ flex: 1, padding: 14, gap: 2 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {v.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {[details, v.plate, `${number(v.odometerKm)} ${t('common.km')}`].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('vehicle.editTitle')}: ${v.name}`}
                hitSlop={8}
                onPress={() =>
                  router.push({
                    pathname: '/vehicles/edit',
                    params: { id: v.id },
                  })
                }
                style={{
                  paddingHorizontal: 18,
                  alignSelf: 'stretch',
                  justifyContent: 'center',
                }}>
                <Text variant="heading" tone="muted">
                  ✎
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </View>
      <Button title={t('vehicles.add')} kind="secondary" onPress={() => router.push('/vehicles/edit')} />
    </ScrollView>
  );
}
