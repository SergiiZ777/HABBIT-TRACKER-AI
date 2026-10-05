import type { Dictionary } from '@/lib/i18n';
import { addDays, currentStreak, dayKey, isScheduledOn, type Habit } from '@/lib/habits';

/**
 * A short, honest, data-driven nudge — the closest thing that could be an AI headline
 * checking your data, without pretending to be one. Rule-based for now; a future n8n/AI
 * integration can generate richer copy from the same underlying signals.
 *
 * Returns a tagged description of *which* situation applies, not literal text — the caller
 * resolves it to translated headline/detail strings via `resolveMotivation`, so the same
 * computation works in any of the app's languages.
 */
export type Motivation =
  | { emoji: string; kind: 'ready' }
  | { emoji: string; kind: 'perfect' }
  | { emoji: string; kind: 'close'; habitEmoji: string; habitName: string; target: number }
  | { emoji: string; kind: 'neglected'; habitEmoji: string; habitName: string; gap: number }
  | { emoji: string; kind: 'keepGoing'; remaining: number }
  | { emoji: string; kind: 'fallback'; index: number };

const STREAK_MILESTONES = [3, 7, 30, 100];
const FALLBACK_COUNT = 5;

/** How many *scheduled* days since a habit was last completed (0 = today, 1 = its previous scheduled day, ...). Infinity if never. */
function daysSinceLastCompletion(habit: Habit, today: Date): number {
  if (habit.completions.length === 0) return Infinity;
  const mostRecent = [...habit.completions].sort().at(-1)!;
  let gap = 0;
  let cursor = today;
  let guard = 0;
  while (dayKey(cursor) !== mostRecent && guard < 3660) {
    cursor = addDays(cursor, -1);
    if (isScheduledOn(habit, cursor)) gap++;
    guard++;
  }
  if (guard >= 3660) return Infinity; // safety valve for corrupt/ancient data
  return gap;
}

function daysOld(habit: Habit, today: Date): number {
  return Math.floor((today.getTime() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function computeMotivation(habits: Habit[], today: Date = new Date()): Motivation {
  if (habits.length === 0) {
    return { emoji: '🌱', kind: 'ready' };
  }

  const key = dayKey(today);
  const scheduledToday = habits.filter((h) => isScheduledOn(h, today));
  const doneToday = scheduledToday.filter((h) => h.completions.includes(key)).length;

  if (doneToday === scheduledToday.length) {
    return { emoji: '🎉', kind: 'perfect' };
  }

  // Closest to a streak milestone, not yet done today — only among today's actually-due habits,
  // since there's nothing actionable about a habit that isn't scheduled today.
  let closest: { habit: Habit; target: number; remaining: number } | undefined;
  for (const h of scheduledToday) {
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
    return { emoji: '🔥', kind: 'close', habitEmoji: closest.habit.emoji, habitName: closest.habit.name, target: closest.target };
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
      kind: 'neglected',
      habitEmoji: neglected.habit.emoji,
      habitName: neglected.habit.name,
      gap: neglected.gap,
    };
  }

  if (doneToday > 0) {
    return { emoji: '💪', kind: 'keepGoing', remaining: scheduledToday.length - doneToday };
  }

  const dayOfYear = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(today.getFullYear(), 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  return { emoji: ['🌤️', '🎯', '⏰', '🌱', '💫'][dayOfYear % FALLBACK_COUNT], kind: 'fallback', index: dayOfYear % FALLBACK_COUNT };
}

/** Resolves a computed Motivation into translated headline/detail text for the active language. */
export function resolveMotivation(t: Dictionary, m: Motivation): { headline: string; detail: string } {
  switch (m.kind) {
    case 'ready':
      return { headline: t.motivReadyHeadline, detail: t.motivReadyDetail };
    case 'perfect':
      return { headline: t.motivPerfectHeadline, detail: t.motivPerfectDetail };
    case 'close':
      return { headline: t.motivCloseHeadline, detail: t.motivCloseDetail(m.habitEmoji, m.habitName, m.target) };
    case 'neglected':
      return { headline: t.motivNeglectedHeadline, detail: t.motivNeglectedDetail(m.habitEmoji, m.habitName, m.gap) };
    case 'keepGoing':
      return { headline: t.motivKeepGoingHeadline, detail: t.motivKeepGoingDetail(m.remaining) };
    case 'fallback':
      return t.motivFallback[m.index];
  }
}
