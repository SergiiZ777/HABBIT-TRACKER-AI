import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrendPoint } from '@/lib/achievements';

const CHART_HEIGHT = 96;
const BAR_WIDTH = 24;

type Props = { points: TrendPoint[] };

/**
 * A single-hue magnitude bar chart (one series: completion rate). Height encodes the
 * value, so bar color stays constant — no legend needed for one series. No per-bar
 * numeric labels (a summary line above carries the aggregate number); each bar just
 * gets its day/date label beneath it.
 */
export function TrendChart({ points }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {points.map((p) => (
        <View key={p.key} style={styles.column}>
          <View style={[styles.track, { height: CHART_HEIGHT, backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.fill,
                {
                  height: `${Math.max(p.total ? p.rate * 100 : 0, p.total ? 4 : 0)}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  column: { alignItems: 'center', gap: Spacing.one },
  track: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  label: { fontSize: 12, fontWeight: '600' },
});
