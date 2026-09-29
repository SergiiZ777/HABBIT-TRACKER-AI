import { addDays, currentStreak, dayKey, type Habit } from '@/lib/habits';

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  /** Present for milestone badges that can be shown "in progress" while locked. */
  progress?: { current: number; target: number };
};

export type DashboardStats = {
  bestStreak: number;
  totalCompletions: number;
  activeHabitsCount: number;
  perfectDaysCount: number;
};

/**
 * Every local day (as a "YYYY-MM-DD" key) on which every habit that existed by that day
 * was completed. A habit "existed" on day D once its createdAt's local day is <= D, so a
 * habit created mid-streak doesn't retroactively break earlier perfect days.
 * Scans from the earliest habit's creation day through today.
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
    const existing = habits.filter((h) => dayKey(new Date(h.createdAt)) <= key);
    if (existing.length > 0 && existing.every((h) => h.completions.includes(key))) {
      perfect.add(key);
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  return perfect;
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

export function computeBadges(habits: Habit[], today: Date = new Date()): Badge[] {
  const stats = computeStats(habits, today);
  const perfectDays = perfectDayKeys(habits, today);
  const longestPerfectRun = longestConsecutiveRun(perfectDays);

  const milestone = (
    id: string,
    emoji: string,
    title: string,
    description: string,
    current: number,
    target: number
  ): Badge => ({
    id,
    emoji,
    title,
    description,
    unlocked: current >= target,
    progress: { current: Math.min(current, target), target },
  });

  return [
    {
      id: 'first-step',
      emoji: '🌱',
      title: 'First Step',
      description: 'Complete a habit for the first time',
      unlocked: stats.totalCompletions >= 1,
    },
    milestone('streak-3', '🔥', '3-Day Streak', 'Reach a 3-day streak on any habit', stats.bestStreak, 3),
    milestone('streak-7', '🔥', 'Week Warrior', 'Reach a 7-day streak on any habit', stats.bestStreak, 7),
    milestone(
      'streak-30',
      '🔥',
      'Consistency Master',
      'Reach a 30-day streak on any habit',
      stats.bestStreak,
      30
    ),
    milestone('streak-100', '💯', 'Centurion', 'Reach a 100-day streak on any habit', stats.bestStreak, 100),
    milestone('completions-10', '⭐', 'Getting Started', 'Log 10 total completions', stats.totalCompletions, 10),
    milestone('completions-100', '🌟', 'Habit Builder', 'Log 100 total completions', stats.totalCompletions, 100),
    milestone('completions-500', '🏆', 'Dedicated', 'Log 500 total completions', stats.totalCompletions, 500),
    {
      id: 'perfect-day',
      emoji: '☀️',
      title: 'Perfect Day',
      description: 'Complete every habit on the same day',
      unlocked: stats.perfectDaysCount >= 1,
    },
    {
      id: 'perfect-week',
      emoji: '🗓️',
      title: 'Perfect Week',
      description: '7 consecutive perfect days',
      unlocked: longestPerfectRun >= 7,
      progress: { current: Math.min(longestPerfectRun, 7), target: 7 },
    },
    milestone('five-habits', '🧩', 'Habit Collector', 'Create 5 or more habits', habits.length, 5),
  ];
}
