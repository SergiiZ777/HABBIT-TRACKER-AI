import { computeBadges, type BadgeId, type TrendPoint } from '@/lib/achievements';
import { getDeviceId } from '@/lib/backup';
import { addDays, currentStreak, dayKey, isScheduledOn, type Habit } from '@/lib/habits';
import type { Locale } from '@/lib/i18n';
import { getMoodForDay } from '@/lib/mood';

const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c33477830';
const COACH_WEBHOOK_KEY = process.env.EXPO_PUBLIC_COACH_KEY ?? '';

// ---------- Types ----------

export type HabitEvolution = {
  habit: Habit;
  createdAt: string;
  activeMonths: number;
  yearCompletions: number;
  yearScheduled: number;
  yearRate: number;
  bestStreakInYear: number;
  currentStreak: number;
  monthlyRates: { month: string; label: string; rate: number }[];
  trend: 'improving' | 'declining' | 'steady';
  trendDelta: number;
};

export type PeriodSnapshot = {
  label: string;
  completionRate: number;
  avgDailyCompletions: number;
  activeHabitsCount: number;
  perfectDays: number;
};

export type BehavioralImprovement = {
  habit: Habit;
  earlyRate: number;
  recentRate: number;
  improvement: number;
};

export type YearlyReview = {
  year: number;
  completionRate: number;
  totalCompletions: number;
  totalScheduled: number;
  perfectDays: number;
  longestStreak: { habit: Habit; days: number };
  activeDays: number;
  totalDaysInYear: number;
  consistencyScore: number;
  habitEvolutions: HabitEvolution[];
  beforeAfter: { before: PeriodSnapshot; after: PeriodSnapshot };
  monthlyTrends: TrendPoint[];
  biggestImprovements: BehavioralImprovement[];
  goalsAchieved: { badgeId: BadgeId; emoji: string }[];
  moodAvg: { energy: number; mood: number } | null;
  bestMonth: { label: string; rate: number } | null;
  worstMonth: { label: string; rate: number } | null;
  habitsAdded: number;
  dateRange: { start: string; end: string };
};

export type AiYearlyReview = {
  yearStory: string;
  proudOf: string;
  transformation: string;
  nextYear: string;
  closing: string;
};

// ---------- Helpers ----------

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function existingHabitsOn(habits: Habit[], key: string, date: Date): Habit[] {
  return habits.filter((h) => dayKey(new Date(h.createdAt)) <= key && isScheduledOn(h, date));
}

