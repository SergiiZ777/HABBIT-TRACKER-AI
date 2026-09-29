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
  /** Daily reminder time as local "HH:mm" (24h), e.g. "08:30". Absent = no reminder. */
  reminderTime?: string;
  /** expo-notifications scheduled-notification id backing reminderTime. Absent = not actually scheduled (off, web, or permission denied). */
  reminderNotificationId?: string;
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

/** Converts a local "HH:mm" time string into a Date (today's date, that time). */
export function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

/** Converts a Date's local time-of-day into an "HH:mm" string. */
export function dateToTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Formats a "HH:mm" time string for display, e.g. "8:00 AM" (locale-aware). */
export function formatTime(time: string): string {
  return timeToDate(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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

export function addHabit(
  input: Pick<Habit, 'name' | 'emoji' | 'color'> & Partial<Pick<Habit, 'reminderTime' | 'reminderNotificationId'>>
): Habit {
  const habit: Habit = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    completions: [],
  };
  setState({ habits: [...state.habits, habit] });
  return habit;
}

export function updateHabit(
  id: string,
  patch: Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'reminderTime' | 'reminderNotificationId'>>
) {
  setState({
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  });
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
