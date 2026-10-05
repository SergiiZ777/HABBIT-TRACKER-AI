import { useSyncExternalStore } from 'react';

import { getHabits, onHabitsChange } from '@/lib/habits';
import { getT, onLocaleChange } from '@/lib/i18n';
import Storage from '@/lib/kv-storage';
import { computeMotivation, resolveMotivation } from '@/lib/motivation';
import { cancelHabitReminder, requestReminderPermission, scheduleDailyNudge } from '@/lib/notifications';

const ENABLED_KEY = 'dailyNudge:enabled:v1';
const TIME_KEY = 'dailyNudge:time:v1';
const NOTIF_ID_KEY = 'dailyNudge:notifId:v1';
const DEFAULT_TIME = '20:00';

function loadEnabled(): boolean {
  try {
    return Storage.getItemSync(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function loadTime(): string {
  try {
    return Storage.getItemSync(TIME_KEY) ?? DEFAULT_TIME;
  } catch {
    return DEFAULT_TIME;
  }
}

function loadNotifId(): string | undefined {
  try {
    return Storage.getItemSync(NOTIF_ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

let enabled = loadEnabled();
let time = loadTime();
let notifId = loadNotifId();
const listeners = new Set<() => void>();

// kv-storage has no removeItemSync on web — store '' rather than deleting the key; loadNotifId
// already treats a falsy value as "none".
function persist(key: string, value: string | undefined) {
  try {
    Storage.setItemSync(key, value ?? '');
  } catch {
    // Won't persist across restarts, but the in-memory state (and this session's scheduling) still works.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function useDailyNudgeEnabled(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled
  );
}

export function useDailyNudgeTime(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => time
  );
}

/** Cancels whatever's currently scheduled (if anything) and clears the stored notification id. */
async function clearScheduled() {
  if (notifId) await cancelHabitReminder(notifId);
  notifId = undefined;
  persist(NOTIF_ID_KEY, undefined);
}

/**
 * Recomputes today's nudge content from the current habits and reschedules it — or cancels any
 * scheduled nudge if there's nothing worth nudging about (no habits yet, or everything's already
 * done today). Content can only be as fresh as the last time this ran (local notifications can't
 * compute their body at fire-time), so this re-runs on every habits change, locale change, and
 * app start — good enough for a "simple local reminder," not a guarantee of real-time accuracy.
 */
async function refresh() {
  await clearScheduled();
  if (!enabled) return;

  const motivation = computeMotivation(getHabits());
  if (motivation.kind === 'perfect' || motivation.kind === 'ready') return;

  const t = getT();
  const { headline, detail } = resolveMotivation(t, motivation);
  const id = await scheduleDailyNudge(time, t.dailyNudgeTitle, `${headline} — ${detail}`, t.notifChannelName);
  if (id) {
    notifId = id;
    persist(NOTIF_ID_KEY, id);
  }
}

/** Returns false (and schedules nothing) if notification permission was denied — the caller should alert the user. */
export async function setDailyNudgeEnabled(next: boolean): Promise<boolean> {
  enabled = next;
  persist(ENABLED_KEY, next ? '1' : '0');
  notify();

  if (!next) {
    await clearScheduled();
    return true;
  }

  const granted = await requestReminderPermission();
  if (!granted) return false;

  await refresh();
  return true;
}

export async function setDailyNudgeTime(next: string) {
  time = next;
  persist(TIME_KEY, next);
  notify();
  await refresh();
}

onHabitsChange(() => {
  if (enabled) void refresh();
});
onLocaleChange(() => {
  if (enabled) void refresh();
});
if (enabled) void refresh();
