import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LIFE_AREA_EMOJI, type LifeArea } from '@/lib/life-areas';
import type { BalanceSnapshot, BalanceTrendRange } from '@/lib/life-balance-history';
import { useT } from '@/lib/i18n';

const AREA_COLORS: Record<LifeArea, string> = {
  health: '#22c55e',
  learning: '#3b82f6',
  productivity: '#f59e0b',
  relationships: '#ec4899',
  mind: '#8b5cf6',
  finance: '#14b8a6',
};

const CHART_HEIGHT = 160;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;

type Props = {
  snapshots: BalanceSnapshot[];
  range: BalanceTrendRange;
  onRangeChange: (r: BalanceTrendRange) => void;
};

export function LifeBalanceTrend({ snapshots, range, onRangeChange }: Props) {
  const theme = useTheme();
  const t = useT();
  const [width, setWidth] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const allAreas = new Set<LifeArea>();
  for (const s of snapshots) for (const a of s.areas) allAreas.add(a.area);
  const areas = [...allAreas];

  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) =>
    PAD_LEFT + (snapshots.length > 1 ? (i / (snapshots.length - 1)) * plotW : plotW / 2);
  const yFor = (score: number) => PAD_TOP + plotH - (score / 100) * plotH;

  const buildPath = (scores: number[]) => {
    if (scores.length === 0) return '';
    let d = `M ${xFor(0)} ${yFor(scores[0])}`;
    for (let i = 1; i < scores.length; i++) {
      d += ` L ${xFor(i)} ${yFor(scores[i])}`;
    }
    return d;
  };

  const overallScores = snapshots.map((s) => s.overallScore);
  const overallPath = buildPath(overallScores);

  const areaLines = areas.map((area) => {
    const scores = snapshots.map((s) => {
      const found = s.areas.find((a) => a.area === area);
      return found ? found.score : 0;
    });
    return { area, scores, path: buildPath(scores) };
  });

  const labelEvery = snapshots.length <= 6 ? 1 : snapshots.length <= 13 ? 2 : 3;

  const ranges: BalanceTrendRange[] = ['monthly', 'quarterly', 'yearly'];

  const selected = selectedIdx !== null ? snapshots[selectedIdx] : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{t.lifeBalanceTrendsTitle}</Text>
        <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
          {ranges.map((r) => (
            <Pressable
              key={r}
              onPress={() => { onRangeChange(r); setSelectedIdx(null); }}
              style={[styles.segment, range === r && { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.segmentText, { color: range === r ? theme.text : theme.textSecondary }]}>
                {r === 'monthly' ? t.balanceTrendMonthly : r === 'quarterly' ? t.balanceTrendQuarterly : t.balanceTrendYearly}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selected && (
        <View style={[styles.tooltip, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.tooltipTitle, { color: theme.text }]}>
            {selected.label} · {t.balanceTrendOverall}: {selected.overallScore}%
          </Text>
          <View style={styles.tooltipAreas}>
            {selected.areas.map((a) => (
              <Text key={a.area} style={[styles.tooltipArea, { color: AREA_COLORS[a.area] }]}>
                {LIFE_AREA_EMOJI[a.area]} {a.score}%
              </Text>
            ))}
          </View>
        </View>
      )}

      <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((v) => (
              <Line
                key={v}
                x1={PAD_LEFT}
                y1={yFor(v)}
                x2={width - PAD_RIGHT}
                y2={yFor(v)}
                stroke={theme.border}
                strokeWidth={0.5}
                opacity={0.6}
              />
            ))}

            {/* Y-axis labels */}
            {[0, 50, 100].map((v) => (
              <SvgText
                key={`y-${v}`}
                x={PAD_LEFT - 6}
                y={yFor(v) + 4}
                textAnchor="end"
                fontSize={10}
                fill={theme.textSecondary}
                opacity={0.7}
              >
                {v}
              </SvgText>
            ))}

            {/* Area lines */}
            {areaLines.map(({ area, path }) => (
              <Path
                key={area}
                d={path}
                fill="none"
                stroke={AREA_COLORS[area]}
                strokeWidth={1.5}
                opacity={0.5}
              />
            ))}

            {/* Overall line (thicker) */}
            <Path
              d={overallPath}
              fill="none"
              stroke={theme.accent}
              strokeWidth={2.5}
            />

            {/* Overall dots */}
            {overallScores.map((score, i) => (
              <Circle
                key={`dot-${i}`}
                cx={xFor(i)}
                cy={yFor(score)}
                r={3}
                fill={theme.accent}
              />
            ))}

            {/* Tap targets */}
            {snapshots.map((_, i) => (
              <Rect
                key={`tap-${i}`}
                x={xFor(i) - 16}
                y={0}
                width={32}
                height={CHART_HEIGHT}
                fill="transparent"
                onPress={() => setSelectedIdx((prev) => (prev === i ? null : i))}
              />
            ))}

            {/* Selected indicator */}
            {selectedIdx !== null && (
              <Line
                x1={xFor(selectedIdx)}
                y1={PAD_TOP}
                x2={xFor(selectedIdx)}
                y2={CHART_HEIGHT - PAD_BOTTOM}
                stroke={theme.accent}
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.6}
              />
            )}

            {/* X-axis labels */}
            {snapshots.map((s, i) => {
              if (i % labelEvery !== 0 && i !== snapshots.length - 1) return null;
              return (
                <SvgText
                  key={`x-${i}`}
                  x={xFor(i)}
                  y={CHART_HEIGHT - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill={theme.textSecondary}
                >
                  {s.label}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.accent }]} />
          <Text style={[styles.legendText, { color: theme.text }]}>{t.balanceTrendOverall}</Text>
        </View>
        {areas.map((area) => (
          <View key={area} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: AREA_COLORS[area] }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              {LIFE_AREA_EMOJI[area]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  segmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  segment: { paddingHorizontal: Spacing.two, paddingVertical: 5, borderRadius: Radius.pill },
  segmentText: { fontSize: 11, fontWeight: '700' },
  tooltip: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
  tooltipTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tooltipAreas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tooltipArea: { fontSize: 12, fontWeight: '600' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600' },
});
