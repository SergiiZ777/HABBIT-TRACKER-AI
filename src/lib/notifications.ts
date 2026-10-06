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
import { setNotificationCategoryAsync } from 'expo-notifications/build/setNotificationCategoryAsync';
import { Platform } from 'react-native';

import type { Dictionary } from '@/lib/i18n';

export const HABIT_REMINDER_CATEGORY = 'habit-reminder';
export const ACTION_MARK_DONE = 'MARK_DONE';
export const ACTION_SNOOZE = 'SNOOZE_15';

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
 * Schedules a local reminder for a habit at the given "HH:mm" local time, respecting its
 * scheduled days — every day (or `scheduledDays` undefined/all 7) uses a single DAILY trigger;
 * a strict subset needs one WEEKLY trigger per selected weekday, since neither expo-notifications
 * trigger type supports targeting multiple weekdays in one registration (verified directly
 * against the installed package's trigger types, not assumed). Weekday conversion: this app's
 * `scheduledDays` uses 0=Sun..6=Sat (matching `Date#getDay()`); expo-notifications' `WeeklyTriggerInput.weekday`
 * uses 1=Sun..7=Sat, hence the `+1` below.
 *
 * Returns every scheduled notification id (one element for the daily case) on success, or
 * undefined if permission was denied, the platform doesn't support it (web), or scheduling
 * otherwise failed.
 */
export async function scheduleHabitReminder(
  habit: { id: string; name: string; emoji: string },
  time: string,
  t: Dictionary,
  scheduledDays?: number[],
  smartContent?: { title: string; body: string }
): Promise<string[] | undefined> {
  if (Platform.OS === 'web') return undefined;

  const granted = await requestReminderPermission();
  if (!granted) return undefined;

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;

  await ensureAndroidChannel(t.notifChannelName);

  const content = {
    title: smartContent?.title ?? t.notifTitle,
    body: smartContent?.body ?? t.notifBody(habit.emoji, habit.name),
    data: { habitId: habit.id },
    categoryIdentifier: HABIT_REMINDER_CATEGORY,
  };

  try {
    if (!scheduledDays || scheduledDays.length === 7) {
      const id = await scheduleNotificationAsync({
        content,
        trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
      });
      return [id];
    }
    return await Promise.all(
      scheduledDays.map((dow) =>
        scheduleNotificationAsync({
          content,
          trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: dow + 1, hour, minute, channelId: CHANNEL_ID },
        })
      )
    );
  } catch {
    return undefined;
  }
}

/** Schedules a one-shot notification at a specific absolute time (for follow-ups / snooze). */
export async function scheduleOneshotReminder(
  habit: { id: string; name: string; emoji: string },
  fireDate: Date,
  smartContent: { title: string; body: string },
  channelName: string
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  const granted = await requestReminderPermission();
  if (!granted) return undefined;
  await ensureAndroidChannel(channelName);
  try {
    return await scheduleNotificationAsync({
      content: {
        title: smartContent.title,
        body: smartContent.body,
        data: { habitId: habit.id },
        categoryIdentifier: HABIT_REMINDER_CATEGORY,
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: fireDate, channelId: CHANNEL_ID },
    });
  } catch {
    return undefined;
  }
}

/** Registers notification action buttons (Mark as done, Snooze). Call at app startup and on locale change. */
export async function registerNotificationCategories(t: Dictionary): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
      { identifier: ACTION_MARK_DONE, buttonTitle: t.notifActionMarkDone, options: { opensAppToForeground: false } },
      { identifier: ACTION_SNOOZE, buttonTitle: t.notifActionSnooze, options: { opensAppToForeground: false } },
    ]);
  } catch {
    // Categories not supported (older Expo Go builds) — buttons simply won't appear.
  }
}

/**
 * Schedules (or replaces) the daily nudge notification at the given "HH:mm" local time, with
 * caller-supplied title/body (already translated — this isn't tied to a specific habit, so it
 * has no fixed copy of its own). Same permission/channel/trigger shape as `scheduleHabitReminder`.
 */
export async function scheduleDailyNudge(
  time: string,
  title: string,
  body: string,
  channelName: string
): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;

  const granted = await requestReminderPermission();
  if (!granted) return undefined;

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;

  await ensureAndroidChannel(channelName);

  try {
    return await scheduleNotificationAsync({
      content: { title, body },
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

/** Cancels previously scheduled reminder(s). Safe to call with undefined/empty (e.g. no reminder was ever scheduled). */
export async function cancelHabitReminder(notificationIds: string[] | undefined): Promise<void> {
  if (!notificationIds?.length || Platform.OS === 'web') return;
  await Promise.all(
    notificationIds.map(async (id) => {
      try {
        await cancelScheduledNotificationAsync(id);
      } catch {
        // Already cancelled/fired or unavailable — nothing more to do.
      }
    })
  );
}
