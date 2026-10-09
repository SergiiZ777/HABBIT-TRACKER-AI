import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { dayKey, getHabits, toggleCompletion } from '@/lib/habits';
import { getLocaleTag, getT } from '@/lib/i18n';
import { ACTION_MARK_DONE, ACTION_SNOOZE, scheduleOneshotReminder } from '@/lib/notifications';
import { computeSmartReminder, refreshAllSmartReminders } from '@/lib/smart-reminder';

// expo-notifications useLastNotificationResponse is not available on web
const useLastNotificationResponse =
  Platform.OS !== 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-notifications/build/useLastNotificationResponse').useLastNotificationResponse
    : () => null;

export function useNotificationNavigation() {
  const response = useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || response.notification.request.identifier === handled.current) return;
    handled.current = response.notification.request.identifier;

    const habitId = response.notification.request.content.data?.habitId as string | undefined;
    if (!habitId) return;

    const action = response.actionIdentifier;

    if (action === ACTION_MARK_DONE) {
      toggleCompletion(habitId, dayKey());
      refreshAllSmartReminders();
      return;
    }

    if (action === ACTION_SNOOZE) {
      const habits = getHabits();
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        const t = getT();
        const content = computeSmartReminder(habit, habits, t, getLocaleTag());
        const fireDate = new Date(Date.now() + 15 * 60 * 1000);
        void scheduleOneshotReminder(habit, fireDate, content, t.notifChannelName);
      }
      return;
    }
  }, [response]);
}
