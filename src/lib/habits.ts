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
  /** @deprecated superseded by reminderNotificationIds — kept only to read habits stored before that field existed. */
  reminderNotificationId?: string;
  /** expo-notifications scheduled-notification ids backing reminderTime — one per scheduled weekday (a single trigger can't target multiple weekdays), or one id if every day. Absent = not actually scheduled (off, web, or permission denied). */
  reminderNotificationIds?: string[];
  /** Days of the week this habit is tracked on (0=Sun..6=Sat, matches Date#getDay()). Absent = every day. */
  scheduledDays?: number[];
  /** High-priority habits sort first and are weighted in recommendations. Absent = normal. */
  priority?: 'high' | 'normal';
};

/** Every reminder notification id for a habit, reading both the current and legacy field. */
export function habitReminderNotificationIds(habit: Habit): string[] {
  return habit.reminderNotificationIds ?? (habit.reminderNotificationId ? [habit.reminderNotificationId] : []);
}

/** Whether `habit` is tracked on `date`'s weekday — undefined `scheduledDays` means every day. */
export function isScheduledOn(habit: Habit, date: Date): boolean {
  return !habit.scheduledDays || habit.scheduledDays.includes(date.getDay());
}

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
export function formatTime(time: string, localeTag?: string): string {
  return timeToDate(time).toLocaleTimeString(localeTag, { hour: 'numeric', minute: '2-digit' });
}

// A fixed reference Sunday, purely to turn a dow index (0=Sun..6=Sat) back into a real Date for
// Intl formatting — reused wherever a weekday name/letter is needed, instead of new Dictionary
// keys per locale (the convention already established for day labels throughout this app).
const DOW_REFERENCE = new Date(2024, 0, 7);
export function weekdayLabel(dow: number, localeTag: string, format: 'long' | 'short' | 'narrow' = 'long'): string {
  return addDays(DOW_REFERENCE, dow).toLocaleDateString(localeTag, { weekday: format });
}

/**
 * Consecutive completed *scheduled* days ending today (or yesterday, so a streak isn't "lost"
 * before you've had a chance today) — a day the habit isn't scheduled on is skipped entirely
 * (neither breaks nor extends the streak), not treated as a miss.
 */
export function currentStreak(habit: Habit, today: Date = new Date()): number {
  const done = new Set(habit.completions);
  const todayCounts = isScheduledOn(habit, today) && done.has(dayKey(today));
  let cursor = todayCounts ? today : addDays(today, -1);
  let streak = 0;
  let guard = 0;
  while (guard < 3660) {
    if (isScheduledOn(habit, cursor)) {
      if (!done.has(dayKey(cursor))) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
    guard++;
  }
  return streak;
}

/** Returns a milestone color when the streak hits a notable threshold, or null. */
export function streakMilestoneColor(streak: number): string | null {
  if (streak >= 100) return '#FFD700';
  if (streak >= 30) return '#FF6B35';
  if (streak >= 7) return '#F2994A';
  if (streak >= 3) return '#E0A800';
  return null;
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

/** Current habits, outside of React (e.g. for a background subscriber like backup.ts). */
export function getHabits(): Habit[] {
  return state.habits;
}

/**
 * Registers a plain (non-React) listener that fires on every habits change, in addition to
 * `useHabits`'s React subscribers — used by backup.ts to trigger an auto-backup push. Returns
 * an unsubscribe function.
 */
export function onHabitsChange(listener: () => void): () => void {
  return subscribe(listener);
}

/**
 * Replaces the entire habits list wholesale — used only by the restore-from-backup flow, and
 * only ever called when the local list is empty (enforced by the caller, not here).
 */
export function restoreHabits(habits: Habit[]) {
  setState({ habits });
}

export function addHabit(
  input: Pick<Habit, 'name' | 'emoji' | 'color'> &
    Partial<Pick<Habit, 'reminderTime' | 'reminderNotificationIds' | 'scheduledDays' | 'priority'>>
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
  patch: Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'reminderTime' | 'reminderNotificationIds' | 'scheduledDays' | 'priority'>>
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
