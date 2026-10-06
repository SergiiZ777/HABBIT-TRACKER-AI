import { getDeviceId } from '@/lib/backup';
import { addDays, currentStreak, dayKey, isScheduledOn, type Habit } from '@/lib/habits';
import type { Locale } from '@/lib/i18n';
import { getMoodForDay } from '@/lib/mood';

const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c33477830';
const COACH_WEBHOOK_KEY = process.env.EXPO_PUBLIC_COACH_KEY ?? '';

export type HabitWeekStats = {
  habit: Habit;
  scheduled: number;
  completed: number;
  rate: number;
  streak: number;
};

export type HabitPair = {
  a: { emoji: string; name: string };
  b: { emoji: string; name: string };
  togetherDays: number;
  totalDays: number;
};

export type WeeklyReview = {
  completionRate: number;
  totalDone: number;
  totalScheduled: number;
  perfectDays: number;
  perHabit: HabitWeekStats[];
  bestHabits: HabitWeekStats[];
  worstHabits: HabitWeekStats[];
  missedHabits: HabitWeekStats[];
  trend: { thisWeek: number; lastWeek: number; delta: number };
  correlations: HabitPair[];
  dailyRates: { key: string; rate: number; done: number; total: number }[];
  moodAvg: { energy: number; mood: number } | null;
  dateRange: { start: string; end: string };
};

function weekDays(today: Date): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  return days;
}

function computeRange(habits: Habit[], days: Date[]) {
  const completionSet = new Map<string, Set<string>>();
  for (const h of habits) completionSet.set(h.id, new Set(h.completions));

  let totalDone = 0;
  let totalScheduled = 0;
  let perfectDays = 0;
  const perHabitMap = new Map<string, { scheduled: number; completed: number }>();
  const dailyRates: { key: string; rate: number; done: number; total: number }[] = [];
  const dailyCompletions = new Map<string, Set<string>>();

  for (const h of habits) perHabitMap.set(h.id, { scheduled: 0, completed: 0 });

  for (const day of days) {
    const key = dayKey(day);
    let dayDone = 0;
    let dayTotal = 0;
    const completedIds = new Set<string>();

    for (const h of habits) {
      if (!isScheduledOn(h, day)) continue;
      dayTotal++;
      const entry = perHabitMap.get(h.id)!;
      entry.scheduled++;
      if (completionSet.get(h.id)!.has(key)) {
        dayDone++;
        entry.completed++;
        completedIds.add(h.id);
      }
    }

    totalDone += dayDone;
    totalScheduled += dayTotal;
    if (dayTotal > 0 && dayDone === dayTotal) perfectDays++;
    dailyRates.push({ key, rate: dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0, done: dayDone, total: dayTotal });
    dailyCompletions.set(key, completedIds);
  }

  return { totalDone, totalScheduled, perfectDays, perHabitMap, dailyRates, dailyCompletions };
}

