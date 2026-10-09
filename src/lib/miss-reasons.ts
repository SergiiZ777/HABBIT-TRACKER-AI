import { useSyncExternalStore } from 'react';

import Storage from '@/lib/kv-storage';

export type MissReason = 'tooTired' | 'noTime' | 'forgot' | 'noMotivation' | 'scheduleConflict' | 'tooDifficult';

export type MissReasonEntry = {
  habitId: string;
  day: string;
  reason: MissReason;
  timestamp: string;
};

const STORAGE_KEY = 'miss-reasons:v1';
const MAX_ENTRIES = 500;

function load(): MissReasonEntry[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MissReasonEntry[];
  } catch {
    // Corrupt storage — start fresh.
  }
  return [];
}

let entries: MissReasonEntry[] = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return entries;
}

export function useMissReasons(): MissReasonEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getMissReasons(): MissReasonEntry[] {
  return entries;
}

export function getMissReasonsForHabit(habitId: string): MissReasonEntry[] {
  return entries.filter((e) => e.habitId === habitId);
}

export function getMissReasonsForDay(day: string): MissReasonEntry[] {
  return entries.filter((e) => e.day === day);
}

export function hasReasonForHabitDay(habitId: string, day: string): boolean {
  return entries.some((e) => e.habitId === habitId && e.day === day);
}

export function setMissReason(habitId: string, day: string, reason: MissReason): void {
  const idx = entries.findIndex((e) => e.habitId === habitId && e.day === day);
  const entry: MissReasonEntry = { habitId, day, reason, timestamp: new Date().toISOString() };
  if (idx !== -1) {
    entries = entries.map((e, i) => (i === idx ? entry : e));
  } else {
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  }
  persist();
}

export function analyzeMissPatterns(habitId: string, t: {
  missPatternInsight: (reason: string, count: number, total: number) => string;
  missReasonTooTired: string;
  missReasonNoTime: string;
  missReasonForgot: string;
  missReasonNoMotivation: string;
  missReasonScheduleConflict: string;
  missReasonTooDifficult: string;
}): { topReason: MissReason; reasonLabel: string; count: number; total: number; insight: string } | null {
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recent = entries.filter(
    (e) => e.habitId === habitId && new Date(e.timestamp).getTime() >= thirtyDaysAgo
  );
  if (recent.length < 3) return null;

  const counts: Record<string, number> = {};
  for (const e of recent) counts[e.reason] = (counts[e.reason] || 0) + 1;

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topReason, count] = sorted[0] as [MissReason, number];

  const labels: Record<MissReason, string> = {
    tooTired: t.missReasonTooTired,
    noTime: t.missReasonNoTime,
    forgot: t.missReasonForgot,
    noMotivation: t.missReasonNoMotivation,
    scheduleConflict: t.missReasonScheduleConflict,
    tooDifficult: t.missReasonTooDifficult,
  };

  return {
    topReason,
    reasonLabel: labels[topReason],
    count,
    total: recent.length,
    insight: t.missPatternInsight(labels[topReason].toLowerCase(), count, recent.length),
  };
}
