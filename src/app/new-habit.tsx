import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { HabitForm, type HabitFormValues } from '@/components/habit-form';
import { setFocusModeEnabled } from '@/lib/focus-mode';
import { addHabit, getHabits, isPaused, updateHabit } from '@/lib/habits';
import { useT } from '@/lib/i18n';
import { scheduleHabitReminder } from '@/lib/notifications';

export default function NewHabitScreen() {
  const t = useT();

  const proceedWithCreation = async (values: HabitFormValues) => {
    const created = addHabit({
      name: values.name,
      emoji: values.emoji,
      color: values.color,
      scheduledDays: values.scheduledDays,
      priority: values.priority,
      area: values.area,
    });

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

  const onSubmit = async (values: HabitFormValues) => {
    const activeCount = getHabits().filter((h) => !isPaused(h)).length;

    if (activeCount >= 10) {
      if (Platform.OS === 'web') {
        const focusMode = confirm(`${t.overloadWarningTitle}\n\n${t.overloadWarningBody(activeCount)}\n\nOK = ${t.focusTopThreeButton}\nCancel = ${t.createAnywayButton}`);
        if (focusMode) {
          setFocusModeEnabled(true);
          router.back();
        } else {
          await proceedWithCreation(values);
        }
      } else {
        Alert.alert(t.overloadWarningTitle, t.overloadWarningBody(activeCount), [
          {
            text: t.focusTopThreeButton,
            onPress: () => {
              setFocusModeEnabled(true);
              router.back();
            },
          },
          {
            text: t.createAnywayButton,
            onPress: () => proceedWithCreation(values),
          },
        ]);
      }
    } else {
      await proceedWithCreation(values);
    }
  };

  return <HabitForm title={t.newHabitTitle} submitLabel={t.createHabit} onSubmit={onSubmit} />;
}

