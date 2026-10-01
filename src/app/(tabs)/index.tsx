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
import { dayKey, useHabits } from '@/lib/habits';
import { useLocaleTag, useT, type Dictionary } from '@/lib/i18n';

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

  const done = habits.filter((h) => h.completions.includes(selected)).length;
  const total = habits.length;
  const isToday = selected === today;
  const selectedDate = new Date(`${selected}T12:00:00`);

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
          </View>
          {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
        </View>

        <Text style={[styles.section, { color: theme.textSecondary }]}>{t.sectionHabits}</Text>

        <View style={styles.list}>
          {habits.map((h) => (
            <HabitCard key={h.id} habit={h} day={selected} />
          ))}
          {total === 0 && (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary, textAlign: 'center' }]}>
                {t.emptyNoHabits(t.fabNewHabit)}
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
