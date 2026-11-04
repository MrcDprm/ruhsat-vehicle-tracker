import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from './Card';
import { Text } from './Text';

/** Başlıklı kart bölümü; sırayla (index) hafif gecikmeyle aşağıdan belirir. */
export function Section({ title, index = 0, children }: { title: string; index?: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(320)} style={{ gap: 8 }}>
      <Text variant="section" tone="muted" style={{ marginLeft: 4 }}>
        {title}
      </Text>
      <Card style={{ padding: 16, gap: 16 }}>{children}</Card>
    </Animated.View>
  );
}