export function computeWeeklyReview(habits: Habit[], today: Date = new Date()): WeeklyReview {
  const days = weekDays(today);
  const { totalDone, totalScheduled, perfectDays, perHabitMap, dailyRates, dailyCompletions } = computeRange(habits, days);

  const completionRate = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;

  const perHabit: HabitWeekStats[] = habits
    .map((h) => {
      const stats = perHabitMap.get(h.id)!;
      return {
        habit: h,
        scheduled: stats.scheduled,
        completed: stats.completed,
        rate: stats.scheduled > 0 ? Math.round((stats.completed / stats.scheduled) * 100) : 0,
        streak: currentStreak(h, today),
      };
    })
    .filter((s) => s.scheduled > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);

  const bestHabits = perHabit.filter((s) => s.rate > 0).slice(0, 3);
  const worstHabits = [...perHabit].sort((a, b) => a.rate - b.rate || a.completed - b.completed).filter((s) => s.rate < 100).slice(0, 3);
  const missedHabits = perHabit.filter((s) => s.rate === 0);

  // Trend: compare this week vs last week
  const lastWeekDays = weekDays(addDays(today, -7));
  const lastWeekRange = computeRange(habits, lastWeekDays);
  const lastWeekRate = lastWeekRange.totalScheduled > 0
    ? Math.round((lastWeekRange.totalDone / lastWeekRange.totalScheduled) * 100)
    : 0;

  // Habit correlations: co-completion pairs
  const correlations: HabitPair[] = [];
  const scheduled = perHabit.filter((s) => s.scheduled >= 3);
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i];
      const b = scheduled[j];
      let together = 0;
      let bothScheduled = 0;
      for (const day of days) {
        const key = dayKey(day);
        const aOn = isScheduledOn(a.habit, day);
        const bOn = isScheduledOn(b.habit, day);
        if (!aOn || !bOn) continue;
        bothScheduled++;
        const ids = dailyCompletions.get(key)!;
        if (ids.has(a.habit.id) && ids.has(b.habit.id)) together++;
      }
      if (bothScheduled >= 3 && together >= 2) {
        correlations.push({
          a: { emoji: a.habit.emoji, name: a.habit.name },
          b: { emoji: b.habit.emoji, name: b.habit.name },
          togetherDays: together,
          totalDays: bothScheduled,
        });
      }
    }
  }
  correlations.sort((a, b) => (b.togetherDays / b.totalDays) - (a.togetherDays / a.totalDays));

  // Mood average
  let moodAvg: { energy: number; mood: number } | null = null;
  let moodCount = 0;
  let energySum = 0;
  let moodSum = 0;
  for (const day of days) {
    const m = getMoodForDay(dayKey(day));
    if (m && m.energy > 0 && m.mood > 0) {
      energySum += m.energy;
      moodSum += m.mood;
      moodCount++;
    }
  }
  if (moodCount > 0) {
    moodAvg = { energy: Math.round((energySum / moodCount) * 10) / 10, mood: Math.round((moodSum / moodCount) * 10) / 10 };
  }

  return {
    completionRate,
    totalDone,
    totalScheduled,
    perfectDays,
    perHabit,
    bestHabits,
    worstHabits,
    missedHabits,
    trend: { thisWeek: completionRate, lastWeek: lastWeekRate, delta: completionRate - lastWeekRate },
    correlations: correlations.slice(0, 3),
    dailyRates,
    moodAvg,
    dateRange: { start: dayKey(days[0]), end: dayKey(days[6]) },
  };
}

export type AiWeeklyReview = {
  wellDone: string;
  failed: string;
  whyFailed: string;
  nextWeek: string;
};

export async function fetchAiReview(review: WeeklyReview, locale: Locale): Promise<AiWeeklyReview | null> {
  try {
    const compact = {
      completionRate: review.completionRate,
      totalDone: review.totalDone,
      totalScheduled: review.totalScheduled,
      perfectDays: review.perfectDays,
      trend: review.trend,
      best: review.bestHabits.map((s) => ({ name: s.habit.name, emoji: s.habit.emoji, rate: s.rate })),
      worst: review.worstHabits.map((s) => ({ name: s.habit.name, emoji: s.habit.emoji, rate: s.rate })),
      missed: review.missedHabits.map((s) => ({ name: s.habit.name, emoji: s.habit.emoji })),
      moodAvg: review.moodAvg,
      correlations: review.correlations.map((c) => ({
        a: `${c.a.emoji} ${c.a.name}`,
        b: `${c.b.emoji} ${c.b.name}`,
        days: c.togetherDays,
      })),
    };

    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': COACH_WEBHOOK_KEY },
      body: JSON.stringify({
        type: 'weeklyReview',
        context: compact,
        locale,
        deviceId: getDeviceId(),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string') return null;

    const parsed = JSON.parse(data.answer) as Record<string, unknown>;
    if (typeof parsed.wellDone !== 'string') return null;
    return {
      wellDone: String(parsed.wellDone),
      failed: String(parsed.failed ?? ''),
      whyFailed: String(parsed.whyFailed ?? ''),
      nextWeek: String(parsed.nextWeek ?? ''),
    };
  } catch {
    return null;
  }
}
