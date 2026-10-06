import { useSyncExternalStore } from 'react';

import Storage from '@/lib/kv-storage';

export type Reflection = { worked: string; difficult: string; improve: string };

/** A plan applied from a monthly review — keyed by the month it is FOR, so that month's review can score it. */
export type AppliedPlan = {
  appliedAt: string;
  /** The plan's priority habits and their weekly target at the time it was applied. */
  priorities: { habitId: string; days: number }[];
};

type State = {
  reflections: Record<string, Reflection>;
  plans: Record<string, AppliedPlan>;
  /** Review months ("YYYY-MM") the user has opened — drives the "report ready" banner. */
  seen: Record<string, true>;
  /** Reminder times as they were in a review month before a suggestion moved them (habitId → time | null). */
  reminderSnapshots: Record<string, Record<string, string | null>>;
};

const STORAGE_KEY = 'monthly:v1';
const EMPTY: State = { reflections: {}, plans: {}, seen: {}, reminderSnapshots: {} };

function load(): State {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    // Corrupt or unavailable storage — start fresh.
  }
  return EMPTY;
}

let state: State = load();
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical: the review still works, it just won't remember across restarts.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMonthlyStore(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function getMonthlyStore(): State {
  return state;
}

export function saveReflection(monthKey: string, reflection: Reflection) {
  setState({ ...state, reflections: { ...state.reflections, [monthKey]: reflection } });
}

export function saveAppliedPlan(forMonthKey: string, plan: AppliedPlan) {
  setState({ ...state, plans: { ...state.plans, [forMonthKey]: plan } });
}

export function markReviewSeen(monthKey: string) {
  if (state.seen[monthKey]) return;
  setState({ ...state, seen: { ...state.seen, [monthKey]: true } });
}

/** Records a habit's reminder time for a review month before a suggestion changes it (first write wins). */
export function snapshotReminder(monthKey: string, habitId: string, time: string | undefined) {
  const forMonth = state.reminderSnapshots[monthKey] ?? {};
  if (habitId in forMonth) return;
  setState({
    ...state,
    reminderSnapshots: { ...state.reminderSnapshots, [monthKey]: { ...forMonth, [habitId]: time ?? null } },
  });
}
