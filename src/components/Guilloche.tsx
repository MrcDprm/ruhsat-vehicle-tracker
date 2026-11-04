import Svg, { Ellipse } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

// Ruhsat ve banknotlardaki ince giyoş deseni; belge kartının köşesinde süs.
export function Guilloche({ size = 220 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 220 160" pointerEvents="none">
      {Array.from({ length: 9 }, (_, i) => (
        <Ellipse
          key={i}
          cx={120}
          cy={80}
          rx={30 + i * 11}
          ry={18 + i * 7}
          fill="none"
          stroke={colors.guilloche}
          strokeWidth={1.2}
          transform={`rotate(${i * 9} 120 80)`}
        />
      ))}
    </Svg>
  );
}
