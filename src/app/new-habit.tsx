import { router } from 'expo-router';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { addHabit, updateHabit } from '@/lib/habits';
import { scheduleHabitReminder } from '@/lib/notifications';

export default function NewHabitScreen() {
  const onSubmit = async (values: HabitFormValues) => {
    const created = addHabit({ name: values.name, emoji: values.emoji, color: values.color });

    if (values.reminderEnabled) {
      const notificationId = await scheduleHabitReminder(created, values.reminderTime);
      if (notificationId) {
        updateHabit(created.id, { reminderTime: values.reminderTime, reminderNotificationId: notificationId });
      } else {
        updateHabit(created.id, { reminderTime: values.reminderTime });
        Alert.alert('Reminders disabled', 'Enable notifications in Settings to get a daily reminder for this habit.');
      }
    }

    router.back();
  };

  return <HabitForm title="New habit" submitLabel="Create habit" onSubmit={onSubmit} />;
}
