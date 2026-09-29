import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { computeBadges, computeStats } from '@/lib/achievements';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, currentStreak, dayKey, useHabits } from '@/lib/habits';

const RING_WINDOW_DAYS = 7;

function perfectDaysInLast(habits: ReturnType<typeof useHabits>, windowDays: number, today: Date): number {
  let count = 0;
  for (let i = 0; i < windowDays; i++) {
    const key = dayKey(addDays(today, -i));
    const existing = habits.filter((h) => dayKey(new Date(h.createdAt)) <= key);
    if (existing.length > 0 && existing.every((h) => h.completions.includes(key))) count++;
  }
  return count;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const habits = useHabits();
  const today = new Date();

  const stats = computeStats(habits, today);
  const badges = computeBadges(habits, today);
  const recentPerfectDays = perfectDaysInLast(habits, RING_WINDOW_DAYS, today);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const topHabits = [...habits].sort((a, b) => currentStreak(b, today) - currentStreak(a, today));

  const statTiles = [
    { emoji: '🔥', value: stats.bestStreak, label: 'Best streak' },
    { emoji: '✅', value: stats.totalCompletions, label: 'Completions' },
    { emoji: '🧩', value: stats.activeHabitsCount, label: 'Habits' },
    { emoji: '☀️', value: stats.perfectDaysCount, label: 'Perfect days' },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>YOUR PROGRESS</Text>
          <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
        </View>

        <View style={styles.statsGrid}>
          {statTiles.map((s) => (
            <View
              key={s.label}
              style={[styles.statTile, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.ringCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View>
            <ProgressRing
              size={72}
              stroke={9}
              progress={recentPerfectDays / RING_WINDOW_DAYS}
              color={theme.accent}
              trackColor={theme.backgroundSelected}
            />
            <View style={styles.ringLabel}>
              <Text style={[styles.ringText, { color: theme.text }]}>
                {recentPerfectDays}/{RING_WINDOW_DAYS}
              </Text>
            </View>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Perfect days this week</Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              Days you completed every habit, out of the last {RING_WINDOW_DAYS}.
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.textSecondary }]}>
          ACHIEVEMENTS · {unlockedCount}/{badges.length}
        </Text>

        <View style={styles.badgeGrid}>
          {badges.map((b) => (
            <View
              key={b.id}
              style={[
                styles.badge,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: b.unlocked ? theme.accent : theme.border,
                  opacity: b.unlocked ? 1 : 0.45,
                },
              ]}>
              <Text style={styles.badgeEmoji}>{b.emoji}</Text>
              <Text numberOfLines={1} style={[styles.badgeTitle, { color: theme.text }]}>
                {b.title}
              </Text>
              <Text numberOfLines={2} style={[styles.badgeDescription, { color: theme.textSecondary }]}>
                {b.description}
              </Text>
              {b.progress && !b.unlocked && (
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.accent,
                        width: `${Math.round((b.progress.current / b.progress.target) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {topHabits.length > 0 && (
          <>
            <Text style={[styles.section, { color: theme.textSecondary }]}>PER HABIT</Text>
            <View style={styles.list}>
              {topHabits.map((h) => {
                const streak = currentStreak(h, today);
                return (
                  <View
                    key={h.id}
                    style={[styles.habitRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <View style={[styles.habitEmojiWrap, { backgroundColor: h.color + '22' }]}>
                      <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.habitName, { color: theme.text }]}>
                      {h.name}
                    </Text>
                    <Text style={[styles.habitStreak, { color: theme.textSecondary }]}>
                      {streak > 0 ? `🔥 ${streak}` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {habits.length === 0 && (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary, textAlign: 'center' }]}>
              Add a habit on the Today tab to start unlocking achievements.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: 100,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  eyebrow: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  statEmoji: { fontSize: 20, marginBottom: 2 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 13 },
  ringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 14, fontWeight: '800' },
  summaryTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  summaryText: { fontSize: 14, lineHeight: 20 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: -Spacing.two },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 3,
  },
  badgeEmoji: { fontSize: 22 },
  badgeTitle: { fontSize: 14, fontWeight: '700' },
  badgeDescription: { fontSize: 12, lineHeight: 16 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  list: { gap: Spacing.two },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  habitEmojiWrap: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  habitName: { flex: 1, fontSize: 15, fontWeight: '600' },
  habitStreak: { fontSize: 14, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
  },
  emptyEmoji: { fontSize: 36 },
});
