import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { updateHabit, useHabits } from '@/lib/habits';
import { useT } from '@/lib/i18n';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';

export default function EditHabitScreen() {
  const t = useT();
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
        values.reminderTime,
        t
      );
      if (!reminderNotificationId) {
        Alert.alert(t.remindersDisabledTitle, t.remindersDisabledMessage);
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
      title={t.editHabitTitle}
      submitLabel={t.saveChanges}
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
