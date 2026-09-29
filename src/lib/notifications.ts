import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Dictionary } from '@/lib/i18n';

const CHANNEL_ID = 'habit-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Requests OS permission to show notifications. No-ops to false on web (browser notifications aren't wired up here). */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return requested.granted;
  } catch {
    return false;
  }
}

async function ensureAndroidChannel(name: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name,
      importance: Notifications.AndroidImportance.HIGH,
    });
  } catch {
    // Channel setup failing shouldn't block scheduling from surfacing a clear error upstream.
  }
}

/**
 * Schedules a daily local reminder for a habit at the given "HH:mm" local time, with the
 * notification text in the app's current language. Returns the scheduled notification id on
 * success, or undefined if permission was denied, the platform doesn't support it (web), or
 * scheduling otherwise failed.
 */
export async function scheduleHabitReminder(
  habit: { id: string; name: string; emoji: string },
  time: string,
  t: Dictionary
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;

  const granted = await requestReminderPermission();
  if (!granted) return undefined;

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;

  await ensureAndroidChannel(t.notifChannelName);

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: t.notifTitle,
        body: t.notifBody(habit.emoji, habit.name),
        data: { habitId: habit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return undefined;
  }
}

/** Cancels a previously scheduled reminder. Safe to call with undefined (e.g. no reminder was ever scheduled). */
export async function cancelHabitReminder(notificationId: string | undefined): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already cancelled/fired or unavailable — nothing more to do.
  }
}
