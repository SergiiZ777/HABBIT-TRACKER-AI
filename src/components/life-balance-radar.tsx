import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

import type { AreaBalance } from '@/lib/life-balance';
import { LIFE_AREA_EMOJI } from '@/lib/life-areas';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

type Props = {
  areas: AreaBalance[];
  size?: number;
};

const GRID_RINGS = [0.33, 0.66, 1];
const LABEL_OFFSET = 22;
const DOT_R = 4;

export function LifeBalanceRadar({ areas, size = 240 }: Props) {
  const theme = useTheme();
  const t = useT();

  if (areas.length < 3) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t.lifeBalanceNoData}</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 38;
  const n = areas.length;

  const angleFor = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;

  const pointAt = (i: number, pct: number) => {
    const a = angleFor(i);
    return { x: cx + maxR * (pct / 100) * Math.cos(a), y: cy + maxR * (pct / 100) * Math.sin(a) };
  };

  const dataPoints = areas.map((a, i) => pointAt(i, a.score));
  const polygonStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const trendArrow = (trend: 'up' | 'down' | 'flat') =>
    trend === 'up' ? ' ↑' : trend === 'down' ? ' ↓' : '';

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {GRID_RINGS.map((pct) => (
          <Circle
            key={pct}
            cx={cx}
            cy={cy}
            r={maxR * pct}
            stroke={theme.border}
            strokeWidth={1}
            fill="none"
            opacity={0.4}
          />
        ))}

        {/* Axis lines */}
        {areas.map((_, i) => {
          const end = pointAt(i, 100);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke={theme.border}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={polygonStr}
          fill={theme.accent + '25'}
          stroke={theme.accent}
          strokeWidth={2}
        />

        {/* Score dots */}
        {dataPoints.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={DOT_R} fill={theme.accent} />
        ))}

        {/* Labels */}
        {areas.map((a, i) => {
          const angle = angleFor(i);
          const lx = cx + (maxR + LABEL_OFFSET) * Math.cos(angle);
          const ly = cy + (maxR + LABEL_OFFSET) * Math.sin(angle);
          const emoji = LIFE_AREA_EMOJI[a.area];
          const label = `${emoji} ${a.score}%${trendArrow(a.trend)}`;
          const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
          return (
            <SvgText
              key={`label-${i}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              alignmentBaseline="central"
              fontSize={11}
              fill={theme.text}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  empty: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
