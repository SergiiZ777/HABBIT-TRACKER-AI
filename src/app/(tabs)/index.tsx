import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/components/confetti-burst';
import { HabitCard } from '@/components/habit-card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ProgressRing } from '@/components/progress-ring';
import { WeekStrip } from '@/components/week-strip';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, dayKey, isScheduledOn, streakMilestoneColor, toggleCompletion, useHabits, type Habit } from '@/lib/habits';
import { useLocaleTag, useT, type Dictionary } from '@/lib/i18n';
import { computeRecommendation, type Recommendation } from '@/lib/recommendation';

type RoutineGroup = 'morning' | 'evening' | 'anytime';
function routineGroup(habit: Habit): RoutineGroup {
  if (!habit.reminderTime) return 'anytime';
  const hour = parseInt(habit.reminderTime.split(':')[0], 10);
  return hour < 12 ? 'morning' : 'evening';
}

function greeting(t: Dictionary) {
  const h = new Date().getHours();
  if (h < 12) return t.greetingMorning;
  if (h < 18) return t.greetingAfternoon;
  return t.greetingEvening;
}

function encouragement(t: Dictionary, done: number, total: number) {
  if (total === 0) return t.encouragementEmpty;
  if (done === total) return t.encouragementAllDone;
  if (done === 0) return t.encouragementNoneDone;
  return t.encouragementRemaining(total - done);
}

export default function TodayScreen() {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const today = dayKey();
  const [selected, setSelected] = useState(today);
  const selectedDate = new Date(`${selected}T12:00:00`);

  const scheduledToday = habits.filter((h) => isScheduledOn(h, selectedDate));
  const done = scheduledToday.filter((h) => h.completions.includes(selected)).length;
  const total = scheduledToday.length;
  const isToday = selected === today;

  const topStreakHabit = scheduledToday.reduce<{ habit: Habit; streak: number } | null>(
    (best, h) => {
      const s = currentStreak(h);
      return s > 0 && (!best || s > best.streak) ? { habit: h, streak: s } : best;
    },
    null,
  );

  const habitGroups = (() => {
    const morning = scheduledToday.filter((h) => routineGroup(h) === 'morning');
    const evening = scheduledToday.filter((h) => routineGroup(h) === 'evening');
    const anytime = scheduledToday.filter((h) => routineGroup(h) === 'anytime');
    const groups = [
      { key: 'morning' as const, label: t.sectionMorning, habits: morning },
      { key: 'evening' as const, label: t.sectionEvening, habits: evening },
      { key: 'anytime' as const, label: t.sectionAnytime, habits: anytime },
    ].filter((g) => g.habits.length > 0);
    return groups.length > 1 ? groups : null;
  })();

  const recommendation = isToday ? computeRecommendation(scheduledToday, selected, new Date()) : null;

  const [showConfetti, setShowConfetti] = useState(false);
  const wasAllDoneToday = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isToday) return;
    const allDoneNow = total > 0 && done === total;
    if (wasAllDoneToday.current === null) {
      wasAllDoneToday.current = allDoneNow;
      return;
    }
    if (allDoneNow && !wasAllDoneToday.current) {
      setShowConfetti(true);
    }
    wasAllDoneToday.current = allDoneNow;
  }, [isToday, done, total]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
              {selectedDate.toLocaleDateString(localeTag, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>{isToday ? greeting(t) : t.lookingBack}</Text>
          </View>
          <LanguageSwitcher />
        </View>

        <WeekStrip habits={habits} selected={selected} onSelect={setSelected} />

        <View style={[styles.summary, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View>
            <ProgressRing
              size={84}
              stroke={10}
              progress={total ? done / total : 0}
              color={theme.accent}
              trackColor={theme.backgroundSelected}
            />
            <View style={styles.ringLabel}>
              <Text style={[styles.ringText, { color: theme.text }]}>
                {total ? Math.round((done / total) * 100) : 0}%
              </Text>
            </View>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>{t.doneOfTotal(done, total)}</Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{encouragement(t, done, total)}</Text>
            {topStreakHabit && (
              <Text style={[styles.topStreak, { color: streakMilestoneColor(topStreakHabit.streak) ?? theme.accent }]}>
                🔥 {t.topStreakValue(topStreakHabit.habit.emoji, topStreakHabit.habit.name, topStreakHabit.streak)}
              </Text>
            )}
          </View>
          {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
        </View>

        {recommendation && (
          <Pressable
            onPress={() => toggleCompletion(recommendation.habitId, selected)}
            style={[styles.recCard, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '33' }]}>
            <Text style={[styles.recTitle, { color: theme.accent }]}>✨ {t.recommendationTitle}</Text>
            <Text style={[styles.recBody, { color: theme.text }]}>
              {recommendation.reason === 'closeMilestone'
                ? t.recommendationCloseMilestone(recommendation.habitEmoji, recommendation.habitName, recommendation.detail)
                : recommendation.reason === 'longestStreak'
                  ? t.recommendationLongestStreak(recommendation.habitEmoji, recommendation.habitName, recommendation.detail)
                  : t.recommendationMostNeglected(recommendation.habitEmoji, recommendation.habitName, recommendation.detail)}
            </Text>
          </Pressable>
        )}

        {habitGroups ? (
          habitGroups.map((g) => (
            <View key={g.key}>
              <Text style={[styles.section, { color: theme.textSecondary }]}>{g.label}</Text>
              <View style={styles.list}>
                {g.habits.map((h) => (
                  <HabitCard key={h.id} habit={h} day={selected} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.sectionHabits}</Text>
            <View style={styles.list}>
              {scheduledToday.map((h) => (
                <HabitCard key={h.id} habit={h} day={selected} />
              ))}
            </View>
          </>
        )}

        <View style={styles.list}>
          {habits.length === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t.emptyNoHabits(t.fabNewHabit)}
              </Text>
            </View>
          )}
          {habits.length > 0 && total === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>🌤️</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t.noHabitsScheduledToday}
              </Text>
            </View>
          )}
        </View>

        {total > 0 && <Text style={[styles.hint, { color: theme.textSecondary }]}>{t.hintTapLongPress}</Text>}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/new-habit')}
          style={({ pressed }) => [styles.fab, { backgroundColor: theme.text }, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.fabText, { color: theme.background }]}>{t.fabNewHabit}</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: 140,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  eyebrow: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 18, fontWeight: '800' },
  summaryTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  summaryText: { fontSize: 15, lineHeight: 21 },
  topStreak: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  recCard: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, gap: 4 },
  recTitle: { fontSize: 13, fontWeight: '700' },
  recBody: { fontSize: 15, lineHeight: 21 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: -Spacing.two },
  list: { gap: Spacing.two + 2 },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
  },
  emptyEmoji: { fontSize: 36 },
  hint: { fontSize: 13, textAlign: 'center' },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: Spacing.three, alignItems: 'center' },
  fab: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabText: { fontSize: 16, fontWeight: '700' },
});
