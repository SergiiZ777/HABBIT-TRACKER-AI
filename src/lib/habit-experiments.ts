import { useSyncExternalStore } from 'react';

import { applyHabitChange } from '@/lib/habit-actions';
import { addDays, dayKey, getHabits, isScheduledOn, type Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';
import Storage from '@/lib/kv-storage';

export const EXPERIMENT_DAYS = 7;
const BASELINE_DAYS = 14;
const STORAGE_KEY = 'experiments:v1';

export type Experiment = {
  id: string;
  habitId: string;
  /** Reminder time before the experiment — restored on revert. */
  fromTime: string;
  toTime: string;
  /** Local day key the experiment began (day 1). */
  startedAt: string;
  durationDays: number;
  /** Completion rate (0-100) over the 14 days before it started. */
  baselineRate: number;
  status: 'running' | 'kept' | 'reverted';
};

export type ExperimentProgress = {
  /** Day number of the experiment today (1..durationDays). */
  day: number;
  finished: boolean;
  /** Completion rate (0-100) over evaluated days so far, or null if none yet. */
  currentRate: number | null;
  delta: number | null;
  verdict: 'better' | 'worse' | 'same' | null;
};

// ---------- store ----------

function load(): Experiment[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Experiment[];
  } catch {
    // Corrupt storage: start fresh.
  }
  return [];
}

let experiments: Experiment[] = load();
const listeners = new Set<() => void>();

function setExperiments(next: Experiment[]) {
  experiments = next;
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useExperiments(): Experiment[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => experiments
  );
}

// ---------- math ----------

/** Completion rate (0-100) of `habit` over scheduled days in [from, to] inclusive; null if none. */
function rateBetween(habit: Habit, from: Date, to: Date): number | null {
  const done = new Set(habit.completions);
  let scheduled = 0;
  let completed = 0;
  for (let d = from; dayKey(d) <= dayKey(to); d = addDays(d, 1)) {
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    if (done.has(dayKey(d))) completed++;
  }
  return scheduled === 0 ? null : Math.round((completed / scheduled) * 100);
}

function parseDay(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function computeExperimentProgress(exp: Experiment, habit: Habit, today: Date = new Date()): ExperimentProgress {
  const start = parseDay(exp.startedAt);
  const elapsed = Math.round((parseDay(dayKey(today)).getTime() - start.getTime()) / 86400000);
  const day = Math.min(exp.durationDays, Math.max(1, elapsed + 1));
  const finished = elapsed >= exp.durationDays;

  // Only fully elapsed days count (today is still in progress).
  const lastEvaluated = addDays(start, Math.min(elapsed, exp.durationDays) - 1);
  const currentRate = elapsed >= 1 ? rateBetween(habit, start, lastEvaluated) : null;
  const delta = currentRate === null ? null : currentRate - exp.baselineRate;
  const verdict = delta === null ? null : delta >= 10 ? 'better' : delta <= -10 ? 'worse' : 'same';
  return { day, finished, currentRate, delta, verdict };
}

// ---------- actions ----------

export function experimentForHabit(habitId: string): Experiment | undefined {
  return experiments.find((e) => e.habitId === habitId && e.status === 'running');
}

/** Temporarily moves a habit's reminder time for a trial period, remembering the old time. */
export async function startExperiment(habitId: string, toTime: string, t: Dictionary): Promise<boolean> {
  const habit = getHabits().find((h) => h.id === habitId);
  if (!habit || !habit.reminderTime || experimentForHabit(habitId)) return false;

  const today = new Date();
  const baselineRate = rateBetween(habit, addDays(today, -BASELINE_DAYS), addDays(today, -1)) ?? 0;
  await applyHabitChange(habitId, { reminderTime: toTime }, t);
  setExperiments([
    ...experiments,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      habitId,
      fromTime: habit.reminderTime,
      toTime,
      startedAt: dayKey(today),
      durationDays: EXPERIMENT_DAYS,
      baselineRate,
      status: 'running',
    },
  ]);
  return true;
}

/** Ends an experiment: keep the new time, or revert to the original one. */
export async function resolveExperiment(id: string, keep: boolean, t: Dictionary): Promise<void> {
  const exp = experiments.find((e) => e.id === id);
  if (!exp) return;
  if (!keep) await applyHabitChange(exp.habitId, { reminderTime: exp.fromTime }, t);
  setExperiments(experiments.map((e) => (e.id === id ? { ...e, status: keep ? 'kept' : 'reverted' } : e)));
}
