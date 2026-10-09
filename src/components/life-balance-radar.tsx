import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

import type { AreaBalance } from '@/lib/life-balance';
import { LIFE_AREA_EMOJI, type LifeArea } from '@/lib/life-areas';
import { areaLabel } from '@/lib/life-areas';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import { Radius } from '@/constants/theme';

type Props = {
  areas: AreaBalance[];
  size?: number;
};

const AREA_COLORS: Record<LifeArea, string> = {
  health: '#22c55e',
  learning: '#3b82f6',
  productivity: '#f59e0b',
  relationships: '#ec4899',
  mind: '#8b5cf6',
  finance: '#14b8a6',
};

const GRID_RINGS = [25, 50, 75, 100];
const DOT_R = 5;

export function LifeBalanceRadar({ areas, size = 280 }: Props) {
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
  const maxR = size / 2 - 52;
  const n = areas.length;

  const angleFor = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;

  const pointAt = (i: number, pct: number) => {
    const a = angleFor(i);
    return { x: cx + maxR * (pct / 100) * Math.cos(a), y: cy + maxR * (pct / 100) * Math.sin(a) };
  };

  const sectorPath = (i: number, pct: number) => {
    const a1 = angleFor(i) - Math.PI / n;
    const a2 = angleFor(i) + Math.PI / n;
    const r = maxR * (pct / 100);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const dataPoints = areas.map((a, i) => pointAt(i, a.score));
  const polygonPath = dataPoints.reduce((d, p, i) => d + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), '') + ' Z';

  const trendArrow = (trend: 'up' | 'down' | 'flat') =>
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Colored sector fills */}
        {areas.map((a, i) => (
          <Path
            key={`sector-${i}`}
            d={sectorPath(i, a.score)}
            fill={AREA_COLORS[a.area] + '30'}
            stroke="none"
          />
        ))}

        {/* Grid rings */}
        {GRID_RINGS.map((pct) => (
          <Circle
            key={pct}
            cx={cx}
            cy={cy}
            r={maxR * (pct / 100)}
            stroke={theme.border}
            strokeWidth={pct === 50 ? 1 : 0.5}
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
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Data polygon */}
        <Path
          d={polygonPath}
          fill={theme.accent + '18'}
          stroke={theme.accent}
          strokeWidth={2}
        />

        {/* Score dots with area colors */}
        {dataPoints.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={DOT_R}
            fill={AREA_COLORS[areas[i].area]}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* Labels: emoji + name + score */}
        {areas.map((a, i) => {
          const angle = angleFor(i);
          const labelR = maxR + 36;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const name = areaLabel(t, a.area);
          const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
          return (
            <SvgText
              key={`label-${i}`}
              x={lx}
              y={ly - 2}
              textAnchor={anchor}
              alignmentBaseline="central"
              fontSize={11}
              fontWeight="600"
              fill={AREA_COLORS[a.area]}
            >
              {`${LIFE_AREA_EMOJI[a.area]} ${name}`}
            </SvgText>
          );
        })}
        {areas.map((a, i) => {
          const angle = angleFor(i);
          const labelR = maxR + 36;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const arrow = trendArrow(a.trend);
          const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
          return (
            <SvgText
              key={`score-${i}`}
              x={lx}
              y={ly + 12}
              textAnchor={anchor}
              alignmentBaseline="central"
              fontSize={12}
              fontWeight="800"
              fill={theme.text}
            >
              {`${a.score}% ${arrow}`}
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
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