function bestStreakInYear(habit: Habit, yearStart: string, yearEnd: string): number {
  const completionSet = new Set(habit.completions);
  const start = new Date(`${yearStart}T12:00:00`);
  let best = 0;
  let run = 0;
  let cursor = start;
  let guard = 0;
  while (dayKey(cursor) <= yearEnd && guard < 400) {
    if (isScheduledOn(habit, cursor)) {
      if (completionSet.has(dayKey(cursor))) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  return best;
}

// ---------- Main computation ----------

export function computeYearlyReview(habits: Habit[], today: Date = new Date()): YearlyReview {
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = today;
  const yearStartKey = dayKey(yearStart);
  const yearEndKey = dayKey(yearEnd);
  const totalDaysInYear = Math.round((yearEnd.getTime() - yearStart.getTime()) / 86400000) + 1;

  const completionSets = new Map<string, Set<string>>();
  for (const h of habits) completionSets.set(h.id, new Set(h.completions));

  // Per-habit per-month accumulators
  type MonthBucket = { done: number; total: number; perfectDays: number; dayCount: number; activeDayCount: number; activeHabits: Set<string> };
  const monthBuckets = new Map<string, MonthBucket>();
  type HabitMonth = { done: number; total: number };
  const habitMonthData = new Map<string, Map<string, HabitMonth>>();
  for (const h of habits) habitMonthData.set(h.id, new Map());

  let totalDone = 0;
  let totalScheduled = 0;
  let perfectDays = 0;
  let activeDays = 0;

  let cursor = yearStart;
  let guard = 0;
  while (dayKey(cursor) <= yearEndKey && guard < 400) {
    const key = dayKey(cursor);
    const mk = monthKeyFromDate(cursor);
    const existing = existingHabitsOn(habits, key, cursor);

    if (!monthBuckets.has(mk)) {
      monthBuckets.set(mk, { done: 0, total: 0, perfectDays: 0, dayCount: 0, activeDayCount: 0, activeHabits: new Set() });
    }
    const mb = monthBuckets.get(mk)!;
    mb.dayCount++;

    let dayDone = 0;
    let dayTotal = 0;

    for (const h of existing) {
      dayTotal++;
      mb.activeHabits.add(h.id);
      const hm = habitMonthData.get(h.id)!;
      if (!hm.has(mk)) hm.set(mk, { done: 0, total: 0 });
      const hb = hm.get(mk)!;
      hb.total++;
      if (completionSets.get(h.id)!.has(key)) {
        dayDone++;
        hb.done++;
      }
    }

    totalDone += dayDone;
    totalScheduled += dayTotal;
    mb.done += dayDone;
    mb.total += dayTotal;
    if (dayTotal > 0 && dayDone === dayTotal) {
      perfectDays++;
      mb.perfectDays++;
    }
    if (dayDone > 0) {
      activeDays++;
      mb.activeDayCount++;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }

  const completionRate = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;

  // Monthly trends as TrendPoint[]
  const monthlyTrends: TrendPoint[] = [];
  const sortedMonths = [...monthBuckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [mk, mb] of sortedMonths) {
    const d = new Date(`${mk}-15T12:00:00`);
    monthlyTrends.push({
      key: mk,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      fullLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      rate: mb.total > 0 ? mb.done / mb.total : 0,
      done: mb.done,
      total: mb.total,
    });
  }

  // Best and worst months
  const activeMonths = monthlyTrends.filter((m) => m.total > 0);
  let bestMonth: { label: string; rate: number } | null = null;
  let worstMonth: { label: string; rate: number } | null = null;
  if (activeMonths.length > 0) {
    const best = activeMonths.reduce((a, b) => (b.rate > a.rate ? b : a));
    const worst = activeMonths.reduce((a, b) => (b.rate < a.rate ? b : a));
    bestMonth = { label: best.fullLabel, rate: Math.round(best.rate * 100) };
    worstMonth = { label: worst.fullLabel, rate: Math.round(worst.rate * 100) };
  }

  // Longest streak in year (across all habits)
  let longestStreak: { habit: Habit; days: number } = { habit: habits[0] ?? ({} as Habit), days: 0 };
  for (const h of habits) {
    const s = bestStreakInYear(h, yearStartKey, yearEndKey);
    if (s > longestStreak.days) longestStreak = { habit: h, days: s };
  }

  // Habit evolutions
  const habitEvolutions: HabitEvolution[] = [];
  for (const h of habits) {
    const hm = habitMonthData.get(h.id)!;
    const months = [...hm.entries()].sort(([a], [b]) => a.localeCompare(b));
    const activeMonthCount = months.filter(([, v]) => v.total > 0).length;
    if (activeMonthCount === 0) continue;

    const yearCompletions = months.reduce((s, [, v]) => s + v.done, 0);
    const yearScheduled = months.reduce((s, [, v]) => s + v.total, 0);
    const yearRate = yearScheduled > 0 ? Math.round((yearCompletions / yearScheduled) * 100) : 0;

    const monthlyRates = months
      .filter(([, v]) => v.total > 0)
      .map(([mk, v]) => {
        const d = new Date(`${mk}-15T12:00:00`);
        return {
          month: mk,
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          rate: Math.round((v.done / v.total) * 100),
        };
      });

    // Trend: first half vs second half
    const half = Math.ceil(monthlyRates.length / 2);
    const firstHalf = monthlyRates.slice(0, half);
    const secondHalf = monthlyRates.slice(half);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, m) => s + m.rate, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, m) => s + m.rate, 0) / secondHalf.length : 0;
    const trendDelta = secondAvg - firstAvg;
    const trend: 'improving' | 'declining' | 'steady' =
      trendDelta >= 10 ? 'improving' : trendDelta <= -10 ? 'declining' : 'steady';

    habitEvolutions.push({
      habit: h,
      createdAt: h.createdAt,
      activeMonths: activeMonthCount,
      yearCompletions,
      yearScheduled,
      yearRate,
      bestStreakInYear: bestStreakInYear(h, yearStartKey, yearEndKey),
      currentStreak: currentStreak(h, today),
      monthlyRates,
      trend,
      trendDelta: Math.round(trendDelta),
    });
  }
  habitEvolutions.sort((a, b) => b.yearRate - a.yearRate);

  // Before/After: first active month vs most recent active month
  const activeSorted = sortedMonths.filter(([, mb]) => mb.total > 0);
  const firstMonth = activeSorted[0];
  const lastMonth = activeSorted[activeSorted.length - 1];
  const makeSnapshot = (entry: [string, MonthBucket]): PeriodSnapshot => {
    const [mk, mb] = entry;
    const d = new Date(`${mk}-15T12:00:00`);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      completionRate: mb.total > 0 ? Math.round((mb.done / mb.total) * 100) : 0,
      avgDailyCompletions: mb.dayCount > 0 ? Math.round((mb.done / mb.dayCount) * 10) / 10 : 0,
      activeHabitsCount: mb.activeHabits.size,
      perfectDays: mb.perfectDays,
    };
  };
  const beforeAfter = {
    before: firstMonth ? makeSnapshot(firstMonth) : { label: '', completionRate: 0, avgDailyCompletions: 0, activeHabitsCount: 0, perfectDays: 0 },
    after: lastMonth ? makeSnapshot(lastMonth) : { label: '', completionRate: 0, avgDailyCompletions: 0, activeHabitsCount: 0, perfectDays: 0 },
  };

  // Biggest improvements: top 3 with positive trend
  const biggestImprovements: BehavioralImprovement[] = habitEvolutions
    .filter((e) => e.trendDelta > 0 && e.monthlyRates.length >= 2)
    .sort((a, b) => b.trendDelta - a.trendDelta)
    .slice(0, 3)
    .map((e) => ({
      habit: e.habit,
      earlyRate: e.monthlyRates[0].rate,
      recentRate: e.monthlyRates[e.monthlyRates.length - 1].rate,
      improvement: e.trendDelta,
    }));

  // Goals achieved this year: diff badges now vs badges with pre-year completions only
  const preYearHabits = habits.map((h) => ({
    ...h,
    completions: h.completions.filter((c) => c < yearStartKey),
  }));
  const badgesBefore = new Set(computeBadges(preYearHabits, yearStart).filter((b) => b.unlocked).map((b) => b.id));
  const badgesNow = computeBadges(habits, today);
  const badgeEmojis: Record<string, string> = {};
  for (const b of badgesNow) badgeEmojis[b.id] = b.emoji;
  const goalsAchieved = badgesNow
    .filter((b) => b.unlocked && !badgesBefore.has(b.id))
    .map((b) => ({ badgeId: b.id, emoji: b.emoji }));

  // Mood average for the year
  let moodAvg: { energy: number; mood: number } | null = null;
  let moodCount = 0;
  let energySum = 0;
  let moodSum = 0;
  cursor = new Date(yearStart);
  guard = 0;
  while (dayKey(cursor) <= yearEndKey && guard < 400) {
    const m = getMoodForDay(dayKey(cursor));
    if (m && m.energy > 0 && m.mood > 0) {
      energySum += m.energy;
      moodSum += m.mood;
      moodCount++;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  if (moodCount > 0) {
    moodAvg = {
      energy: Math.round((energySum / moodCount) * 10) / 10,
      mood: Math.round((moodSum / moodCount) * 10) / 10,
    };
  }

  // Habits added this year
  const habitsAdded = habits.filter((h) => {
    const created = dayKey(new Date(h.createdAt));
    return created >= yearStartKey && created <= yearEndKey;
  }).length;

  // Consistency score: weighted blend
  const rateComponent = totalScheduled > 0 ? totalDone / totalScheduled : 0;
  const activeDaysComponent = totalDaysInYear > 0 ? activeDays / totalDaysInYear : 0;
  const streakComponent = Math.min(1, longestStreak.days / 30);
  const consistencyScore = Math.round(
    (0.5 * rateComponent + 0.3 * activeDaysComponent + 0.2 * streakComponent) * 100,
  );

  return {
    year,
    completionRate,
    totalCompletions: totalDone,
    totalScheduled,
    perfectDays,
    longestStreak,
    activeDays,
    totalDaysInYear,
    consistencyScore,
    habitEvolutions,
    beforeAfter,
    monthlyTrends,
    biggestImprovements,
    goalsAchieved,
    moodAvg,
    bestMonth,
    worstMonth,
    habitsAdded,
    dateRange: { start: yearStartKey, end: yearEndKey },
  };
}

// ---------- Lightweight score for dashboard ----------

export function computeYearlyConsistencyScore(habits: Habit[], today: Date = new Date()): number {
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEndKey = dayKey(today);
  const totalDaysInYear = Math.round((today.getTime() - yearStart.getTime()) / 86400000) + 1;

  const completionSets = new Map<string, Set<string>>();
  for (const h of habits) completionSets.set(h.id, new Set(h.completions));

  let totalDone = 0;
  let totalScheduled = 0;
  let activeDays = 0;
  let bestStreak = 0;

  // Per-habit streak tracking for best-streak
  const streaks = new Map<string, number>();
  for (const h of habits) streaks.set(h.id, 0);

  let cursor = yearStart;
  let guard = 0;
  while (dayKey(cursor) <= yearEndKey && guard < 400) {
    const key = dayKey(cursor);
    let dayDone = 0;

    for (const h of habits) {
      if (dayKey(new Date(h.createdAt)) > key || !isScheduledOn(h, cursor)) continue;
      totalScheduled++;
      if (completionSets.get(h.id)!.has(key)) {
        dayDone++;
        totalDone++;
        const s = (streaks.get(h.id) ?? 0) + 1;
        streaks.set(h.id, s);
        bestStreak = Math.max(bestStreak, s);
      } else {
        streaks.set(h.id, 0);
      }
    }
    if (dayDone > 0) activeDays++;
    cursor = addDays(cursor, 1);
    guard++;
  }

  const rateComponent = totalScheduled > 0 ? totalDone / totalScheduled : 0;
  const activeDaysComponent = totalDaysInYear > 0 ? activeDays / totalDaysInYear : 0;
  const streakComponent = Math.min(1, bestStreak / 30);
  return Math.round((0.5 * rateComponent + 0.3 * activeDaysComponent + 0.2 * streakComponent) * 100);
}

// ---------- AI fetch ----------

export async function fetchAiYearlyReview(review: YearlyReview, locale: Locale): Promise<AiYearlyReview | null> {
  try {
    const compact = {
      year: review.year,
      completionRate: review.completionRate,
      totalCompletions: review.totalCompletions,
      perfectDays: review.perfectDays,
      consistencyScore: review.consistencyScore,
      longestStreak: {
        name: review.longestStreak.habit.name,
        emoji: review.longestStreak.habit.emoji,
        days: review.longestStreak.days,
      },
      beforeAfter: review.beforeAfter,
      biggestImprovements: review.biggestImprovements.map((i) => ({
        name: i.habit.name,
        emoji: i.habit.emoji,
        earlyRate: i.earlyRate,
        recentRate: i.recentRate,
        improvement: i.improvement,
      })),
      goalsAchieved: review.goalsAchieved.length,
      moodAvg: review.moodAvg,
      bestMonth: review.bestMonth,
      worstMonth: review.worstMonth,
      habitsAdded: review.habitsAdded,
      topHabits: review.habitEvolutions.slice(0, 5).map((e) => ({
        name: e.habit.name,
        emoji: e.habit.emoji,
        yearRate: e.yearRate,
        trend: e.trend,
        bestStreakInYear: e.bestStreakInYear,
      })),
    };

    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': COACH_WEBHOOK_KEY },
      body: JSON.stringify({
        type: 'yearlyReview',
        context: compact,
        locale,
        deviceId: getDeviceId(),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string') return null;

    const parsed = JSON.parse(data.answer) as Record<string, unknown>;
    if (typeof parsed.yearStory !== 'string') return null;
    return {
      yearStory: String(parsed.yearStory),
      proudOf: String(parsed.proudOf ?? ''),
      transformation: String(parsed.transformation ?? ''),
      nextYear: String(parsed.nextYear ?? ''),
      closing: String(parsed.closing ?? ''),
    };
  } catch {
    return null;
  }
}
