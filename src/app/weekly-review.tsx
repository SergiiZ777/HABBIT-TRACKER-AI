import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { TrendChart } from '@/components/trend-chart';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useHabits } from '@/lib/habits';
import { useLocaleTag, useT, useLocale } from '@/lib/i18n';
import { computeWeeklyReview, fetchAiReview, type AiWeeklyReview, type HabitWeekStats } from '@/lib/weekly-review';
import type { TrendPoint } from '@/lib/achievements';

const ENERGY_EMOJIS = ['', '😴', '😐', '🙂', '😊', '⚡'];
const MOOD_EMOJIS = ['', '😢', '😕', '😐', '🙂', '😄'];

function HabitStatRow({ stat, tint, theme }: { stat: HabitWeekStats; tint: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.habitRow, { backgroundColor: tint + '12', borderColor: tint + '33' }]}>
      <Text style={{ fontSize: 20 }}>{stat.habit.emoji}</Text>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.habitName, { color: theme.text }]}>{stat.habit.name}</Text>
        {stat.streak > 0 && (
          <Text style={[styles.habitStreak, { color: theme.textSecondary }]}>🔥 {stat.streak}</Text>
        )}
      </View>
      <Text style={[styles.habitRate, { color: tint }]}>{stat.rate}%</Text>
    </View>
  );
}

