import { router } from 'expo-router';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { addHabit, updateHabit } from '@/lib/habits';
import { useT } from '@/lib/i18n';
import { scheduleHabitReminder } from '@/lib/notifications';

export default function NewHabitScreen() {
  const t = useT();

  const onSubmit = async (values: HabitFormValues) => {
    const created = addHabit({ name: values.name, emoji: values.emoji, color: values.color, scheduledDays: values.scheduledDays });

    if (values.reminderEnabled) {
      const notificationIds = await scheduleHabitReminder(created, values.reminderTime, t, values.scheduledDays);
      if (notificationIds) {
        updateHabit(created.id, { reminderTime: values.reminderTime, reminderNotificationIds: notificationIds });
      } else {
        updateHabit(created.id, { reminderTime: values.reminderTime });
        Alert.alert(t.remindersDisabledTitle, t.remindersDisabledMessage);
      }
    }

    router.back();
  };

  return <HabitForm title={t.newHabitTitle} submitLabel={t.createHabit} onSubmit={onSubmit} />;
}
