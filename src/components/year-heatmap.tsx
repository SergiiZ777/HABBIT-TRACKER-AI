import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HeatmapCell, HeatmapColumn } from '@/lib/achievements';
import { useT } from '@/lib/i18n';

const CELL_SIZE = 11;
const CELL_GAP = 3;
const ROW_HEIGHT = CELL_SIZE + CELL_GAP;

type Props = { columns: HeatmapColumn[]; localeTag: string };

/** Sequential single-hue ramp on the theme accent — light -> dark encodes completion rate, same
 * accent used everywhere else in the app, so no separate categorical palette is introduced. */
function cellColor(theme: ReturnType<typeof useTheme>, cell: HeatmapCell): string {
  if (cell.inactive) return 'transparent';
  if (cell.total === 0) return theme.backgroundSelected;
  if (cell.rate === 0) return theme.accent + '1F';
  if (cell.rate <= 0.25) return theme.accent + '4D';
  if (cell.rate <= 0.5) return theme.accent + '80';
  if (cell.rate <= 0.75) return theme.accent + 'B3';
  return theme.accent;
}

const LEGEND_STEPS = [0, 0.1, 0.4, 0.6, 0.9];

export function YearHeatmap({ columns, localeTag }: Props) {
  const theme = useTheme();
  const t = useT();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  let selectedCell: HeatmapCell | null = null;
  outer: for (const col of columns) {
    for (const cell of col.cells) {
      if (cell.key === selectedKey) {
        selectedCell = cell;
        break outer;
      }
    }
  }

  const readout = selectedCell
    ? `${new Date(`${selectedCell.key}T12:00:00`).toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' })} · ${
        selectedCell.total ? `${Math.round(selectedCell.rate * 100)}%` : t.heatmapNoHabits
      }`
    : ' ';

  return (
    <View>
      <Text style={[styles.readout, { color: theme.text, opacity: selectedCell ? 1 : 0 }]}>{readout}</Text>

      <View style={styles.row}>
        <View style={styles.dayLabels}>
          {/* Jan 1 2024 was a Monday, so row i (0=Mon..6=Sun) maps directly to Jan (i+1), 2024. */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Text key={i} style={[styles.dayLabel, { color: theme.textSecondary, height: ROW_HEIGHT }]}>
              {i === 0 || i === 2 || i === 4 ? new Date(2024, 0, i + 1).toLocaleDateString(localeTag, { weekday: 'narrow' }) : ''}
            </Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View>
            <View style={styles.monthRow}>
              {columns.map((col, i) => (
                <View key={i} style={{ width: CELL_SIZE + CELL_GAP, position: 'relative' }}>
                  {col.monthLabel && (
                    <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>{col.monthLabel}</Text>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.grid}>
              {columns.map((col, ci) => (
                <View key={ci} style={styles.column}>
                  {col.cells.map((cell) => (
                    <Pressable
                      key={cell.key}
                      disabled={cell.inactive}
                      onPress={() => setSelectedKey((k) => (k === cell.key ? null : cell.key))}
                      style={[
                        styles.cell,
                        {
                          backgroundColor: cellColor(theme, cell),
                          borderWidth: cell.key === selectedKey ? 1.5 : 0,
                          borderColor: theme.text,
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t.heatmapLess}</Text>
        {LEGEND_STEPS.map((rate, i) => (
          <View
            key={i}
            style={[styles.legendSwatch, { backgroundColor: cellColor(theme, { key: '', rate, done: 0, total: 1, inactive: false }) }]}
          />
        ))}
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t.heatmapMore}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { fontSize: 12, fontWeight: '700', marginBottom: Spacing.one, textAlign: 'center' },
  row: { flexDirection: 'row' },
  scrollContent: { paddingRight: 30 },
  dayLabels: { marginRight: Spacing.one, marginTop: 18 },
  dayLabel: { fontSize: 9, fontWeight: '600', lineHeight: CELL_SIZE, textAlign: 'right', width: 12 },
  monthRow: { flexDirection: 'row', marginBottom: 4, height: 14 },
  monthLabel: { fontSize: 10, fontWeight: '600', position: 'absolute', left: 0, top: 0, width: 40 },
  grid: { flexDirection: 'row', gap: CELL_GAP },
  column: { gap: CELL_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: Spacing.two },
  legendText: { fontSize: 11, fontWeight: '600' },
  legendSwatch: { width: 10, height: 10, borderRadius: 2.5 },
});
