import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

import { Button } from './Button';
import { Text } from './Text';

// Boş ekran çizimi: ruhsat kartı, plaka, kilometre sayacı ve ibreli gösterge.
function Illustration() {
  const { colors } = useTheme();
  return (
    <Svg width={180} height={130} viewBox="0 0 180 130" accessibilityElementsHidden>
      <Rect x={10} y={16} width={130} height={86} rx={12} fill={colors.card} stroke={colors.line} strokeWidth={1.5} />
      <Rect x={24} y={30} width={56} height={6} rx={3} fill={colors.line} />
      <Rect x={24} y={46} width={70} height={18} rx={3} fill="none" stroke={colors.ink} strokeWidth={1.5} />
      <Rect x={24} y={46} width={10} height={18} rx={2} fill={colors.ink} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={24 + i * 13} y={74} width={11} height={16} rx={2} fill={i === 4 ? colors.amber : colors.ink} />
      ))}
      <Circle cx={138} cy={92} r={30} fill={colors.background} stroke={colors.ink} strokeWidth={2} />
      <Path d="M116 100 A24 24 0 1 1 160 100" fill="none" stroke={colors.line} strokeWidth={4} strokeLinecap="round" />
      <Path d="M116 100 A24 24 0 0 1 128 72" fill="none" stroke={colors.amber} strokeWidth={4} strokeLinecap="round" />
      <Line x1={138} y1={92} x2={152} y2={76} stroke={colors.rust} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={138} cy={92} r={4} fill={colors.ink} />
    </Svg>
  );
}

export function EmptyState({
  title,
  text,
  action,
  onAction,
  illustration = true,
}: {
  title?: string;
  text: string;
  action?: string;
  onAction?: () => void;
  illustration?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16, gap: 12 }}>
      {illustration ? <Illustration /> : null}
      {title ? <Text variant="heading">{title}</Text> : null}
      <Text tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </Text>
      {action && onAction ? (
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <Button title={action} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
