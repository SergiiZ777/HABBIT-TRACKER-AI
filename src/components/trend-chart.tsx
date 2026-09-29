import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrendPoint } from '@/lib/achievements';

const CHART_HEIGHT = 96;
const VALUE_ROW_HEIGHT = 16;
const GAP = 2;
const MAX_BAR_WIDTH = 24;
const MIN_BAR_WIDTH = 5;
// Week (7 bars) and year (12 monthly bars) both have room for an always-on label per bar.
// Month (28 daily bars) would collide, so it switches to a single tap-to-reveal readout instead
// (dataviz: never a number on every point).
const ALWAYS_LABELED_MAX_POINTS = 12;

type Props = { points: TrendPoint[] };

/**
 * A single-hue magnitude bar chart (one series: completion rate). Height encodes the value,
 * so bar color stays constant. For a small point count (week: 7 bars) every bar shows its own
 * percentage. For a larger count (month: 28 bars) labels would collide, so bars are tappable —
 * tapping one shows its date + percentage in a readout line above the chart.
 */
export function TrendChart({ points }: Props) {
  const theme = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const alwaysLabeled = points.length <= ALWAYS_LABELED_MAX_POINTS;
  const selected = points.find((p) => p.key === selectedKey) ?? null;

  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  const barWidth = containerWidth
    ? Math.min(MAX_BAR_WIDTH, Math.max(MIN_BAR_WIDTH, (containerWidth - (points.length - 1) * GAP) / points.length))
    : MAX_BAR_WIDTH;
  const cornerRadius = Math.min(4, Math.max(2, barWidth / 4));
  // Thin bars pack many x-axis labels too close together — thin those out to roughly weekly.
  const labelEvery = alwaysLabeled ? 1 : 4;

  return (
    <View>
      <Text style={[styles.readout, { color: theme.text, opacity: selected ? 1 : 0 }]}>
        {selected ? `${selected.fullLabel} · ${Math.round(selected.rate * 100)}%` : ' '}
      </Text>

      <View style={[styles.row, { gap: GAP }]} onLayout={onLayout}>
        {points.map((p, i) => {
          const isSelected = p.key === selectedKey;
          const showValue = alwaysLabeled || isSelected;
          const showAxisLabel = alwaysLabeled || i % labelEvery === 0 || i === points.length - 1;

          return (
            <Pressable
              key={p.key}
              onPress={() => setSelectedKey((k) => (k === p.key ? null : p.key))}
              style={[styles.column, { width: barWidth }]}>
              <Text style={[styles.value, { color: theme.textSecondary, opacity: showValue && p.total ? 1 : 0 }]}>
                {Math.round(p.rate * 100)}
              </Text>
              <View
                style={[
                  styles.track,
                  {
                    height: CHART_HEIGHT,
                    width: barWidth,
                    borderTopLeftRadius: cornerRadius,
                    borderTopRightRadius: cornerRadius,
                    backgroundColor: theme.backgroundSelected,
                    borderWidth: isSelected ? 1.5 : 0,
                    borderColor: theme.accent,
                  },
                ]}>
                <View
                  style={[
                    styles.fill,
                    {
                      height: `${Math.max(p.total ? p.rate * 100 : 0, p.total ? 4 : 0)}%`,
                      backgroundColor: theme.accent,
                      borderTopLeftRadius: cornerRadius,
                      borderTopRightRadius: cornerRadius,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.label, { color: theme.textSecondary, opacity: showAxisLabel ? 1 : 0 }]} numberOfLines={1}>
                {showAxisLabel ? p.label : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 12, fontWeight: '700', marginBottom: Spacing.one, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  column: { alignItems: 'center' },
  value: { fontSize: 9, fontWeight: '700', height: VALUE_ROW_HEIGHT },
  track: { overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { width: '100%' },
  label: { fontSize: 11, fontWeight: '600', marginTop: Spacing.one },
});
