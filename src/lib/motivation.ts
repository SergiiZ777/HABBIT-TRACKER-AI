import { addDays, currentStreak, dayKey, type Habit } from '@/lib/habits';

export type Motivation = { emoji: string; headline: string; detail: string };

const STREAK_MILESTONES = [3, 7, 30, 100];

/** How many days since a habit was last completed (0 = today, 1 = yesterday, ...). Infinity if never. */
function daysSinceLastCompletion(habit: Habit, today: Date): number {
  if (habit.completions.length === 0) return Infinity;
  const mostRecent = [...habit.completions].sort().at(-1)!;
  let gap = 0;
  let cursor = today;
  while (dayKey(cursor) !== mostRecent) {
    gap++;
    cursor = addDays(cursor, -1);
    if (gap > 3660) return Infinity; // safety valve for corrupt/ancient data
  }
  return gap;
}

function daysOld(habit: Habit, today: Date): number {
  return Math.floor((today.getTime() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

const FALLBACK_LINES: Motivation[] = [
  { emoji: '🌤️', headline: 'Small steps compound', detail: 'Pick one habit and start now — momentum builds fast.' },
  { emoji: '🎯', headline: 'Consistency beats intensity', detail: 'Just show up today. That’s the whole job.' },
  { emoji: '⏰', headline: 'Future you is counting on this', detail: 'A minute today saves a much bigger effort later.' },
  { emoji: '🌱', headline: 'Progress, not perfection', detail: 'Any habit checked off today is a win.' },
  { emoji: '💫', headline: 'One habit at a time', detail: 'You don’t need to do everything — just the next thing.' },
];

/**
 * A short, honest, data-driven nudge — the closest thing that could be an AI headline
 * checking your data, without pretending to be one. Rule-based for now; a future
 * n8n/AI integration can generate richer copy from the same underlying signals.
 */
export function computeMotivation(habits: Habit[], today: Date = new Date()): Motivation {
  if (habits.length === 0) {
    return {
      emoji: '🌱',
      headline: 'Ready when you are',
      detail: 'Add your first habit on the Today tab to start building momentum.',
    };
  }

  const key = dayKey(today);
  const doneToday = habits.filter((h) => h.completions.includes(key)).length;

  if (doneToday === habits.length) {
    return {
      emoji: '🎉',
      headline: 'Perfect day!',
      detail: 'You completed every habit today. That’s exactly how streaks are built.',
    };
  }

  // Closest to a streak milestone, not yet done today.
  let closest: { habit: Habit; target: number; remaining: number } | undefined;
  for (const h of habits) {
    if (h.completions.includes(key)) continue;
    const streak = currentStreak(h, today);
    const target = STREAK_MILESTONES.find((m) => m > streak);
    if (target === undefined) continue;
    const remaining = target - streak;
    if (remaining === 1 && (!closest || remaining < closest.remaining)) {
      closest = { habit: h, target, remaining };
    }
  }
  if (closest) {
    return {
      emoji: '🔥',
      headline: 'So close!',
      detail: `Complete ${closest.habit.emoji} ${closest.habit.name} today and you'll hit a ${closest.target}-day streak.`,
    };
  }

  // Most-neglected habit (established for 3+ days, untouched for 3+ days).
  let neglected: { habit: Habit; gap: number } | undefined;
  for (const h of habits) {
    if (daysOld(h, today) < 3) continue;
    const gap = daysSinceLastCompletion(h, today);
    if (gap >= 3 && Number.isFinite(gap) && (!neglected || gap > neglected.gap)) {
      neglected = { habit: h, gap };
    }
  }
  if (neglected) {
    return {
      emoji: '⏳',
      headline: 'Don’t lose momentum',
      detail: `${neglected.habit.emoji} ${neglected.habit.name} hasn't been checked off in ${neglected.gap} days. A small step today keeps it alive.`,
    };
  }

  if (doneToday > 0) {
    const remaining = habits.length - doneToday;
    return {
      emoji: '💪',
      headline: 'Keep going',
      detail: `${remaining} habit${remaining === 1 ? '' : 's'} left today. You've got this.`,
    };
  }

  const dayOfYear = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(today.getFullYear(), 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  return FALLBACK_LINES[dayOfYear % FALLBACK_LINES.length];
}
