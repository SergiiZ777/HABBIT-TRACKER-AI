import type { Dictionary } from '@/lib/i18n';
import { addDays, dayKey, type Habit } from '@/lib/habits';

/**
 * A rule-based, data-driven observation — the same philosophy as motivation.ts (no AI call,
 * deterministic, instant) applied to a different signal: which day of the week a habit tends
 * to succeed or fail on. Only ever surfaced when there's real statistical signal — see the
 * thresholds below — never a fabricated pattern from sparse data.
 */
export type PatternInsight = {
  kind: 'dayPattern';
  habitId: string;
  habitEmoji: string;
  habitName: string;
  bestDow: number;
  bestRate: number;
  worstDow: number;
  worstRate: number;
};

// A weekday must have recurred this many times before its rate counts — roughly 3-4 weeks of
// habit age, short enough to be useful, long enough that one lucky/unlucky week can't swing it.
const MIN_SAMPLES = 4;
// Best vs worst day must differ by at least this many points — deliberately above the ~25pp
// granularity floor MIN_SAMPLES=4 implies, so the gap can't be a sampling artifact alone.
const MIN_GAP = 0.3;
// The best day must beat the habit's OWN overall rate by this much — stops a merely-average
// "best" day from looking like a real pattern just because one other day is catastrophic.
const MIN_ABOVE_AVERAGE = 0.15;

type DowStats = { occurrences: number; completed: number };

function dayOfWeekStats(habit: Habit, today: Date): DowStats[] {
  const stats: DowStats[] = Array.from({ length: 7 }, () => ({ occurrences: 0, completed: 0 }));
  const todayKey = dayKey(today);
  let cursor = new Date(habit.createdAt);
  let guard = 0;
  while (dayKey(cursor) <= todayKey && guard < 3660) {
    const key = dayKey(cursor);
    const bucket = stats[cursor.getDay()];
    bucket.occurrences++;
    if (habit.completions.includes(key)) bucket.completed++;
    cursor = addDays(cursor, 1);
    guard++;
  }
  return stats;
}

function habitInsight(habit: Habit, today: Date): PatternInsight | null {
  const stats = dayOfWeekStats(habit, today);
  const totalOccurrences = stats.reduce((sum, s) => sum + s.occurrences, 0);
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
  if (totalOccurrences === 0) return null;
  const overallRate = totalCompleted / totalOccurrences;

  let best: { dow: number; rate: number } | undefined;
  let worst: { dow: number; rate: number } | undefined;
  for (let dow = 0; dow < 7; dow++) {
    const { occurrences, completed } = stats[dow];
    if (occurrences < MIN_SAMPLES) continue;
    const rate = completed / occurrences;
    if (!best || rate > best.rate) best = { dow, rate };
    if (!worst || rate < worst.rate) worst = { dow, rate };
  }
  if (!best || !worst || best.dow === worst.dow) return null;
  if (best.rate - worst.rate < MIN_GAP) return null;
  if (best.rate - overallRate < MIN_ABOVE_AVERAGE) return null;

  return {
    kind: 'dayPattern',
    habitId: habit.id,
    habitEmoji: habit.emoji,
    habitName: habit.name,
    bestDow: best.dow,
    bestRate: best.rate,
    worstDow: worst.dow,
    worstRate: worst.rate,
  };
}

/** The single clearest day-of-week pattern across all habits, or null if none qualifies. */
export function computePatternInsight(habits: Habit[], today: Date = new Date()): PatternInsight | null {
  const candidates = habits
    .map((h) => ({ habit: h, insight: habitInsight(h, today) }))
    .filter((c): c is { habit: Habit; insight: PatternInsight } => c.insight !== null);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const gapDiff = b.insight.bestRate - b.insight.worstRate - (a.insight.bestRate - a.insight.worstRate);
    if (gapDiff !== 0) return gapDiff;
    return a.insight.habitId < b.insight.habitId ? -1 : 1;
  });
  return candidates[0].insight;
}

// A fixed reference Sunday, purely to turn a dow index (0=Sun..6=Sat) back into a real Date for
// Intl formatting — the same `toLocaleDateString(localeTag, {weekday: ...})` convention already
// used throughout achievements.ts and week-strip.tsx, not new Dictionary keys.
const DOW_REFERENCE = new Date(2024, 0, 7);
function dowName(dow: number, localeTag: string): string {
  return addDays(DOW_REFERENCE, dow).toLocaleDateString(localeTag, { weekday: 'long' });
}

/** Resolves a computed PatternInsight into translated headline/detail text for the active language. */
export function resolvePatternInsight(
  t: Dictionary,
  localeTag: string,
  insight: PatternInsight
): { headline: string; detail: string } {
  return {
    headline: t.insightPatternHeadline,
    detail: t.insightPatternDetail(
      insight.habitEmoji,
      insight.habitName,
      Math.round(insight.bestRate * 100),
      dowName(insight.bestDow, localeTag),
      Math.round(insight.worstRate * 100),
      dowName(insight.worstDow, localeTag)
    ),
  };
}
