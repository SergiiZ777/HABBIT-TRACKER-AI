import { useLastNotificationResponse } from 'expo-notifications/build/useLastNotificationResponse';
import { useEffect, useRef } from 'react';

import { dayKey, getHabits, toggleCompletion } from '@/lib/habits';
import { getLocaleTag, getT } from '@/lib/i18n';
import { ACTION_MARK_DONE, ACTION_SNOOZE, scheduleOneshotReminder } from '@/lib/notifications';
import { computeSmartReminder, refreshAllSmartReminders } from '@/lib/smart-reminder';

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
