import { useSyncExternalStore } from 'react';

import { getHabits, onHabitsChange } from '@/lib/habits';
import Storage from '@/lib/kv-storage';

// n8n workflow "Habit Tracker AI - Backup Sync" — push=upsert / pull=get against a Data Table,
// keyed by an anonymous per-device id. Same shared-secret-header pattern as the Coach webhook.
const PUSH_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-backup-push-1f698b4ffd29';
const PULL_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-backup-pull-66b0624ae8b9';
const BACKUP_KEY = '-m4_T52go00uiZh-J9xmT7ldyQuj0BON';

const DEVICE_ID_STORAGE_KEY = 'backup:deviceId:v1';

function randomSegment(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadOrCreateDeviceId(): string {
  try {
    const existing = Storage.getItemSync(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    // Storage unavailable — fall through to a fresh (unpersisted) id for this session.
  }
  const fresh = `${randomSegment()}-${randomSegment()}-${randomSegment()}`;
  try {
    Storage.setItemSync(DEVICE_ID_STORAGE_KEY, fresh);
  } catch {
    // Won't persist across restarts, but backup/restore within this session still works.
  }
  return fresh;
}

let deviceId: string = loadOrCreateDeviceId();
const listeners = new Set<() => void>();

/** The current device's Backup ID — stable across app restarts, used to push/pull backups. */
export function useDeviceId(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => deviceId
  );
}

/** Pushes the given habits (as already-serialized JSON) to this device's backup slot. Best-effort — never throws. */
export async function pushBackup(habitsJson: string): Promise<void> {
  try {
    await fetch(PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': BACKUP_KEY },
      body: JSON.stringify({ deviceId, data: habitsJson }),
    });
  } catch {
    // Offline or unreachable — the next successful change will push again.
  }
}

/** Pulls the raw habits JSON backed up under the given Backup ID, or null if none exists / on any failure. */
export async function pullBackup(backupId: string): Promise<string | null> {
  try {
    const res = await fetch(PULL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': BACKUP_KEY },
      body: JSON.stringify({ deviceId: backupId.trim() }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: unknown };
    return typeof json.data === 'string' ? json.data : null;
  } catch {
    return null;
  }
}

// ---------- auto-backup ----------
// Pushes a debounced backup automatically on every habits change. Registered once here at
// module load (this module is imported exactly once by the root layout) rather than requiring
// every screen to remember to start it — same self-starting pattern as notifications.ts's
// setNotificationHandler call.

const AUTO_BACKUP_DEBOUNCE_MS = 2000;
let autoBackupTimer: ReturnType<typeof setTimeout> | undefined;

onHabitsChange(() => {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    pushBackup(JSON.stringify({ habits: getHabits() }));
  }, AUTO_BACKUP_DEBOUNCE_MS);
});
