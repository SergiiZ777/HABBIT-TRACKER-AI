import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  computeExperimentProgress,
  resolveExperiment,
  useExperiments,
} from '@/lib/habit-experiments';
import { formatTime, useHabits } from '@/lib/habits';
import { useLocaleTag, useT } from '@/lib/i18n';

/** Lists running habit experiments with progress, and keep/revert once the trial ends. */
export function HabitExperimentsSection() {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const running = useExperiments().filter((e) => e.status === 'running');

  if (running.length === 0) return null;

  return (
    <>
      <Text style={[styles.section, { color: theme.textSecondary }]}>🧪 {t.experimentsTitle}</Text>
      <View style={styles.list}>
        {running.map((exp) => {
          const habit = habits.find((h) => h.id === exp.habitId);
          if (!habit) return null;
          const p = computeExperimentProgress(exp, habit);
          const verdictText =
            p.verdict === 'better'
              ? t.experimentVerdictBetter(p.delta ?? 0)
              : p.verdict === 'worse'
                ? t.experimentVerdictWorse(p.delta ?? 0)
                : t.experimentVerdictSame;

          return (
            <View key={exp.id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.row}>
                <View style={[styles.badge, { backgroundColor: theme.accent + '22' }]}>
                  <Text style={[styles.badgeText, { color: theme.accent }]}>{t.experimentBadge(exp.durationDays)}</Text>
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>{t.experimentProgress(p.day, exp.durationDays)}</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {t.experimentMove(habit.emoji, habit.name, formatTime(exp.fromTime, localeTag), formatTime(exp.toTime, localeTag))}
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>{t.experimentGoal}</Text>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.fill, { backgroundColor: theme.accent, width: `${(p.day / exp.durationDays) * 100}%` }]} />
              </View>
              <Text style={[styles.meta, { color: theme.text }]}>{t.experimentRates(exp.baselineRate, p.currentRate)}</Text>

              {p.finished && (
                <>
                  <Text style={[styles.verdict, { color: theme.text }]}>{verdictText}</Text>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => resolveExperiment(exp.id, true, t)}
                      style={[styles.btn, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.btnText, { color: '#fff' }]}>{t.experimentKeep}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => resolveExperiment(exp.id, false, t)}
                      style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
                      <Text style={[styles.btnText, { color: theme.text }]}>{t.experimentRevert}</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {!p.finished && (
                <Pressable
                  onPress={() => resolveExperiment(exp.id, false, t)}
                  style={[styles.btn, { backgroundColor: theme.backgroundSelected, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.btnText, { color: theme.text }]}>{t.experimentRevert}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: -Spacing.two },
  list: { gap: Spacing.two },
  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  badgeText: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  verdict: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill },
  btnText: { fontSize: 13, fontWeight: '700' },
});
