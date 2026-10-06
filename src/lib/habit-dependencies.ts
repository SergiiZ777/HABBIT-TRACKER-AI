import { addDays, dayKey, isPaused, isScheduledOn, type Habit } from '@/lib/habits';

const WINDOW_DAYS = 60;
const MIN_SAMPLE = 6;
const MIN_LIFT = 15; // percentage points

export type HabitDependency = {
  from: Habit;
  to: Habit;
  /** B's completion rate (0-100) on days A was done. */
  withPct: number;
  /** B's completion rate (0-100) on days A was not done. */
  withoutPct: number;
  lift: number;
  sample: number;
};

/**
 * Learns how habits influence each other: for every ordered pair (A → B) compares B's
 * completion rate on days A was done vs. missed (only days both were scheduled, over the last
 * 60 days). Strong, well-sampled lifts become dependencies, strongest first.
 */
export function computeHabitDependencies(habits: Habit[], today: Date = new Date(), limit = 4): HabitDependency[] {
  const active = habits.filter((h) => !isPaused(h));
  if (active.length < 2) return [];

  const days: Date[] = [];
  for (let i = 1; i <= WINDOW_DAYS; i++) days.push(addDays(today, -i));
  const sets = new Map(active.map((h) => [h.id, new Set(h.completions)]));

  const results: HabitDependency[] = [];
  for (const a of active) {
    for (const b of active) {
      if (a.id === b.id) continue;
      let aDone = 0, bWithA = 0, aMissed = 0, bWithoutA = 0;
      for (const d of days) {
        if (!isScheduledOn(a, d) || !isScheduledOn(b, d)) continue;
        const key = dayKey(d);
        const bDone = sets.get(b.id)!.has(key);
        if (sets.get(a.id)!.has(key)) {
          aDone++;
          if (bDone) bWithA++;
        } else {
          aMissed++;
          if (bDone) bWithoutA++;
        }
      }
      if (aDone < MIN_SAMPLE || aMissed < MIN_SAMPLE) continue;
      const withPct = Math.round((bWithA / aDone) * 100);
      const withoutPct = Math.round((bWithoutA / aMissed) * 100);
      const lift = withPct - withoutPct;
      if (lift >= MIN_LIFT) results.push({ from: a, to: b, withPct, withoutPct, lift, sample: aDone + aMissed });
    }
  }

  results.sort((x, y) => y.lift - x.lift);
  // Keep one strongest driver per target habit so the list shows distinct links.
  const seen = new Set<string>();
  return results.filter((r) => !seen.has(r.to.id) && seen.add(r.to.id)).slice(0, limit);
}
