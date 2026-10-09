import { useSyncExternalStore } from 'react';

import { computeHabitHealth } from '@/lib/habit-health';
import type { Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';
import type { HabitChange } from '@/lib/habit-actions';
import Storage from '@/lib/kv-storage';

const STORAGE_KEY = 'recommendation-log:v1';
const MAX_ENTRIES = 100;
const EVALUATION_WINDOW_DAYS = 7;
const EXPIRY_DAYS = 7;

export type RecommendationSource = 'nextBestAction' | 'coachInsight' | 'monthlyAdvice';

export type RecommendationEntry = {
  id: string;
  timestamp: string;
  source: RecommendationSource;
  type: string;
  habitId: string;
  habitName: string;
  headline: string;
  change?: HabitChange;
  status: 'shown' | 'applied' | 'dismissed' | 'expired';
  appliedAt?: string;
  preScore?: number;
  postScore?: number;
  scoreDelta?: number;
  verdict?: 'effective' | 'neutral' | 'harmful';
  evaluatedAt?: string;
};

// ---------- store ----------

function load(): RecommendationEntry[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RecommendationEntry[];
  } catch {
    // Corrupt storage: start fresh.
  }
  return [];
}

let entries: RecommendationEntry[] = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full — entries will be recalculated next session.
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

export function useRecommendationLog(): RecommendationEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------- core functions ----------

export function logRecommendation(entry: Omit<RecommendationEntry, 'id' | 'timestamp' | 'status'>): string {
  const existing = entries.find(
    (e) => e.source === entry.source && e.type === entry.type && e.habitId === entry.habitId && e.status === 'shown'
  );
  if (existing) return existing.id;

  const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newEntry: RecommendationEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
    status: 'shown',
  };
  entries = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  persist();
  return id;
}

export function markApplied(id: string): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1 || entries[idx].status !== 'shown') return;
  entries = entries.map((e) => (e.id === id ? { ...e, status: 'applied' as const, appliedAt: new Date().toISOString() } : e));
  persist();
}

export function markDismissed(id: string): void {
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1 || entries[idx].status !== 'shown') return;
  entries = entries.map((e) => (e.id === id ? { ...e, status: 'dismissed' as const } : e));
  persist();
}

export function evaluateOutcomes(habits: Habit[], t: Dictionary, today: Date = new Date()): void {
  const todayMs = today.getTime();
  let changed = false;

  entries = entries.map((e) => {
    if (e.status === 'applied' && !e.evaluatedAt && e.appliedAt) {
      const elapsed = (todayMs - new Date(e.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsed >= EVALUATION_WINDOW_DAYS) {
        const habit = habits.find((h) => h.id === e.habitId);
        if (habit) {
          const health = computeHabitHealth(habit, t, today);
          const postScore = health.score;
          const scoreDelta = postScore - (e.preScore ?? 0);
          const verdict = scoreDelta >= 5 ? 'effective' : scoreDelta <= -5 ? 'harmful' : 'neutral';
          changed = true;
          return { ...e, postScore, scoreDelta, verdict, evaluatedAt: today.toISOString() } as RecommendationEntry;
        }
      }
    }

    // Expire old shown entries
    if (e.status === 'shown') {
      const age = (todayMs - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (age > EXPIRY_DAYS) {
        changed = true;
        return { ...e, status: 'expired' as const };
      }
    }

    return e;
  });

  if (changed) persist();
}

export function getEffectivenessStats(): {
  totalApplied: number;
  effective: number;
  neutral: number;
  harmful: number;
  effectivenessRate: number;
} {
  const evaluated = entries.filter((e) => e.verdict);
  const effective = evaluated.filter((e) => e.verdict === 'effective').length;
  const neutral = evaluated.filter((e) => e.verdict === 'neutral').length;
  const harmful = evaluated.filter((e) => e.verdict === 'harmful').length;
  const totalApplied = entries.filter((e) => e.status === 'applied' || e.verdict).length;
  const total = evaluated.length;
  return { totalApplied, effective, neutral, harmful, effectivenessRate: total > 0 ? Math.round((effective / total) * 100) : 0 };
}

export function getRecentDismissals(withinDays: number = 3): RecommendationEntry[] {
  const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  return entries.filter((e) => e.status === 'dismissed' && e.timestamp >= cutoff);
}

export function getRecommendationHistory(habitId: string): RecommendationEntry[] {
  return entries.filter((e) => e.habitId === habitId && e.verdict);
}
