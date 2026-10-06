import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TimePickerField } from '@/components/time-picker-field';
import { TrendChart } from '@/components/trend-chart';
import { YearHeatmap } from '@/components/year-heatmap';
import {
  badgeDescription,
  badgeTitle,
  computeBadges,
  computeRangeSummary,
  computeStats,
  computeTrend,
  computeYearHeatmap,
  type TrendRange,
} from '@/lib/achievements';
import { useDeviceId } from '@/lib/backup';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { setDailyNudgeEnabled, setDailyNudgeTime, useDailyNudgeEnabled, useDailyNudgeTime } from '@/lib/daily-nudge';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, useHabits } from '@/lib/habits';
import { useLocaleTag, useT } from '@/lib/i18n';
import { computePatternInsight, resolvePatternInsight } from '@/lib/insights';
import { computeMotivation, resolveMotivation } from '@/lib/motivation';
import { setWeeklyRecapEnabled, useWeeklyRecapEnabled } from '@/lib/weekly-recap';
import { computeWeeklyReview } from '@/lib/weekly-review';

export default function DashboardScreen() {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const deviceId = useDeviceId();
  const [copied, setCopied] = useState(false);
  const today = new Date();
  const [range, setRange] = useState<TrendRange>('week');
  const [yearView, setYearView] = useState<'heatmap' | 'graph'>('heatmap');
  const nudgeEnabled = useDailyNudgeEnabled();
  const nudgeTime = useDailyNudgeTime();
  const recapEnabled = useWeeklyRecapEnabled();

  const copyBackupId = async () => {
    await Clipboard.setStringAsync(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onToggleNudge = async (next: boolean) => {
    const ok = await setDailyNudgeEnabled(next);
    if (!ok) Alert.alert(t.remindersDisabledTitle, t.dailyNudgeDisabledMessage);
  };

  const onToggleRecap = async (next: boolean) => {
    const ok = await setWeeklyRecapEnabled(next);
    if (!ok) Alert.alert(t.remindersDisabledTitle, t.weeklyRecapDisabledMessage);
  };

  const stats = computeStats(habits, today);
  const badges = computeBadges(habits, today);
  const rawMotivation = computeMotivation(habits, today);
  const motivation = { emoji: rawMotivation.emoji, ...resolveMotivation(t, rawMotivation) };
  const rawPatternInsight = computePatternInsight(habits, today);
  const patternInsight = rawPatternInsight ? resolvePatternInsight(t, localeTag, rawPatternInsight) : null;
  const trend = computeTrend(habits, range, today, localeTag);
  const heatmapColumns = range === 'year' ? computeYearHeatmap(habits, today, localeTag) : [];
  const rangeSummary = computeRangeSummary(habits, range, today);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` is stable within a single render
  const weeklyReview = useMemo(() => computeWeeklyReview(habits, today), [habits]);
  const weeklyTrendArrow = weeklyReview.trend.delta > 0
    ? t.weeklyTrendUp(weeklyReview.trend.delta)
    : weeklyReview.trend.delta < 0
      ? t.weeklyTrendDown(weeklyReview.trend.delta)
      : t.weeklyTrendFlat;

  const topHabits = [...habits].sort((a, b) => currentStreak(b, today) - currentStreak(a, today));

  const statTiles = [
    { emoji: '🔥', value: stats.bestStreak, label: t.statBestStreak },
    { emoji: '✅', value: stats.totalCompletions, label: t.statCompletions },
    { emoji: '🧩', value: stats.activeHabitsCount, label: t.statHabits },
    { emoji: '☀️', value: stats.perfectDaysCount, label: t.statPerfectDays },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{t.eyebrowProgress}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{t.dashboardTitle}</Text>
        </View>

        <View style={[styles.motivationCard, { backgroundColor: theme.accent + '14', borderColor: theme.accent }]}>
          <Text style={styles.motivationEmoji}>{motivation.emoji}</Text>
          <View style={styles.flex}>
            <Text style={[styles.motivationHeadline, { color: theme.text }]}>{motivation.headline}</Text>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{motivation.detail}</Text>
          </View>
        </View>

        {patternInsight && (
          <View style={[styles.insightCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={styles.insightEmoji}>📊</Text>
            <View style={styles.flex}>
              <Text style={[styles.insightHeadline, { color: theme.text }]}>{patternInsight.headline}</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{patternInsight.detail}</Text>
            </View>
          </View>
        )}

        {habits.length > 0 && (
          <Pressable
            onPress={() => router.push('/weekly-review')}
            style={[styles.weeklyCard, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '44' }]}>
            <Text style={styles.weeklyEmoji}>📋</Text>
            <View style={styles.flex}>
              <Text style={[styles.motivationHeadline, { color: theme.text }]}>{t.dashboardWeeklyCard}</Text>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                {t.dashboardWeeklyCardSummary(weeklyReview.completionRate, weeklyTrendArrow)}
              </Text>
            </View>
            <Text style={[styles.weeklyArrow, { color: theme.accent }]}>→</Text>
          </Pressable>
        )}

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

        <View style={[styles.trendCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.trendHeader}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>{t.trendsTitle}</Text>
            <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
              {(['week', 'month', 'year'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={[styles.segment, range === r && { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.segmentText, { color: range === r ? theme.text : theme.textSecondary }]}>
                    {r === 'week' ? t.rangeWeek : r === 'month' ? t.rangeMonth : t.rangeYear}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
              {t.trendSummary(Math.round(rangeSummary.averageRate * 100), rangeSummary.perfectDays)}
            </Text>
            {range === 'year' && (
              <View style={[styles.subSegmented, { backgroundColor: theme.backgroundSelected }]}>
                {(['heatmap', 'graph'] as const).map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => setYearView(v)}
                    style={[styles.subSegment, yearView === v && { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.subSegmentText, { color: yearView === v ? theme.text : theme.textSecondary }]}>
                      {v === 'heatmap' ? t.yearViewHeatmap : t.yearViewGraph}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {range === 'year' && yearView === 'heatmap' ? (
            <YearHeatmap columns={heatmapColumns} localeTag={localeTag} />
          ) : (
            <TrendChart points={trend} />
          )}
        </View>

        <Text style={[styles.section, { color: theme.textSecondary }]}>
          {t.achievementsHeader(unlockedCount, badges.length)}
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
                {badgeTitle(t, b.id)}
              </Text>
              <Text numberOfLines={2} style={[styles.badgeDescription, { color: theme.textSecondary }]}>
                {badgeDescription(t, b)}
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
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.perHabit}</Text>
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
              {t.dashboardEmpty}
            </Text>
          </View>
        )}

        <View style={[styles.backupCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.section, { color: theme.textSecondary }]}>{t.backupIdLabel}</Text>
          <Pressable onPress={copyBackupId} style={[styles.backupRow, { borderColor: theme.border }]}>
            <Text numberOfLines={1} style={[styles.backupIdText, { color: theme.text }]}>
              {deviceId}
            </Text>
            <Text style={[styles.copyButtonText, { color: theme.accent }]}>{copied ? t.backupIdCopied : t.copyButton}</Text>
          </Pressable>
          <Text style={[styles.backupHint, { color: theme.textSecondary }]}>{t.backupIdHint}</Text>
        </View>

        <View style={[styles.backupCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.nudgeRow}>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.dailyNudgeLabel}</Text>
            <Switch
              value={nudgeEnabled}
              onValueChange={onToggleNudge}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
            />
          </View>
          <Text style={[styles.backupHint, { color: theme.textSecondary }]}>{t.dailyNudgeHint}</Text>
          {nudgeEnabled && <TimePickerField time={nudgeTime} color={theme.accent} onChange={setDailyNudgeTime} />}
        </View>

        <View style={[styles.backupCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.nudgeRow}>
            <Text style={[styles.section, { color: theme.textSecondary }]}>{t.weeklyRecapLabel}</Text>
            <Switch
              value={recapEnabled}
              onValueChange={onToggleRecap}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
            />
          </View>
          <Text style={[styles.backupHint, { color: theme.textSecondary }]}>{t.weeklyRecapHint}</Text>
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
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  motivationEmoji: { fontSize: 32 },
  motivationHeadline: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  insightEmoji: { fontSize: 28 },
  insightHeadline: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  trendCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3 },
  segment: { paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.pill },
  segmentText: { fontSize: 13, fontWeight: '700' },
  summaryTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  summaryText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  subSegmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 2 },
  subSegment: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.pill },
  subSegmentText: { fontSize: 11, fontWeight: '700' },
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
  weeklyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  weeklyEmoji: { fontSize: 28 },
  weeklyArrow: { fontSize: 22, fontWeight: '700' },
  backupCard: { gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.lg, borderWidth: 1 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backupIdText: { flex: 1, fontSize: 14, fontWeight: '600' },
  copyButtonText: { fontSize: 14, fontWeight: '700' },
  backupHint: { fontSize: 12, lineHeight: 17 },
});
