import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { TrendChart } from '@/components/trend-chart';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/lib/habits';
import { useLocale, useT } from '@/lib/i18n';
import { badgeTitle } from '@/lib/achievements';
import {
  computeYearlyReview,
  fetchAiYearlyReview,
  type AiYearlyReview,
  type HabitEvolution,
  type BehavioralImprovement,
} from '@/lib/yearly-review';

const ENERGY_EMOJIS = ['', '😴', '😐', '🙂', '😊', '⚡'];
const MOOD_EMOJIS = ['', '😢', '😕', '😐', '🙂', '😄'];
const TREND_COLORS = { improving: '#22c55e', declining: '#f59e0b', steady: '#94a3b8' } as const;

function MiniSparkline({ rates, accent }: { rates: { rate: number }[]; accent: string }) {
  return (
    <View style={sparkStyles.row}>
      {rates.map((r, i) => (
        <View
          key={i}
          style={[
            sparkStyles.bar,
            { height: Math.max(3, (r.rate / 100) * 24), backgroundColor: accent + (r.rate > 0 ? 'CC' : '33') },
          ]}
        />
      ))}
    </View>
  );
}

const sparkStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24 },
  bar: { width: 4, borderRadius: 2, minHeight: 3 },
});

export default function YearlyReviewScreen() {
  const theme = useTheme();
  const t = useT();
  const habits = useHabits();
  const locale = useLocale();
  const today = new Date();

  // eslint-disable-next-line react-hooks/exhaustive-deps -- today is stable within a single render
  const review = useMemo(() => computeYearlyReview(habits, today), [habits]);
  const [aiReview, setAiReview] = useState<AiYearlyReview | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAiYearlyReview(review, locale).then((result) => {
      if (!cancelled) {
        setAiReview(result);
        setAiLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const moodEnergyEmoji = review.moodAvg ? ENERGY_EMOJIS[Math.round(review.moodAvg.energy)] ?? '😐' : null;
  const moodMoodEmoji = review.moodAvg ? MOOD_EMOJIS[Math.round(review.moodAvg.mood)] ?? '😐' : null;
  const showBeforeAfter = review.beforeAfter.before.label !== review.beforeAfter.after.label;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: theme.accent }]}>←</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.text }]}>{t.yearlyReviewTitle}</Text>
            <Text style={[styles.dateRange, { color: theme.textSecondary }]}>{t.yearlyReviewYear(review.year)}</Text>
          </View>
        </View>

        {/* Chapter 1: The Big Picture */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.overviewRow}>
            <View>
              <ProgressRing
                size={100}
                stroke={12}
                progress={review.consistencyScore / 100}
                color={theme.accent}
                trackColor={theme.backgroundSelected}
              />
              <View style={styles.ringLabel}>
                <Text style={[styles.ringTextLarge, { color: theme.text }]}>{review.consistencyScore}</Text>
              </View>
            </View>
            <View style={[styles.flex, { gap: 6 }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t.yearlyConsistencyScore}</Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>
                {t.yearlyTotalCompletions}: {review.totalCompletions}
              </Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>
                {t.yearlyPerfectDays(review.perfectDays)}
              </Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>
                {t.yearlyActiveDays(review.activeDays, review.totalDaysInYear)}
              </Text>
            </View>
          </View>
        </View>

        {/* Chapter 2: Before & After */}
        {showBeforeAfter && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.yearlyBeforeAfterTitle}</Text>
            <View style={styles.beforeAfterRow}>
              <View style={styles.beforeAfterCol}>
                <Text style={[styles.baLabel, { color: theme.textSecondary }]}>{t.yearlyBeforeLabel}</Text>
                <Text style={[styles.baMonth, { color: theme.text }]}>{review.beforeAfter.before.label}</Text>
                <Text style={[styles.baRate, { color: '#f59e0b' }]}>
                  {t.yearlyCompletionRate(review.beforeAfter.before.completionRate)}
                </Text>
                <Text style={[styles.subText, { color: theme.textSecondary }]}>
                  {t.yearlyPerfectDays(review.beforeAfter.before.perfectDays)}
                </Text>
              </View>
              <Text style={[styles.baArrow, { color: theme.accent }]}>→</Text>
              <View style={styles.beforeAfterCol}>
                <Text style={[styles.baLabel, { color: theme.textSecondary }]}>{t.yearlyAfterLabel}</Text>
                <Text style={[styles.baMonth, { color: theme.text }]}>{review.beforeAfter.after.label}</Text>
                <Text style={[styles.baRate, { color: '#22c55e' }]}>
                  {t.yearlyCompletionRate(review.beforeAfter.after.completionRate)}
                </Text>
                <Text style={[styles.subText, { color: theme.textSecondary }]}>
                  {t.yearlyPerfectDays(review.beforeAfter.after.perfectDays)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Chapter 3: Monthly Trends */}
        {review.monthlyTrends.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.yearlyMonthlyTrendsTitle}</Text>
            <TrendChart points={review.monthlyTrends} />
            <View style={styles.monthCallouts}>
              {review.bestMonth && (
                <Text style={[styles.subText, { color: '#22c55e' }]}>
                  {t.yearlyBestMonth(review.bestMonth.label, review.bestMonth.rate)}
                </Text>
              )}
              {review.worstMonth && (
                <Text style={[styles.subText, { color: '#f59e0b' }]}>
                  {t.yearlyWorstMonth(review.worstMonth.label, review.worstMonth.rate)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Chapter 4: Longest Streak */}
        {review.longestStreak.days > 0 && (
          <View style={[styles.card, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '33' }]}>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.yearlyLongestStreakTitle}</Text>
            <Text style={[styles.streakNumber, { color: theme.accent }]}>🔥 {review.longestStreak.days}</Text>
            <Text style={[styles.subText, { color: theme.text }]}>
              {t.yearlyLongestStreakValue(
                review.longestStreak.habit.emoji,
                review.longestStreak.habit.name,
                review.longestStreak.days,
              )}
            </Text>
          </View>
        )}

        {/* Chapter 5: Habit Evolution */}
        {review.habitEvolutions.length > 0 && (
          <View>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.yearlyHabitEvolutionTitle}</Text>
            <View style={styles.list}>
              {review.habitEvolutions.map((evo) => (
                <EvolutionRow key={evo.habit.id} evo={evo} theme={theme} accent={theme.accent} t={t} />
              ))}
            </View>
          </View>
        )}

        {/* Chapter 6: Biggest Improvements */}
        <View>
          <Text style={[styles.section, { color: theme.textSecondary }]}>{t.yearlyBiggestImprovementsTitle}</Text>
          {review.biggestImprovements.length > 0 ? (
            <View style={styles.list}>
              {review.biggestImprovements.map((imp) => (
                <ImprovementRow key={imp.habit.id} imp={imp} theme={theme} t={t} />
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>{t.yearlyNoImprovements}</Text>
          )}
        </View>

        {/* Chapter 7: Goals Achieved */}
        <View>
          <Text style={[styles.section, { color: theme.textSecondary }]}>{t.yearlyGoalsAchievedTitle}</Text>
          {review.goalsAchieved.length > 0 ? (
            <View style={styles.badgeGrid}>
              {review.goalsAchieved.map((g) => (
                <View key={g.badgeId} style={[styles.badgeChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                  <Text numberOfLines={1} style={[styles.badgeText, { color: theme.text }]}>{badgeTitle(t, g.badgeId)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>{t.yearlyNoGoals}</Text>
          )}
        </View>

        {/* Chapter 8: Mood */}
        {review.moodAvg && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.yearlyMoodAvgTitle}</Text>
            <View style={styles.moodRow}>
              <Text style={styles.moodEmoji}>{moodEnergyEmoji}</Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{review.moodAvg.energy.toFixed(1)}</Text>
              <Text style={[styles.moodSep, { color: theme.border }]}>·</Text>
              <Text style={styles.moodEmoji}>{moodMoodEmoji}</Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{review.moodAvg.mood.toFixed(1)}</Text>
            </View>
          </View>
        )}

        {/* Chapter 9: AI Year in Review */}
        <View style={[styles.card, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '33' }]}>
          <Text style={[styles.cardTitle, { color: theme.accent }]}>✨ {t.yearlyAiTitle}</Text>
          {aiLoading ? (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{t.yearlyAiLoading}</Text>
            </View>
          ) : aiReview ? (
            <View style={{ gap: Spacing.three }}>
              <View>
                <Text style={[styles.aiLabel, { color: theme.accent }]}>{t.yearlyAiStory}</Text>
                <Text style={[styles.subText, { color: theme.text }]}>{aiReview.yearStory}</Text>
              </View>
              {aiReview.proudOf ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#22c55e' }]}>{t.yearlyAiProud}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.proudOf}</Text>
                </View>
              ) : null}
              {aiReview.transformation ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#f59e0b' }]}>{t.yearlyAiTransformation}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.transformation}</Text>
                </View>
              ) : null}
              {aiReview.nextYear ? (
                <View>
                  <Text style={[styles.aiLabel, { color: theme.accent }]}>{t.yearlyAiNextYear}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.nextYear}</Text>
                </View>
              ) : null}
              {aiReview.closing ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#22c55e' }]}>{t.yearlyAiClosing}</Text>
                  <Text style={[styles.subText, { color: theme.text, fontStyle: 'italic' }]}>{aiReview.closing}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.subText, { color: theme.textSecondary }]}>{t.yearlyAiError}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Inline sub-components ----------

function EvolutionRow({
  evo,
  theme,
  accent,
  t,
}: {
  evo: HabitEvolution;
  theme: ReturnType<typeof useTheme>;
  accent: string;
  t: ReturnType<typeof useT>;
}) {
  const trendLabel =
    evo.trend === 'improving' ? t.yearlyTrendImproving
    : evo.trend === 'declining' ? t.yearlyTrendDeclining
    : t.yearlyTrendSteady;
  const trendColor = TREND_COLORS[evo.trend];

  return (
    <View style={[styles.evoRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.evoTop}>
        <Text style={{ fontSize: 20 }}>{evo.habit.emoji}</Text>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.evoName, { color: theme.text }]}>{evo.habit.name}</Text>
          <View style={styles.evoMeta}>
            <Text style={[styles.evoRate, { color: theme.text }]}>{evo.yearRate}%</Text>
            <Text style={[styles.evoStat, { color: theme.textSecondary }]}>🔥 {evo.bestStreakInYear}</Text>
            <View style={[styles.trendBadge, { backgroundColor: trendColor + '22' }]}>
              <Text style={[styles.trendBadgeText, { color: trendColor }]}>{trendLabel}</Text>
            </View>
          </View>
        </View>
      </View>
      {evo.monthlyRates.length > 1 && <MiniSparkline rates={evo.monthlyRates} accent={accent} />}
    </View>
  );
}

function ImprovementRow({
  imp,
  theme,
  t,
}: {
  imp: BehavioralImprovement;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useT>;
}) {
  return (
    <View style={[styles.impRow, { backgroundColor: '#22c55e12', borderColor: '#22c55e33' }]}>
      <Text style={{ fontSize: 20 }}>{imp.habit.emoji}</Text>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.evoName, { color: theme.text }]}>{imp.habit.name}</Text>
        <Text style={[styles.subText, { color: '#22c55e' }]}>{t.yearlyImprovementStat(imp.earlyRate, imp.recentRate)}</Text>
      </View>
      <Text style={[styles.impDelta, { color: '#22c55e' }]}>+{imp.improvement}pp</Text>
    </View>
  );
}

// ---------- Styles ----------

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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  dateRange: { fontSize: 14, fontWeight: '600' },
  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.two },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringTextLarge: { fontSize: 22, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  subText: { fontSize: 14, lineHeight: 20 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.one },
  list: { gap: Spacing.two },
  emptyNote: { fontSize: 14, fontStyle: 'italic' },

  // Before & After
  beforeAfterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  beforeAfterCol: { flex: 1, gap: 4 },
  baLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  baMonth: { fontSize: 18, fontWeight: '800' },
  baRate: { fontSize: 15, fontWeight: '700' },
  baArrow: { fontSize: 24, fontWeight: '700' },

  // Monthly callouts
  monthCallouts: { gap: 4 },

  // Longest streak
  streakNumber: { fontSize: 48, fontWeight: '800', textAlign: 'center' },

  // Habit evolution
  evoRow: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.two },
  evoTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  evoName: { fontSize: 15, fontWeight: '600' },
  evoMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  evoRate: { fontSize: 14, fontWeight: '800' },
  evoStat: { fontSize: 12, fontWeight: '600' },
  trendBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  trendBadgeText: { fontSize: 11, fontWeight: '700' },

  // Improvements
  impRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  impDelta: { fontSize: 15, fontWeight: '800' },

  // Badges
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.md, borderWidth: 1 },
  badgeText: { fontSize: 13, fontWeight: '600' },

  // Mood
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  moodEmoji: { fontSize: 24 },
  moodSep: { fontSize: 18, fontWeight: '700' },

  // AI
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  aiLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
});
