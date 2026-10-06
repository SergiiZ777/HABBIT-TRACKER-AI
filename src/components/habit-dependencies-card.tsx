import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HabitDependency } from '@/lib/habit-dependencies';
import { useT } from '@/lib/i18n';

export function HabitDependenciesCard({ dependencies }: { dependencies: HabitDependency[] }) {
  const theme = useTheme();
  const t = useT();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {dependencies.length === 0 ? (
        <Text style={[styles.text, { color: theme.textSecondary }]}>{t.dependenciesEmpty}</Text>
      ) : (
        dependencies.map((d) => (
          <View key={`${d.from.id}-${d.to.id}`} style={styles.item}>
            <View style={styles.chain}>
              <Text style={styles.emoji}>{d.from.emoji}</Text>
              <Text style={[styles.arrow, { color: theme.accent }]}>→</Text>
              <Text style={styles.emoji}>{d.to.emoji}</Text>
              <View style={[styles.lift, { backgroundColor: theme.accent + '22' }]}>
                <Text style={[styles.liftText, { color: theme.accent }]}>+{d.lift}%</Text>
              </View>
            </View>
            <Text style={[styles.text, { color: theme.text }]}>
              {t.dependencyInsight(`${d.from.emoji} ${d.from.name}`, `${d.to.emoji} ${d.to.name}`, d.withPct, d.withoutPct)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.three },
  item: { gap: 6 },
  chain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  emoji: { fontSize: 22 },
  arrow: { fontSize: 18, fontWeight: '800' },
  lift: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, marginLeft: 'auto' },
  liftText: { fontSize: 12, fontWeight: '800' },
  text: { fontSize: 14, lineHeight: 20 },
});
