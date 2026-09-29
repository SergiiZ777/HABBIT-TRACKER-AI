import type { Dictionary } from '@/lib/i18n';
import { addDays, currentStreak, dayKey, type Habit } from '@/lib/habits';

export type BadgeId =
  | 'first-step'
  | 'streak-3'
  | 'streak-7'
  | 'streak-30'
  | 'streak-100'
  | 'completions-10'
  | 'completions-100'
  | 'completions-500'
  | 'perfect-day'
  | 'perfect-week'
  | 'five-habits';

export type Badge = {
  id: BadgeId;
  emoji: string;
  unlocked: boolean;
  /** Present for milestone badges that can be shown "in progress" while locked. Display text
   * (title/description) is looked up from the i18n dictionary by id, not stored here. */
  progress?: { current: number; target: number };
};

export type DashboardStats = {
  bestStreak: number;
  totalCompletions: number;
  activeHabitsCount: number;
  perfectDaysCount: number;
};

/** Habits that existed by local day `key` — a habit "exists" once its createdAt's local day is <= key. */
function existingHabitsOn(habits: Habit[], key: string): Habit[] {
  return habits.filter((h) => dayKey(new Date(h.createdAt)) <= key);
}

/**
 * Every local day (as a "YYYY-MM-DD" key) on which every habit that existed by that day
 * was completed. A habit created mid-streak doesn't retroactively break earlier perfect
 * days. Scans from the earliest habit's creation day through today.
 */
