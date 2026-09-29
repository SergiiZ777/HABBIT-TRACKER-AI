// Deep imports (not `import * as Notifications from 'expo-notifications'`) are deliberate here:
// expo-notifications' barrel (index.js) unconditionally imports topicSubscription.js, which
// eagerly calls requireNativeModule('ExpoTopicSubscriptionModule') at module-evaluation time.
// That native module is push-notification-only and isn't present in Expo Go on Android (Expo Go
// dropped Android push support in SDK 53+), so merely importing the barrel crashes the app on
// Android with "Cannot find native module 'ExpoTopicSubscriptionModule'" — even though we only
// ever use local scheduling, which Expo Go fully supports. Importing each function from its own
// submodule avoids ever touching topicSubscription.js.
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { Platform } from 'react-native';

import type { Dictionary } from '@/lib/i18n';

const CHANNEL_ID = 'habit-reminders';

if (Platform.OS !== 'web') {
  setNotificationHandler({
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
    const existing = await getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await requestPermissionsAsync({
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
    await setNotificationChannelAsync(CHANNEL_ID, {
      name,
      importance: AndroidImportance.HIGH,
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
    return await scheduleNotificationAsync({
      content: {
        title: t.notifTitle,
        body: t.notifBody(habit.emoji, habit.name),
        data: { habitId: habit.id },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DAILY,
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
    await cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already cancelled/fired or unavailable — nothing more to do.
  }
}
