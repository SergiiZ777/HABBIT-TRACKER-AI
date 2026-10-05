import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { getDeviceId } from '@/lib/backup';
import Storage from '@/lib/kv-storage';
import { requestReminderPermission } from '@/lib/notifications';

// n8n workflow "Habit Tracker AI - Weekly Recap" — registers this device's Expo push token so a
// weekly scheduled job can push a real, AI-written recap (unlike daily-nudge.ts's local-only
// reminder, this needs a server round trip since local notifications can't call an AI at fire-time).
const REGISTER_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-weekly-recap-register-9b3148583uygdy35';
const REGISTER_KEY = process.env.EXPO_PUBLIC_WEEKLY_RECAP_KEY ?? '';

const ENABLED_KEY = 'weeklyRecap:enabled:v1';
const TOKEN_KEY = 'weeklyRecap:pushToken:v1';

function loadEnabled(): boolean {
  try {
    return Storage.getItemSync(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function loadToken(): string | undefined {
  try {
    return Storage.getItemSync(TOKEN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

let enabled = loadEnabled();
let pushToken = loadToken();
const listeners = new Set<() => void>();

function persist(key: string, value: string | undefined) {
  try {
    Storage.setItemSync(key, value ?? '');
  } catch {
    // Won't persist across restarts, but the in-memory state (and this session's registration) still works.
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function useWeeklyRecapEnabled(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled
  );
}

/** POSTs the current enabled/token state to the backend. Best-effort — never throws. */
async function registerWithServer(nextEnabled: boolean, token: string | undefined) {
  try {
    await fetch(REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': REGISTER_KEY },
      body: JSON.stringify({ deviceId: getDeviceId(), pushToken: token ?? '', enabled: nextEnabled }),
    });
  } catch {
    // Offline or unreachable — the next toggle/app start will retry.
  }
}

/**
 * Mirrors daily-nudge.ts's setDailyNudgeEnabled: the switch flips immediately (so the UI never
 * feels laggy), and this only returns false — for the caller to alert the user — when permission
 * was denied. On web, requestReminderPermission() always resolves false by design (browser push
 * isn't wired up here), so the toggle still visually turns on but nothing gets registered; that's
 * the same no-op-on-web behavior the daily nudge already has, not a new inconsistency.
 */
export async function setWeeklyRecapEnabled(next: boolean): Promise<boolean> {
  enabled = next;
  persist(ENABLED_KEY, next ? '1' : '0');
  notify();

  if (!next) {
    void registerWithServer(false, pushToken);
    return true;
  }

  const granted = await requestReminderPermission();
  if (!granted) return false;

  let token = pushToken;
  if (!token && Platform.OS !== 'web') {
    try {
      // Deep import, not `import * as Notifications` — same barrel-avoidance reason as
      // notifications.ts: the barrel eagerly touches a push-only native module that isn't present
      // in Expo Go, and this is exactly that push-token surface.
      const { getExpoPushTokenAsync } = await import('expo-notifications/build/getExpoPushTokenAsync');
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const result = await getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      token = result.data;
    } catch {
      // Expo Go / web / no credentials yet — push tokens genuinely aren't available here.
    }
  }

  if (token) {
    pushToken = token;
    persist(TOKEN_KEY, token);
    void registerWithServer(true, token);
  }
  return true;
}

// Re-sync on app start if already enabled — cheap insurance against a token rotation or the
// backend row having been lost, same "re-run on startup" spirit as daily-nudge.ts's refresh().
if (enabled && pushToken) void registerWithServer(true, pushToken);