function perfectDayKeys(habits: Habit[], today: Date): Set<string> {
  const perfect = new Set<string>();
  if (habits.length === 0) return perfect;

  const earliest = habits.reduce(
    (min, h) => (h.createdAt < min ? h.createdAt : min),
    habits[0].createdAt
  );

  let cursor = new Date(earliest);
  const end = today;
  // Cap the scan so a very old habit can't make this loop unbounded.
  let guard = 0;
  while (dayKey(cursor) <= dayKey(end) && guard < 3660) {
    const key = dayKey(cursor);
    const existing = existingHabitsOn(habits, key);
    if (existing.length > 0 && existing.every((h) => h.completions.includes(key))) {
      perfect.add(key);
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  return perfect;
}

/** Per-day existing/completed counts for the last `days` days, oldest first, ending today. */
function dailyRange(habits: Habit[], days: number, today: Date): { key: string; done: number; total: number }[] {
  const result: { key: string; done: number; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(addDays(today, -i));
    const existing = existingHabitsOn(habits, key);
    const done = existing.filter((h) => h.completions.includes(key)).length;
    result.push({ key, done, total: existing.length });
  }
  return result;
}

/** Length of the longest run of consecutive dates present in `days`. */
function longestConsecutiveRun(days: Set<string>): number {
  let longest = 0;
  for (const key of days) {
    // Only start counting from the beginning of a run to keep this O(n).
    const prev = dayKey(addDays(new Date(key), -1));
    if (days.has(prev)) continue;
    let run = 1;
    let cursor = new Date(key);
    while (days.has(dayKey(addDays(cursor, 1)))) {
      run++;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

export function computeStats(habits: Habit[], today: Date = new Date()): DashboardStats {
  const bestStreak = habits.reduce((max, h) => Math.max(max, currentStreak(h, today)), 0);
  const totalCompletions = habits.reduce((sum, h) => sum + h.completions.length, 0);
  const perfectDays = perfectDayKeys(habits, today);

  return {
    bestStreak,
    totalCompletions,
    activeHabitsCount: habits.length,
    perfectDaysCount: perfectDays.size,
  };
}

export type TrendRange = 'week' | 'month';

export type TrendPoint = { key: string; label: string; rate: number; done: number; total: number };

export type RangeSummary = { averageRate: number; totalCompletions: number; perfectDays: number };

const WEEK_DAYS = 7;
const MONTH_DAYS = 28;
const MONTH_BUCKETS = 4;

/** One bar per day for 'week' (last 7 days), or one bar per 7-day bucket for 'month' (last 4 weeks). */
export function computeTrend(
  habits: Habit[],
  range: TrendRange,
  today: Date = new Date(),
  localeTag: string = 'en-US'
): TrendPoint[] {
  if (range === 'week') {
    return dailyRange(habits, WEEK_DAYS, today).map(({ key, done, total }) => ({
      key,
      label: new Date(`${key}T12:00:00`).toLocaleDateString(localeTag, { weekday: 'narrow' }),
      rate: total ? done / total : 0,
      done,
      total,
    }));
  }

  const days = dailyRange(habits, MONTH_DAYS, today);
  const points: TrendPoint[] = [];
  for (let b = 0; b < MONTH_BUCKETS; b++) {
    const bucket = days.slice(b * WEEK_DAYS, b * WEEK_DAYS + WEEK_DAYS);
    const done = bucket.reduce((sum, d) => sum + d.done, 0);
    const total = bucket.reduce((sum, d) => sum + d.total, 0);
    const lastKey = bucket[bucket.length - 1].key;
    points.push({
      key: lastKey,
      label: new Date(`${lastKey}T12:00:00`).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }),
      rate: total ? done / total : 0,
      done,
      total,
    });
  }
  return points;
}

/** Aggregate completion stats over the selected range (last 7 or 28 days). */
export function computeRangeSummary(habits: Habit[], range: TrendRange, today: Date = new Date()): RangeSummary {
  const days = dailyRange(habits, range === 'week' ? WEEK_DAYS : MONTH_DAYS, today);
  const totalCompletions = days.reduce((sum, d) => sum + d.done, 0);
  const totalPossible = days.reduce((sum, d) => sum + d.total, 0);
  const perfectDays = days.filter((d) => d.total > 0 && d.done === d.total).length;

  return {
    averageRate: totalPossible ? totalCompletions / totalPossible : 0,
    totalCompletions,
    perfectDays,
  };
}

export function computeBadges(habits: Habit[], today: Date = new Date()): Badge[] {
  const stats = computeStats(habits, today);
  const perfectDays = perfectDayKeys(habits, today);
  const longestPerfectRun = longestConsecutiveRun(perfectDays);

  const milestone = (id: BadgeId, emoji: string, current: number, target: number): Badge => ({
    id,
    emoji,
    unlocked: current >= target,
    progress: { current: Math.min(current, target), target },
  });

  return [
    { id: 'first-step', emoji: '🌱', unlocked: stats.totalCompletions >= 1 },
    milestone('streak-3', '🔥', stats.bestStreak, 3),
    milestone('streak-7', '🔥', stats.bestStreak, 7),
    milestone('streak-30', '🔥', stats.bestStreak, 30),
    milestone('streak-100', '💯', stats.bestStreak, 100),
    milestone('completions-10', '⭐', stats.totalCompletions, 10),
    milestone('completions-100', '🌟', stats.totalCompletions, 100),
    milestone('completions-500', '🏆', stats.totalCompletions, 500),
    { id: 'perfect-day', emoji: '☀️', unlocked: stats.perfectDaysCount >= 1 },
    {
      id: 'perfect-week',
      emoji: '🗓️',
      unlocked: longestPerfectRun >= 7,
      progress: { current: Math.min(longestPerfectRun, 7), target: 7 },
    },
    milestone('five-habits', '🧩', habits.length, 5),
  ];
}

/** Looks up a badge's translated title from the current dictionary. */
export function badgeTitle(t: Dictionary, id: BadgeId): string {
  switch (id) {
    case 'first-step':
      return t.badgeTitleFirstStep;
    case 'streak-3':
      return t.badgeTitleStreak3;
    case 'streak-7':
      return t.badgeTitleStreak7;
    case 'streak-30':
      return t.badgeTitleStreak30;
    case 'streak-100':
      return t.badgeTitleStreak100;
    case 'completions-10':
      return t.badgeTitleCompletions10;
    case 'completions-100':
      return t.badgeTitleCompletions100;
    case 'completions-500':
      return t.badgeTitleCompletions500;
    case 'perfect-day':
      return t.badgeTitlePerfectDay;
    case 'perfect-week':
      return t.badgeTitlePerfectWeek;
    case 'five-habits':
      return t.badgeTitleFiveHabits;
  }
}

/** Looks up a badge's translated description from the current dictionary, filling in the
 * milestone number (streak length / completion count) for badges that have one. */
export function badgeDescription(t: Dictionary, badge: Badge): string {
  switch (badge.id) {
    case 'first-step':
      return t.badgeDescFirstStep;
    case 'streak-3':
    case 'streak-7':
    case 'streak-30':
    case 'streak-100':
      return t.badgeDescStreak(badge.progress!.target);
    case 'completions-10':
    case 'completions-100':
    case 'completions-500':
      return t.badgeDescCompletions(badge.progress!.target);
    case 'perfect-day':
      return t.badgeDescPerfectDay;
    case 'perfect-week':
      return t.badgeDescPerfectWeek;
    case 'five-habits':
      return t.badgeDescFiveHabits;
  }
}
