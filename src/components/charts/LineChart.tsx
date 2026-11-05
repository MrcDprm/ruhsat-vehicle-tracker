import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from '../Text';

export type Series = { key: string; color: string; points: { x: number; y: number }[]; average: number | null };

const HEIGHT = 140;
const PAD = { top: 10, bottom: 10, left: 4, right: 4 };

/**
 * Çizgi grafik (tüketim): x tarih, y 100 km'de litre. Her yakıt türü bir seri; kesikli çizgi o serinin ortalaması.
 * Genişlik ekrana göre ölçülür; y ekseni bütün serilerin en küçük ve en büyük değerine göre, biraz paylı.
 */
export function LineChart({ series, format }: { series: Series[]; format: (y: number) => string }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys) || 1;
  const minY = Math.min(...ys) - spanY * 0.2;
  const maxY = Math.max(...ys) + spanY * 0.2;

  const w = width - PAD.left - PAD.right;
  const h = HEIGHT - PAD.top - PAD.bottom;
  const px = (x: number) => PAD.left + (maxX === minX ? w / 2 : ((x - minX) / (maxX - minX)) * w);
  const py = (y: number) => PAD.top + h - ((y - minY) / (maxY - minY)) * h;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          {format(maxY)}
        </Text>
      </View>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={f}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={PAD.top + h * f}
              y2={PAD.top + h * f}
              stroke={colors.line}
              strokeWidth={1}
            />
          ))}
          {series.map((s) =>
            s.average !== null ? (
              <Line
                key={`${s.key}-avg`}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={py(s.average)}
                y2={py(s.average)}
                stroke={s.color}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
            ) : null,
          )}
          {series.map((s) =>
            s.points.length > 1 ? (
              <Polyline
                key={s.key}
                points={s.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null,
          )}
          {series.flatMap((s) =>
            s.points.map((p, i) => (
              <Circle
                key={`${s.key}-${i}`}
                cx={px(p.x)}
                cy={py(p.y)}
                r={i === s.points.length - 1 ? 4.5 : 3}
                fill={i === s.points.length - 1 ? s.color : colors.card}
                stroke={s.color}
                strokeWidth={2}
              />
            )),
          )}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      <Text variant="caption" tone="muted">
        {format(minY)}
      </Text>
    </View>
  );
}
