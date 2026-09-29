import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { updateHabit, useHabits } from '@/lib/habits';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habits = useHabits();
  const habit = habits.find((h) => h.id === id);

  useEffect(() => {
    // The habit could have been deleted (e.g. from another tab) while this sheet was open.
    if (!habit) router.back();
  }, [habit]);

  if (!habit) return null;

  const onSubmit = async (values: HabitFormValues) => {
    await cancelHabitReminder(habit.reminderNotificationId);

    let reminderNotificationId: string | undefined;
    if (values.reminderEnabled) {
      reminderNotificationId = await scheduleHabitReminder(
        { id: habit.id, name: values.name, emoji: values.emoji },
        values.reminderTime
      );
      if (!reminderNotificationId) {
        Alert.alert('Reminders disabled', 'Enable notifications in Settings to get a daily reminder for this habit.');
      }
    }

    updateHabit(habit.id, {
      name: values.name,
      emoji: values.emoji,
      color: values.color,
      reminderTime: values.reminderEnabled ? values.reminderTime : undefined,
      reminderNotificationId,
    });

    router.back();
  };

  return (
    <HabitForm
      title="Edit habit"
      submitLabel="Save changes"
      initialValues={{
        name: habit.name,
        emoji: habit.emoji,
        color: habit.color,
        reminderEnabled: Boolean(habit.reminderTime),
        reminderTime: habit.reminderTime,
      }}
      onSubmit={onSubmit}
    />
  );
}
