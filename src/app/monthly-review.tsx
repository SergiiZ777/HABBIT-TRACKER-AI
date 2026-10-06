import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/progress-ring';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { applyHabitChange, createPlannedHabit, isChangeApplied, setHabitPaused } from '@/lib/habit-actions';
import { daysPerWeek, formatTime, useHabits, weekdayLabel } from '@/lib/habits';
import { useLocale, useLocaleTag, useT } from '@/lib/i18n';
import { areaLabel, LIFE_AREA_EMOJI } from '@/lib/life-areas';
import {
  computeMonthlyReview,
  defaultReviewMonth,
  fetchAiMonthlyReport,
  monthLabel,
  shiftMonth,
  type ActionAdvice,
  type AiMonthlyReport,
  type MonthRef,
  type Problem,
  type Win,
} from '@/lib/monthly-review';
import {
  markReviewSeen,
  saveAppliedPlan,
  saveReflection,
  snapshotReminder,
  useMonthlyStore,
} from '@/lib/monthly-store';

export default function MonthlyReviewScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const store = useMonthlyStore();

  const [month, setMonth] = useState<MonthRef>(defaultReviewMonth);
  const monthStr = `${month.year}-${String(month.month + 1).padStart(2, '0')}`;

  const appliedPlan = store.plans[monthStr];
  const reminderSnaps = store.reminderSnapshots[monthStr];

  const review = useMemo(
    () => computeMonthlyReview(habits, month, new Date(), { reminderSnapshots: reminderSnaps, appliedPlan }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute on habits or month change
    [habits, monthStr, reminderSnaps, appliedPlan]
  );

  const reflectionStore = store.reflections[monthStr];
  const [worked, setWorked] = useState(reflectionStore?.worked ?? '');
  const [difficult, setDifficult] = useState(reflectionStore?.difficult ?? '');
  const [improve, setImprove] = useState(reflectionStore?.improve ?? '');
  const [prevMonthStr, setPrevMonthStr] = useState(monthStr);

  if (monthStr !== prevMonthStr) {
    setPrevMonthStr(monthStr);
    setWorked(reflectionStore?.worked ?? '');
    setDifficult(reflectionStore?.difficult ?? '');
    setImprove(reflectionStore?.improve ?? '');
  }

  const [reflectionSavedNotice, setReflectionSavedNotice] = useState(false);

  useEffect(() => {
    markReviewSeen(monthStr);
  }, [monthStr]);

  const [aiReport, setAiReport] = useState<AiMonthlyReport | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAiMonthlyReport(review, locale, store.reflections[monthStr]).then((res) => {
      if (!cancelled) {
        setAiReport(res);
        setAiLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch AI report on month switch or reflection save
  }, [monthStr, locale]);

  const onSaveReflection = () => {
    saveReflection(monthStr, { worked: worked.trim(), difficult: difficult.trim(), improve: improve.trim() });
    setReflectionSavedNotice(true);
    setTimeout(() => setReflectionSavedNotice(false), 2500);
    setAiLoading(true);
    fetchAiMonthlyReport(review, locale, { worked, difficult, improve }).then((res) => setAiReport(res)).finally(() => setAiLoading(false));
  };

  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [planApplied, setPlanApplied] = useState(false);

  const handleApplyAdvice = async (habitId: string, advice: ActionAdvice) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    snapshotReminder(monthStr, habitId, habit.reminderTime);
    setApplyingAction(habitId);
    await applyHabitChange(habitId, advice.action.change, t);
    setApplyingAction(null);
  };

  const handleApplyPlan = async () => {
    const nextMonthStr = `${review.nextMonth.year}-${String(review.nextMonth.month + 1).padStart(2, '0')}`;
    for (const item of review.plan.change) {
      snapshotReminder(monthStr, item.habit.id, item.habit.reminderTime);
      await applyHabitChange(item.habit.id, item.advice.action.change, t);
    }
    for (const h of review.plan.pause) {
      await setHabitPaused(h, true, t);
    }
    if (aiReport?.newHabit) {
      createPlannedHabit({
        name: aiReport.newHabit.name,
        emoji: aiReport.newHabit.emoji,
        area: aiReport.newHabit.area,
        color: '#5B5BF7',
      });
    }
    saveAppliedPlan(nextMonthStr, {
      appliedAt: new Date().toISOString(),
      priorities: review.plan.priorityHabits.map((p) => ({ habitId: p.habit.id, days: p.days })),
    });
    setPlanApplied(true);
    Alert.alert(t.monthlyPlanApplied, t.monthlyPlanFocusLabel + ': ' + planFocusDescription(review.plan.focus, t));
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Month Navigator */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: theme.accent }]}>←</Text>
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: theme.text }]}>{t.monthlyReviewTitle}</Text>
            <View style={styles.monthNav}>
              <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={8}>
                <Text style={[styles.navArrow, { color: theme.accent }]}>‹</Text>
              </Pressable>
              <Text style={[styles.dateRange, { color: theme.textSecondary }]}>
                📅 {monthLabel(month, localeTag, true)}
              </Text>
              <Pressable onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={8}>
                <Text style={[styles.navArrow, { color: theme.accent }]}>›</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Progress Story */}
        <View style={[styles.card, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '44' }]}>
          <Text style={[styles.cardTitle, { color: theme.accent }]}>{t.monthlyProgressStory}</Text>
          {aiLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.subText, { color: theme.textSecondary }]}>{t.yearlyAiLoading}</Text>
            </View>
          ) : (
            <Text style={[styles.bodyText, { color: theme.text }]}>
              {aiReport?.story ?? fallbackStory(review, t, localeTag)}
            </Text>
          )}
        </View>

        {/* 1. Month at a Glance */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📅 {t.monthlyAtAGlance}</Text>
          <View style={styles.overviewRow}>
            <View style={{ alignItems: 'center' }}>
              <ProgressRing
                size={90}
                stroke={10}
                progress={review.consistency / 100}
                color={theme.accent}
                trackColor={theme.backgroundSelected}
              />
              <View style={styles.ringLabel}>
                <Text style={[styles.ringText, { color: theme.text }]}>{review.consistency}%</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>{review.done} / {review.scheduled}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Habits completed</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.text }]}>{review.bestStreak ? `${review.bestStreak.days}d` : '—'}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Best streak</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: '#22c55e' }]}>{review.improvedCount}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Improved</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{review.declinedCount}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Declined</Text>
              </View>
              {review.goals && (
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: theme.accent }]}>{review.goals.achieved} / {review.goals.total}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Goals achieved</Text>
                </View>
              )}
            </View>
          </View>

          {/* Simple Comparison */}
          {review.prevConsistency !== null && (
            <View style={[styles.compBox, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.compText, { color: theme.text }]}>
                {monthLabel(review.prevMonth, localeTag)} → {monthLabel(review.month, localeTag)}
              </Text>
              <Text style={[styles.compTextVal, { color: review.consistency >= review.prevConsistency ? '#22c55e' : '#f59e0b' }]}>
                Consistency: {review.prevConsistency}% → {review.consistency}% {review.consistency >= review.prevConsistency ? '↑' : '↓'} {Math.abs(review.consistency - review.prevConsistency)}%
              </Text>
            </View>
          )}
        </View>

        {/* 2. Progress by Life Area */}
        {review.areas.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>🌐 {t.monthlyProgressByArea}</Text>
            <View style={styles.areaList}>
              {review.areas.map((a) => (
                <View key={a.area} style={styles.areaRow}>
                  <Text style={{ fontSize: 18 }}>{LIFE_AREA_EMOJI[a.area]}</Text>
                  <Text style={[styles.areaName, { color: theme.text }]}>{areaLabel(t, a.area)}</Text>
                  <Text style={[styles.areaScore, { color: theme.text }]}>{a.score}%</Text>
                  <Text
                    style={[
                      styles.areaChange,
                      {
                        color:
                          a.delta === null || a.delta === 0
                            ? theme.textSecondary
                            : a.delta > 0
                              ? '#22c55e'
                              : '#f59e0b',
                      },
                    ]}>
                    {a.delta === null || a.delta === 0 ? '→' : a.delta > 0 ? `↑ ${a.delta}%` : `↓ ${Math.abs(a.delta)}%`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Biggest Wins 🏆 */}
        <View style={[styles.card, { backgroundColor: '#22c55e10', borderColor: '#22c55e33' }]}>
          <Text style={[styles.cardTitle, { color: '#22c55e' }]}>{t.monthlyBiggestWins}</Text>
          {review.wins.length > 0 ? (
            review.wins.map((w, i) => (
              <View key={i} style={styles.winRow}>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={[styles.bodyText, { color: theme.text, flex: 1 }]}>{formatWin(w, t)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              Keep going! Building momentum brings visible wins over time.
            </Text>
          )}
        </View>

        {/* 4. Biggest Problems ⚠️ */}
        {review.problems.length > 0 && (
          <View style={[styles.card, { backgroundColor: '#ef444410', borderColor: '#ef444433' }]}>
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>{t.monthlyBiggestProblems}</Text>
            {review.problems.map((prob) => (
              <ProblemCard
                key={prob.habit.id}
                prob={prob}
                theme={theme}
                t={t}
                localeTag={localeTag}
                loading={applyingAction === prob.habit.id}
                onApplyAdvice={(advice) => handleApplyAdvice(prob.habit.id, advice)}
              />
            ))}
          </View>
        )}

        {/* 5. Habit-by-Habit Progress */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t.monthlyHabitByHabit}</Text>
        </View>
        <View style={{ gap: Spacing.three }}>
          {review.habits.map((hReport) => (
            <View
              key={hReport.habit.id}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.habitHeader}>
                <Text style={{ fontSize: 22 }}>{hReport.habit.emoji}</Text>
                <Text style={[styles.habitName, { color: theme.text }]}>{hReport.habit.name}</Text>
                <Text style={[styles.habitPct, { color: theme.text }]}>{hReport.rate}%</Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.barFill, { backgroundColor: hReport.habit.color, width: `${hReport.rate}%` }]} />
              </View>

              <View style={styles.habitMetaGrid}>
                {hReport.prevRate !== null && (
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    Last month: <Text style={{ color: theme.text, fontWeight: '700' }}>{hReport.prevRate}%</Text>
                  </Text>
                )}
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  This month: <Text style={{ color: theme.text, fontWeight: '700' }}>{hReport.rate}%</Text>
                </Text>
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  Trend:{' '}
                  <Text style={{ color: hReport.trend === 'up' ? '#22c55e' : hReport.trend === 'down' ? '#f59e0b' : theme.textSecondary, fontWeight: '700' }}>
                    {hReport.trend === 'up' ? '↑' : hReport.trend === 'down' ? '↓' : '→'}
                  </Text>
                </Text>
                {hReport.bestDow !== null && (
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    Best: <Text style={{ color: theme.text, fontWeight: '700' }}>{weekdayLabel(hReport.bestDow, localeTag, 'short')}</Text>
                  </Text>
                )}
                {hReport.worstDow !== null && (
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                    Weakest: <Text style={{ color: theme.text, fontWeight: '700' }}>{weekdayLabel(hReport.worstDow, localeTag, 'short')}</Text>
                  </Text>
                )}
              </View>

              {/* Advice box */}
              {renderAdviceBox(hReport, theme, t, localeTag, applyingAction === hReport.habit.id, (advice) =>
                handleApplyAdvice(hReport.habit.id, advice)
              )}
            </View>
          ))}
        </View>

        {/* 6. What should I change next month? ⭐ */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t.monthlyWhatToChange}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>{t.monthlyNextMonthPriorities}</Text>

          {review.priorities.map((prio, idx) => (
            <View key={idx} style={[styles.prioCard, { backgroundColor: theme.backgroundSelected }]}>
              <View style={styles.prioHeader}>
                <Text style={[styles.prioNum, { color: theme.accent }]}>{idx + 1}.</Text>
                <Text style={[styles.prioTitle, { color: theme.text, flex: 1 }]}>{priorityTitle(prio, t)}</Text>
                <View
                  style={[
                    styles.impactTag,
                    {
                      backgroundColor:
                        prio.impact === 'high' ? '#ef444422' : prio.impact === 'medium' ? '#f59e0b22' : '#22c55e22',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.impactText,
                      { color: prio.impact === 'high' ? '#ef4444' : prio.impact === 'medium' ? '#f59e0b' : '#22c55e' },
                    ]}>
                    {prio.impact === 'high' ? `🔥 ${t.impactHigh}` : prio.impact === 'medium' ? `🟡 ${t.impactMedium}` : `🟢 ${t.impactLow}`}
                  </Text>
                </View>
              </View>

              <Text style={[styles.subText, { color: theme.textSecondary }]}>{priorityDescription(prio)}</Text>

              {prio.advice && prio.habit && (
                <Pressable
                  onPress={() => handleApplyAdvice(prio.habit!.id, prio.advice!)}
                  disabled={isChangeApplied(prio.habit, prio.advice.action.change)}
                  style={[
                    styles.applyBtn,
                    {
                      backgroundColor: isChangeApplied(prio.habit, prio.advice.action.change)
                        ? theme.backgroundElement
                        : theme.accent,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.applyBtnText,
                      { color: isChangeApplied(prio.habit, prio.advice.action.change) ? theme.textSecondary : '#fff' },
                    ]}>
                    {isChangeApplied(prio.habit, prio.advice.action.change)
                      ? t.monthlySuggestionApplied
                      : `${t.monthlyApplySuggestion}`}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* 7. Monthly Reflection */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>✍️ {t.monthlyReflectionTitle}</Text>

          <Text style={[styles.inputLabel, { color: theme.text }]}>{t.monthlyQuestionWorked}</Text>
          <TextInput
            value={worked}
            onChangeText={setWorked}
            placeholder="e.g. Morning routine felt effortless..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.reflectionInput, { color: theme.text, backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}
          />

          <Text style={[styles.inputLabel, { color: theme.text }]}>{t.monthlyQuestionDifficult}</Text>
          <TextInput
            value={difficult}
            onChangeText={setDifficult}
            placeholder="e.g. Late work hours, traveling..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.reflectionInput, { color: theme.text, backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}
          />

          <Text style={[styles.inputLabel, { color: theme.text }]}>{t.monthlyQuestionImprove}</Text>
          <TextInput
            value={improve}
            onChangeText={setImprove}
            placeholder="e.g. Protect evening sleep time..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.reflectionInput, { color: theme.text, backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}
          />

          <Pressable onPress={onSaveReflection} style={[styles.saveReflectionBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.saveReflectionBtnText}>Save Reflection</Text>
          </Pressable>
          {reflectionSavedNotice && (
            <Text style={[styles.subText, { color: '#22c55e', textAlign: 'center' }]}>{t.monthlyReflectionSaved}</Text>
          )}
        </View>

        {/* 8. Generate Next Month's Plan */}
        <View style={[styles.card, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '44' }]}>
          <Text style={[styles.cardTitle, { color: theme.accent }]}>
            🚀 {monthLabel(review.month, localeTag)} → {monthLabel(review.nextMonth, localeTag)}
          </Text>

          <View style={styles.planGrid}>
            <View style={styles.planCol}>
              <Text style={[styles.planCategory, { color: '#22c55e' }]}>{t.monthlyPlanKeep}</Text>
              {review.plan.keep.map((h) => (
                <Text key={h.id} style={[styles.subText, { color: theme.text }]}>• {h.emoji} {h.name}</Text>
              ))}
            </View>

            {review.plan.change.length > 0 && (
              <View style={styles.planCol}>
                <Text style={[styles.planCategory, { color: '#f59e0b' }]}>{t.monthlyPlanChange}</Text>
                {review.plan.change.map((c) => (
                  <Text key={c.habit.id} style={[styles.subText, { color: theme.text }]}>• {c.habit.emoji} {c.habit.name}</Text>
                ))}
              </View>
            )}

            {review.plan.pause.length > 0 && (
              <View style={styles.planCol}>
                <Text style={[styles.planCategory, { color: '#ef4444' }]}>{t.monthlyPlanPause}</Text>
                {review.plan.pause.map((h) => (
                  <Text key={h.id} style={[styles.subText, { color: theme.text }]}>• {h.emoji} {h.name}</Text>
                ))}
              </View>
            )}

            {aiReport?.newHabit && (
              <View style={styles.planCol}>
                <Text style={[styles.planCategory, { color: theme.accent }]}>{t.monthlyPlanNew}</Text>
                <Text style={[styles.subText, { color: theme.text }]}>• {aiReport.newHabit.emoji} {aiReport.newHabit.name}</Text>
              </View>
            )}
          </View>

          <View style={[styles.focusBox, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.focusLabel, { color: theme.accent }]}>{t.monthlyPlanFocusLabel}</Text>
            <Text style={[styles.bodyText, { color: theme.text, fontWeight: '700' }]}>
              {planFocusDescription(review.plan.focus, t)}
            </Text>

            <Text style={[styles.prioSubheader, { color: theme.textSecondary }]}>3 priority habits</Text>
            {review.plan.priorityHabits.map((ph, idx) => (
              <Text key={ph.habit.id} style={[styles.subText, { color: theme.text }]}>
                {idx + 1}. {ph.habit.emoji} {ph.habit.name} — {ph.days}×/week
              </Text>
            ))}
          </View>

          <Pressable
            onPress={handleApplyPlan}
            disabled={planApplied}
            style={[styles.applyPlanBtn, { backgroundColor: planApplied ? theme.backgroundSelected : theme.accent }]}>
            <Text style={[styles.applyPlanBtnText, { color: planApplied ? theme.textSecondary : '#fff' }]}>
              {planApplied ? t.monthlyPlanApplied : `Apply ${monthLabel(review.nextMonth, localeTag)} Plan`}
            </Text>
          </Pressable>
        </View>

        {/* 9. Year Progress Connection */}
        {review.year && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>📈 {t.monthlyYearConnection}</Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>
              {monthLabel(review.year.startMonth, localeTag)} → {monthLabel(review.year.endMonth, localeTag)}
            </Text>

            <View style={styles.yearGrid}>
              <View style={styles.yearStat}>
                <Text style={[styles.yearStatLabel, { color: theme.textSecondary }]}>Consistency</Text>
                <Text style={[styles.yearStatVal, { color: theme.accent }]}>
                  {review.year.startRate}% → {review.year.endRate}%
                </Text>
              </View>
              <View style={styles.yearStat}>
                <Text style={[styles.yearStatLabel, { color: theme.textSecondary }]}>Established</Text>
                <Text style={[styles.yearStatVal, { color: '#22c55e' }]}>{review.year.established}</Text>
              </View>
              <View style={styles.yearStat}>
                <Text style={[styles.yearStatLabel, { color: theme.textSecondary }]}>Abandoned</Text>
                <Text style={[styles.yearStatVal, { color: '#f59e0b' }]}>{review.year.abandoned}</Text>
              </View>
              <View style={styles.yearStat}>
                <Text style={[styles.yearStatLabel, { color: theme.textSecondary }]}>Completions</Text>
                <Text style={[styles.yearStatVal, { color: theme.text }]}>{review.year.totalCompletions}</Text>
              </View>
            </View>

            <Text style={[styles.bodyText, { color: theme.text, fontStyle: 'italic', marginTop: 4 }]}>
              {formatYearVerdict(review.year)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Sub-components & Helpers ----------

function ProblemCard({
  prob,
  theme,
  t,
  localeTag,
  loading,
  onApplyAdvice,
}: {
  prob: Problem;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useT>;
  localeTag: string;
  loading: boolean;
  onApplyAdvice: (advice: ActionAdvice) => void;
}) {
  const applied = prob.fix ? isChangeApplied(prob.habit, prob.fix.action.change) : false;

  return (
    <View style={[styles.probBox, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.probTitle, { color: theme.text }]}>
        {prob.habit.emoji} {prob.habit.name}
      </Text>
      {prob.prevRate !== null && (
        <Text style={[styles.probSub, { color: '#ef4444' }]}>
          Dropped from {prob.prevRate}% → {prob.rate}%
        </Text>
      )}

      {prob.pattern && (
        <Text style={[styles.subText, { color: theme.textSecondary, marginTop: 4 }]}>
          {formatPattern(prob.pattern, localeTag)}
        </Text>
      )}

      {prob.fix && (
        <View style={styles.fixBox}>
          <Text style={[styles.fixTitle, { color: theme.accent }]}>AI Suggestion</Text>
          <Text style={[styles.subText, { color: theme.text }]}>{formatAdvice(prob.fix, prob.habit, t, localeTag)}</Text>
          <Pressable
            onPress={() => onApplyAdvice(prob.fix!)}
            disabled={applied || loading}
            style={[styles.applyBtn, { backgroundColor: applied ? theme.backgroundSelected : theme.accent }]}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.applyBtnText, { color: applied ? theme.textSecondary : '#fff' }]}>
                {applied ? t.monthlySuggestionApplied : t.monthlyApplySuggestion}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function renderAdviceBox(
  r: ReturnType<typeof computeMonthlyReview>['habits'][0],
  theme: ReturnType<typeof useTheme>,
  t: ReturnType<typeof useT>,
  localeTag: string,
  loading: boolean,
  onApplyAdvice: (advice: ActionAdvice) => void
) {
  if (
    r.advice.kind === 'noData' ||
    r.advice.kind === 'steady' ||
    r.advice.kind === 'forming' ||
    r.advice.kind === 'automatic' ||
    r.advice.kind === 'keep'
  ) {
    return (
      <View style={[styles.adviceBox, { backgroundColor: theme.backgroundSelected }]}>
        <Text style={[styles.subText, { color: theme.textSecondary }]}>
          {r.advice.kind === 'automatic'
            ? 'Keep the current target. You’re performing with minimal friction.'
            : r.advice.kind === 'keep'
              ? 'Keep the current target. You’re improving without signs of overload.'
              : 'Keep going and build stability.'}
        </Text>
      </View>
    );
  }

  if ('action' in r.advice) {
    const advice = r.advice as ActionAdvice;
    const applied = isChangeApplied(r.habit, advice.action.change);
    return (
      <View style={[styles.adviceBox, { backgroundColor: theme.accent + '10' }]}>
        <Text style={[styles.adviceTitle, { color: theme.accent }]}>AI Suggestion</Text>
        <Text style={[styles.subText, { color: theme.text }]}>{formatAdvice(advice, r.habit, t, localeTag)}</Text>
        <Pressable
          onPress={() => onApplyAdvice(advice)}
          disabled={applied || loading}
          style={[styles.applyBtn, { backgroundColor: applied ? theme.backgroundElement : theme.accent }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.applyBtnText, { color: applied ? theme.textSecondary : '#fff' }]}>
              {applied ? t.monthlySuggestionApplied : t.monthlyApplySuggestion}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return null;
}

function formatWin(w: Win, t: ReturnType<typeof useT>): string {
  switch (w.kind) {
    case 'moreDays':
      return `You completed ${w.habit.emoji} ${w.habit.name} on ${w.done} days, compared with ${w.prevDone} days last month.`;
    case 'longRun':
      return `You maintained your ${w.habit.emoji} ${w.habit.name} for ${w.days} consecutive days.`;
    case 'rateUp':
      return `Your ${w.habit.emoji} ${w.habit.name} consistency increased by ${w.percent}%.`;
    case 'highRate':
      return `You achieved an outstanding ${w.rate}% completion rate on ${w.habit.emoji} ${w.habit.name}.`;
    case 'established':
      return `You successfully established ${w.count} habits without reducing existing consistency.`;
    case 'perfectDays':
      return `You achieved ${w.count} perfect days this month!`;
  }
}

function formatPattern(p: NonNullable<Problem['pattern']>, localeTag: string): string {
  switch (p.kind) {
    case 'evening':
      return `Pattern spotted: ${p.eveningRate}% of missed sessions happened after 18:00 (vs ${p.morningRate}% morning rate).`;
    case 'weekend':
      return `Pattern spotted: ${p.share}% of missed sessions happened on weekends.`;
    case 'weekday':
      return `Pattern spotted: ${weekdayLabel(p.dow, localeTag, 'long')}s are your weakest day (${p.dowRate}% vs ${p.otherRate}% on other days).`;
    case 'fading':
      return `Pattern spotted: ${p.share}% of missed sessions occurred during the final 10 days of the month.`;
  }
}

function formatAdvice(a: ActionAdvice, habit: ReturnType<typeof useHabits>[0], t: ReturnType<typeof useT>, localeTag: string): string {
  switch (a.kind) {
    case 'morning':
      return `Move ${habit.name} to ${formatTime(a.time, localeTag)} and reduce target if needed.`;
    case 'weekendOff':
      return `Schedule ${habit.name} for weekdays only (5×/week).`;
    case 'dropDay':
      return `Remove ${weekdayLabel(a.dow, localeTag, 'long')}s from ${habit.name}'s schedule.`;
    case 'reduce':
      return `Change target from ${daysPerWeek(habit.scheduledDays)}×/week → ${a.to}×/week.`;
    case 'pause':
      return `Pause ${habit.name} for 14 days to recover focus on core routines.`;
  }
}

function priorityTitle(p: ReturnType<typeof computeMonthlyReview>['priorities'][0], t: ReturnType<typeof useT>): string {
  if (p.habit) {
    switch (p.kind) {
      case 'fix':
        return `Fix your ${p.habit.name} habit`;
      case 'reduce':
        return `Reduce ${p.habit.name} target`;
      case 'morning':
        return `Move ${p.habit.name} to morning`;
      case 'pause':
        return `Pause ${p.habit.name} temporarily`;
      case 'protect':
        return `Protect your ${p.habit.name} streak`;
      default:
        return `Focus on ${p.habit.name}`;
    }
  }
  return 'Take on a new challenge';
}

function priorityDescription(p: ReturnType<typeof computeMonthlyReview>['priorities'][0]): string {
  if (p.habit && p.advice) {
    return formatAdvice(p.advice, p.habit, {} as any, 'en-US');
  }
  if (p.kind === 'protect' && p.habit) {
    return `${p.habit.name} is working well (${p.rate}%). Don't increase the target yet — stabilize first.`;
  }
  if (p.kind === 'grow') {
    return 'Your consistency is high and stable. You have capacity to establish a new habit next month.';
  }
  return 'Adjust your setup to sustain progress.';
}

function planFocusDescription(focus: ReturnType<typeof computeMonthlyReview>['plan']['focus'], t: ReturnType<typeof useT>): string {
  switch (focus) {
    case 'consistency':
      return t.monthlyPlanFocusConsistency;
    case 'stabilize':
      return t.monthlyPlanFocusStabilize;
    case 'growth':
      return t.monthlyPlanFocusGrowth;
    case 'maintain':
      return t.monthlyPlanFocusMaintain;
  }
}

function formatYearVerdict(y: NonNullable<ReturnType<typeof computeMonthlyReview>['year']>): string {
  switch (y.verdict.kind) {
    case 'bestYear':
      return 'You’re currently on track to have your most consistent year yet!';
    case 'improving':
      return 'Your consistency is steadily growing month over month.';
    case 'declining':
      return y.verdict.overload
        ? 'Your consistency peaked earlier and has declined. The problem isn’t effort — you’re carrying too many active habits.'
        : 'Your consistency has dipped recently. Take a step back and stabilize your core habits.';
    case 'steady':
      return 'Your year-to-date habit consistency is steady and dependable.';
  }
}

function fallbackStory(review: ReturnType<typeof computeMonthlyReview>, t: ReturnType<typeof useT>, localeTag: string): string {
  const mName = monthLabel(review.month, localeTag);
  const trendPart = review.prevConsistency !== null
    ? `You ${review.consistency >= review.prevConsistency ? 'improved' : 'changed'} from ${review.prevConsistency}% to ${review.consistency}%.`
    : `You achieved a ${review.consistency}% consistency score.`;
  const winPart = review.driver ? ` ${review.driver.name} was a major highlight.` : '';
  const problemPart = review.eveningWeak ? ' The weak point was evening habits — most missed sessions happened after 18:00.' : '';
  return `${mName} was a key month for your habits. ${trendPart}${winPart}${problemPart} Next month, focus on stabilizing your routines.`;
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: { fontSize: 28, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  navArrow: { fontSize: 22, fontWeight: '800', paddingHorizontal: 4 },
  dateRange: { fontSize: 14, fontWeight: '600' },

  card: { padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.three },
  cardTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionHeader: { marginTop: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  sectionSubtitle: { fontSize: 13, fontStyle: 'italic', marginTop: -4 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  subText: { fontSize: 14, lineHeight: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  // Overview
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 20, fontWeight: '800' },
  metricsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricItem: { flexBasis: '45%', flexGrow: 1 },
  metricValue: { fontSize: 16, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600' },

  compBox: { padding: Spacing.three, borderRadius: Radius.md, gap: 2 },
  compText: { fontSize: 13, fontWeight: '600' },
  compTextVal: { fontSize: 14, fontWeight: '800' },

  // Life areas
  areaList: { gap: Spacing.two },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  areaName: { flex: 1, fontSize: 15, fontWeight: '600' },
  areaScore: { fontSize: 15, fontWeight: '800' },
  areaChange: { fontSize: 13, fontWeight: '700', width: 60, textAlign: 'right' },

  // Wins
  winRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },

  // Problems
  probBox: { padding: Spacing.three, borderRadius: Radius.md, gap: 4 },
  probTitle: { fontSize: 16, fontWeight: '700' },
  probSub: { fontSize: 13, fontWeight: '700' },
  fixBox: { marginTop: Spacing.two, gap: 4 },
  fixTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },

  // Habit by habit
  habitHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  habitName: { flex: 1, fontSize: 16, fontWeight: '700' },
  habitPct: { fontSize: 16, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  habitMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  metaText: { fontSize: 13 },
  adviceBox: { padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.two },
  adviceTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },

  // Priorities
  prioCard: { padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.two },
  prioHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  prioNum: { fontSize: 18, fontWeight: '800' },
  prioTitle: { fontSize: 15, fontWeight: '700' },
  impactTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  impactText: { fontSize: 11, fontWeight: '800' },

  // Actions
  applyBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, alignSelf: 'flex-start', marginTop: 4 },
  applyBtnText: { fontSize: 13, fontWeight: '700' },

  // Reflection
  inputLabel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  reflectionInput: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  saveReflectionBtn: { paddingVertical: 12, borderRadius: Radius.pill, alignItems: 'center', marginTop: 8 },
  saveReflectionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Plan
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  planCol: { minWidth: 120, gap: 2 },
  planCategory: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  focusBox: { padding: Spacing.three, borderRadius: Radius.md, gap: 4, marginTop: Spacing.two },
  focusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  prioSubheader: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  applyPlanBtn: { paddingVertical: 14, borderRadius: Radius.pill, alignItems: 'center', marginTop: Spacing.two },
  applyPlanBtnText: { fontSize: 16, fontWeight: '700' },

  // Year progress
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  yearStat: { flexBasis: '45%', flexGrow: 1 },
  yearStatLabel: { fontSize: 11, fontWeight: '600' },
  yearStatVal: { fontSize: 15, fontWeight: '800' },
});
