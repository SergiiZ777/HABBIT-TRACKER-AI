import { router } from 'expo-router';
import { Alert } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { addHabit, updateHabit } from '@/lib/habits';
import { useT } from '@/lib/i18n';
import { scheduleHabitReminder } from '@/lib/notifications';

export default function NewHabitScreen() {
  const t = useT();

  const onSubmit = async (values: HabitFormValues) => {
    const created = addHabit({ name: values.name, emoji: values.emoji, color: values.color });

    if (values.reminderEnabled) {
      const notificationId = await scheduleHabitReminder(created, values.reminderTime, t);
      if (notificationId) {
        updateHabit(created.id, { reminderTime: values.reminderTime, reminderNotificationId: notificationId });
      } else {
        updateHabit(created.id, { reminderTime: values.reminderTime });
        Alert.alert(t.remindersDisabledTitle, t.remindersDisabledMessage);
      }
    }

    router.back();
  };

  return <HabitForm title={t.newHabitTitle} submitLabel={t.createHabit} onSubmit={onSubmit} />;
}
