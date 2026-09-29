import { useSyncExternalStore } from 'react';

import Storage from '@/lib/kv-storage';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
  /** Days the habit was completed, as local YYYY-MM-DD keys. */
  completions: string[];
};

type State = { habits: Habit[] };

const STORAGE_KEY = 'habits:v1';

// ---------- dates ----------

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Consecutive completed days ending today (or yesterday, so a streak isn't "lost" before you've had a chance today). */
export function currentStreak(habit: Habit, today: Date = new Date()): number {
  const done = new Set(habit.completions);
  let cursor = done.has(dayKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// ---------- store ----------

function load(): State {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // Corrupt or unavailable storage: start fresh rather than crash.
  }
  return { habits: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHabits(): Habit[] {
  return useSyncExternalStore(subscribe, () => state.habits);
}

export function addHabit(input: Pick<Habit, 'name' | 'emoji' | 'color'>) {
  const habit: Habit = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    completions: [],
  };
  setState({ habits: [...state.habits, habit] });
}

export function deleteHabit(id: string) {
  setState({ habits: state.habits.filter((h) => h.id !== id) });
}

export function toggleCompletion(id: string, day: string = dayKey()) {
  setState({
    habits: state.habits.map((h) => {
      if (h.id !== id) return h;
      const done = h.completions.includes(day);
      return {
        ...h,
        completions: done ? h.completions.filter((d) => d !== day) : [...h.completions, day],
      };
    }),
  });
}
