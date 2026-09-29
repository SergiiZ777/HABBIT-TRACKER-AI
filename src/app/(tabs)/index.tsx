import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HabitCard } from '@/components/habit-card';
import { ProgressRing } from '@/components/progress-ring';
import { WeekStrip } from '@/components/week-strip';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayKey, useHabits } from '@/lib/habits';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function encouragement(done: number, total: number) {
  if (total === 0) return 'Add your first habit to get going.';
  if (done === total) return 'Everything done. Great work! 🎉';
  if (done === 0) return 'Small steps count. Pick one to start.';
  return `${total - done} to go. Keep it up!`;
}

export default function TodayScreen() {
  const theme = useTheme();
  const habits = useHabits();
  const today = dayKey();
  const [selected, setSelected] = useState(today);

  const done = habits.filter((h) => h.completions.includes(selected)).length;
  const total = habits.length;
  const isToday = selected === today;
  const selectedDate = new Date(`${selected}T12:00:00`);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
              {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>{isToday ? greeting() : 'Looking back'}</Text>
          </View>
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
            <Text style={[styles.summaryTitle, { color: theme.text }]}>
              {done} of {total} done
            </Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{encouragement(done, total)}</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.textSecondary }]}>HABITS</Text>

        <View style={styles.list}>
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} day={selected} />
          ))}
          {total === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary, textAlign: 'center' }]}>
                No habits yet. Tap “New habit” below to create one.
              </Text>
            </View>
          )}
        </View>

        {total > 0 && (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap to check off · Long-press for more</Text>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push('/new-habit')}
          style={({ pressed }) => [styles.fab, { backgroundColor: theme.text }, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.fabText, { color: theme.background }]}>＋ New habit</Text>
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
  header: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 18, fontWeight: '800' },
  summaryTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  summaryText: { fontSize: 15, lineHeight: 21 },
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
