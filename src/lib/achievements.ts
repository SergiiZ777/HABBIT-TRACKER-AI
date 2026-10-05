import type { Dictionary } from '@/lib/i18n';
import { addDays, currentStreak, dayKey, isScheduledOn, type Habit } from '@/lib/habits';

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

/** Habits due on local day `key` — exist by then (createdAt's local day <= key) AND scheduled that weekday. */
function existingHabitsOn(habits: Habit[], key: string): Habit[] {
  const date = new Date(`${key}T12:00:00`);
  return habits.filter((h) => dayKey(new Date(h.createdAt)) <= key && isScheduledOn(h, date));
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

export type TrendRange = 'week' | 'month' | 'year';

export type TrendPoint = {
  key: string;
  /** Compact axis label (a weekday letter, a bare day-of-month number, or a short month name). */
  label: string;
  /** Full date (or month), for a tapped/selected point's readout. */
  fullLabel: string;
  rate: number;
  done: number;
  total: number;
};

export type RangeSummary = { averageRate: number; totalCompletions: number; perfectDays: number };

const WEEK_DAYS = 7;
const MONTH_DAYS = 28;
const YEAR_MONTHS = 12;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Number of days spanning the last 12 full calendar months through today (inclusive). */
function yearDaySpan(today: Date): number {
  const startMonth = new Date(today.getFullYear(), today.getMonth() - (YEAR_MONTHS - 1), 1);
  // Normalize to midnight first — subtracting `today`'s time-of-day from startMonth's midnight
  // would otherwise round the span up by an extra day depending on what time it is right now.
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((todayMidnight.getTime() - startMonth.getTime()) / 86400000) + 1;
}

function rangeDayCount(range: TrendRange, today: Date): number {
  if (range === 'week') return WEEK_DAYS;
  if (range === 'month') return MONTH_DAYS;
  return yearDaySpan(today);
}

/**
 * One bar per day for 'week' (7 bars) and 'month' (28 bars) so every day's rate is directly
 * visible. 'year' aggregates into one bar per calendar month (12 bars) — 365 individual daily
 * bars would be illegible on a phone-width chart.
 */
export function computeTrend(
  habits: Habit[],
  range: TrendRange,
  today: Date = new Date(),
  localeTag: string = 'en-US'
): TrendPoint[] {
  const days = dailyRange(habits, rangeDayCount(range, today), today);

  if (range !== 'year') {
    return days.map(({ key, done, total }) => {
      const date = new Date(`${key}T12:00:00`);
      return {
        key,
        label: date.toLocaleDateString(localeTag, range === 'week' ? { weekday: 'narrow' } : { day: 'numeric' }),
        fullLabel: date.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' }),
        rate: total ? done / total : 0,
        done,
        total,
      };
    });
  }

  const buckets = new Map<string, { date: Date; done: number; total: number }>();
  for (const d of days) {
    const date = new Date(`${d.key}T12:00:00`);
    const key = monthKey(date);
    const bucket = buckets.get(key) ?? { date, done: 0, total: 0 };
    bucket.done += d.done;
    bucket.total += d.total;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.date.toLocaleDateString(localeTag, { month: 'short' }),
    fullLabel: b.date.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' }),
    rate: b.total ? b.done / b.total : 0,
    done: b.done,
    total: b.total,
  }));
}

/** Aggregate completion stats over the selected range (last 7, 28, or ~365 days). */
export function computeRangeSummary(habits: Habit[], range: TrendRange, today: Date = new Date()): RangeSummary {
  const days = dailyRange(habits, rangeDayCount(range, today), today);
  const totalCompletions = days.reduce((sum, d) => sum + d.done, 0);
  const totalPossible = days.reduce((sum, d) => sum + d.total, 0);
  const perfectDays = days.filter((d) => d.total > 0 && d.done === d.total).length;

  return {
    averageRate: totalPossible ? totalCompletions / totalPossible : 0,
    totalCompletions,
    perfectDays,
  };
}

export type HeatmapCell = { key: string; rate: number; done: number; total: number; inactive: boolean };
export type HeatmapColumn = { cells: HeatmapCell[]; monthLabel: string | null };

/**
 * A GitHub-style contribution grid for the year view: the current calendar year, January
 * through December, as weeks (columns) x 7 days (Mon..Sun rows) — always in Jan-to-Dec order,
 * regardless of today's date. An `inactive` cell falls before Jan 1, after today, or after Dec
 * 31 (padding at either end so full weeks line up) — rendered empty, never interactive.
 */
export function computeYearHeatmap(
  habits: Habit[],
  today: Date = new Date(),
  localeTag: string = 'en-US'
): HeatmapColumn[] {
  const year = today.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const todayKey = dayKey(today);
  const jan1Key = dayKey(jan1);
  const dec31Key = dayKey(dec31);

  const startDow = (jan1.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const startMonday = addDays(jan1, -startDow);
  const endDow = (dec31.getDay() + 6) % 7;
  const totalDays = Math.round((addDays(dec31, 6 - endDow).getTime() - startMonday.getTime()) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  const columns: HeatmapColumn[] = [];
  let prevMonthKey = '';
  for (let c = 0; c < weeks; c++) {
    const cells: HeatmapCell[] = [];
    for (let r = 0; r < 7; r++) {
      const date = addDays(startMonday, c * 7 + r);
      const key = dayKey(date);
      if (key < jan1Key || key > todayKey || key > dec31Key) {
        cells.push({ key, rate: 0, done: 0, total: 0, inactive: true });
        continue;
      }
      const existing = existingHabitsOn(habits, key);
      const done = existing.filter((h) => h.completions.includes(key)).length;
      cells.push({ key, rate: existing.length ? done / existing.length : 0, done, total: existing.length, inactive: false });
    }
    const firstDate = addDays(startMonday, c * 7);
    const mk = monthKey(firstDate.getFullYear() === year ? firstDate : jan1);
    columns.push({ cells, monthLabel: mk !== prevMonthKey ? (firstDate.getFullYear() === year ? firstDate : jan1).toLocaleDateString(localeTag, { month: 'short' }) : null });
    prevMonthKey = mk;
  }
  return columns;
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
