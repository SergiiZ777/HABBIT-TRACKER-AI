import { useSyncExternalStore } from 'react';

import Storage from '@/lib/kv-storage';

export type MoodEntry = { energy: number; mood: number };

type State = Record<string, MoodEntry>;

const STORAGE_KEY = 'mood:v1';

function load(): State {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // Corrupt or unavailable — start fresh.
  }
  return {};
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

export function useMood(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function getMood(): State {
  return state;
}

export function getMoodForDay(day: string): MoodEntry | null {
  return state[day] ?? null;
}

export function setMoodForDay(day: string, entry: MoodEntry) {
  setState({ ...state, [day]: entry });
}
