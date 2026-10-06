import { useSyncExternalStore } from 'react';

import { computeHabitHealth } from '@/lib/habit-health';

import { isPaused, type Habit } from '@/lib/habits';

import type { Dictionary } from '@/lib/i18n';

import Storage from '@/lib/kv-storage';

const FOCUS_ENABLED_KEY = 'focus:enabled';

const FOCUS_IDS_KEY = 'focus:ids';

let focusEnabled = Storage.getItemSync(FOCUS_ENABLED_KEY) === 'true';

let focusIds: string[] = (() => {

  try {

    const raw = Storage.getItemSync(FOCUS_IDS_KEY);

    return raw ? JSON.parse(raw) : [];

  } catch {

    return [];

  }

})();

const listeners = new Set<() => void>();

function notify() {

  listeners.forEach((l) => l());

}

export function setFocusModeEnabled(enabled: boolean) {

  focusEnabled = enabled;

  Storage.setItemSync(FOCUS_ENABLED_KEY, String(enabled));

  notify();

}

export function setFocusHabitIds(ids: string[]) {

  focusIds = ids;

  Storage.setItemSync(FOCUS_IDS_KEY, JSON.stringify(ids));

  notify();

}

export function useFocusModeEnabled(): boolean {

  return useSyncExternalStore(

    (cb) => {

      listeners.add(cb);

      return () => listeners.delete(cb);

    },

    () => focusEnabled

  );

}

export type FocusPlan = {

  isOverloaded: boolean;

  focusModeActive: boolean;

  totalCount: number;

  focusHabits: Habit[];

  secondaryHabits: Habit[];

  headline: string;

};

/**

 * Analyzes active habits and computes a 3-habit core focus plan if the user is overloaded (>= 6 habits)

 * or if Focus Mode is manually enabled.

 */

export function computeFocusPlan(habits: Habit[], t: Dictionary, today: Date = new Date()): FocusPlan {

  const activeHabits = habits.filter((h) => !isPaused(h));

  const isOverloaded = activeHabits.length >= 6;

  const focusModeActive = focusEnabled || isOverloaded;

  if (!focusModeActive || activeHabits.length === 0) {

    return {

      isOverloaded,

      focusModeActive: false,

      totalCount: activeHabits.length,

      focusHabits: activeHabits,

      secondaryHabits: [],

      headline: '',

    };

  }

  // Determine top 3 focus habits

  let focusHabits: Habit[] = [];

  if (focusIds.length > 0) {

    const customFocus = activeHabits.filter((h) => focusIds.includes(h.id));

    if (customFocus.length > 0) {

      focusHabits = customFocus.slice(0, 3);

    }

  }

  if (focusHabits.length < 3) {

    const sorted = [...activeHabits].sort((a, b) => {

      // High priority first

      const aP = a.priority === 'high' ? 1 : 0;

      const bP = b.priority === 'high' ? 1 : 0;

      if (aP !== bP) return bP - aP;

      // Higher Health Score second

      const aHealth = computeHabitHealth(a, t, today).score;

      const bHealth = computeHabitHealth(b, t, today).score;

      return bHealth - aHealth;

    });

    const existingIds = new Set(focusHabits.map((h) => h.id));

    for (const h of sorted) {

      if (focusHabits.length >= 3) break;

      if (!existingIds.has(h.id)) {

        focusHabits.push(h);

      }

    }

  }

  const focusIdSet = new Set(focusHabits.map((h) => h.id));

  const secondaryHabits = activeHabits.filter((h) => !focusIdSet.has(h.id));

  const headline = t.overloadInterventionHeadline(activeHabits.length);

  return {

    isOverloaded,

    focusModeActive,

    totalCount: activeHabits.length,

    focusHabits,

    secondaryHabits,

    headline,

  };

}