export default function WeeklyReviewScreen() {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const today = new Date();

  const locale = useLocale();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` is stable within a single render
  const review = useMemo(() => computeWeeklyReview(habits, today), [habits]);
  const [aiReview, setAiReview] = useState<AiWeeklyReview | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAiReview(review, locale).then((result) => {
      if (!cancelled) {
        setAiReview(result);
        setAiLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const startLabel = new Date(`${review.dateRange.start}T12:00:00`).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
  const endLabel = new Date(`${review.dateRange.end}T12:00:00`).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });

  const trendText = review.trend.delta > 0
    ? t.weeklyTrendUp(review.trend.delta)
    : review.trend.delta < 0
      ? t.weeklyTrendDown(review.trend.delta)
      : t.weeklyTrendFlat;

  const trendColor = review.trend.delta > 0 ? '#22c55e' : review.trend.delta < 0 ? '#ef4444' : theme.textSecondary;

  const dailyPoints: TrendPoint[] = review.dailyRates.map((d) => {
    const date = new Date(`${d.key}T12:00:00`);
    return {
      key: d.key,
      label: date.toLocaleDateString(localeTag, { weekday: 'narrow' }),
      fullLabel: date.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' }),
      rate: d.total > 0 ? d.done / d.total : 0,
      done: d.done,
      total: d.total,
    };
  });

  const moodEnergyEmoji = review.moodAvg ? ENERGY_EMOJIS[Math.round(review.moodAvg.energy)] ?? '😐' : null;
  const moodMoodEmoji = review.moodAvg ? MOOD_EMOJIS[Math.round(review.moodAvg.mood)] ?? '😐' : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: theme.accent }]}>←</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.text }]}>{t.weeklyReviewTitle}</Text>
            <Text style={[styles.dateRange, { color: theme.textSecondary }]}>
              {t.weeklyReviewDateRange(startLabel, endLabel)}
            </Text>
          </View>
        </View>

        {/* Overview */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.overviewRow}>
            <View>
              <ProgressRing
                size={80}
                stroke={10}
                progress={review.completionRate / 100}
                color={theme.accent}
                trackColor={theme.backgroundSelected}
              />
              <View style={styles.ringLabel}>
                <Text style={[styles.ringText, { color: theme.text }]}>{review.completionRate}%</Text>
              </View>
            </View>
            <View style={[styles.flex, { gap: 4 }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {t.weeklyOverviewDone(review.totalDone, review.totalScheduled)}
              </Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>
                {t.weeklyPerfectDays(review.perfectDays)}
              </Text>
              <Text style={[styles.trendText, { color: trendColor }]}>{trendText}</Text>
            </View>
          </View>
        </View>

        {/* Daily breakdown */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TrendChart points={dailyPoints} />
        </View>

        {/* Best habits */}
        {review.bestHabits.length > 0 && (
          <View>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.weeklyBestHabits}</Text>
            <View style={styles.list}>
              {review.bestHabits.map((s) => (
                <HabitStatRow key={s.habit.id} stat={s} tint="#22c55e" theme={theme} />
              ))}
            </View>
          </View>
        )}

        {/* Worst habits */}
        {review.worstHabits.length > 0 && (
          <View>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.weeklyWorstHabits}</Text>
            <View style={styles.list}>
              {review.worstHabits.map((s) => (
                <HabitStatRow key={s.habit.id} stat={s} tint="#f59e0b" theme={theme} />
              ))}
            </View>
          </View>
        )}

        {/* Missed habits */}
        <View>
          <Text style={[styles.section, { color: theme.textSecondary }]}>{t.weeklyMissedHabits}</Text>
          {review.missedHabits.length > 0 ? (
            <View style={styles.list}>
              {review.missedHabits.map((s) => (
                <HabitStatRow key={s.habit.id} stat={s} tint="#ef4444" theme={theme} />
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyNote, { color: theme.textSecondary }]}>{t.weeklyMissedNone}</Text>
          )}
        </View>

        {/* Mood average */}
        {review.moodAvg && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.weeklyMoodAvg}</Text>
            <View style={styles.moodRow}>
              <Text style={styles.moodEmoji}>{moodEnergyEmoji}</Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{review.moodAvg.energy.toFixed(1)}</Text>
              <Text style={[styles.moodSep, { color: theme.border }]}>·</Text>
              <Text style={styles.moodEmoji}>{moodMoodEmoji}</Text>
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{review.moodAvg.mood.toFixed(1)}</Text>
            </View>
          </View>
        )}

        {/* Correlations */}
        {review.correlations.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t.weeklyCorrelationsTitle}</Text>
            {review.correlations.map((c, i) => (
              <Text key={i} style={[styles.subText, { color: theme.textSecondary }]}>
                {t.weeklyCorrelationPair(
                  `${c.a.emoji} ${c.a.name}`,
                  `${c.b.emoji} ${c.b.name}`,
                  c.togetherDays,
                )}
              </Text>
            ))}
          </View>
        )}

        {/* AI Review */}
        <View style={[styles.card, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '33' }]}>
          <Text style={[styles.cardTitle, { color: theme.accent }]}>✨ {t.weeklyAiReviewTitle}</Text>
          {aiLoading ? (
            <View style={styles.aiLoadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{t.weeklyAiLoading}</Text>
            </View>
          ) : aiReview ? (
            <View style={{ gap: Spacing.three }}>
              <View>
                <Text style={[styles.aiLabel, { color: theme.accent }]}>{t.weeklyAiWentWell}</Text>
                <Text style={[styles.subText, { color: theme.text }]}>{aiReview.wellDone}</Text>
              </View>
              {aiReview.failed ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#f59e0b' }]}>{t.weeklyAiFailed}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.failed}</Text>
                </View>
              ) : null}
              {aiReview.whyFailed ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#ef4444' }]}>{t.weeklyAiWhyFailed}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.whyFailed}</Text>
                </View>
              ) : null}
              {aiReview.nextWeek ? (
                <View>
                  <Text style={[styles.aiLabel, { color: '#22c55e' }]}>{t.weeklyAiNextWeek}</Text>
                  <Text style={[styles.subText, { color: theme.text }]}>{aiReview.nextWeek}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.subText, { color: theme.textSecondary }]}>{t.weeklyAiError}</Text>
          )}
        </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  dateRange: { fontSize: 14, fontWeight: '600' },
  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.two },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 17, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  subText: { fontSize: 14, lineHeight: 20 },
  trendText: { fontSize: 14, fontWeight: '700' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.one },
  list: { gap: Spacing.two },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  habitName: { fontSize: 15, fontWeight: '600' },
  habitStreak: { fontSize: 12, fontWeight: '600' },
  habitRate: { fontSize: 16, fontWeight: '800' },
  emptyNote: { fontSize: 14, fontStyle: 'italic' },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  moodEmoji: { fontSize: 24 },
  moodSep: { fontSize: 18, fontWeight: '700' },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  aiLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
});
