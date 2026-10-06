import {
  addHabit,
  daysPerWeek,
  getHabits,
  habitReminderNotificationIds,
  isPaused,
  pauseHabit,
  resumeHabit,
  updateHabit,
  type Habit,
} from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';
import type { LifeArea } from '@/lib/life-areas';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';

/**
 * A concrete change to a habit's setup that the monthly review can propose and apply. Only
 * settings the app really has — the AI explains changes, it never invents new kinds of them.
 */
export type HabitChange = {
  reminderTime?: string;
  scheduledDays?: number[];
  priority?: 'high' | 'normal';
  pause?: boolean;
};

function sameDays(a: number[] | undefined, b: number[] | undefined) {
  const norm = (d: number[] | undefined) => (!d || d.length === 7 ? 'all' : [...d].sort().join(','));
  return norm(a) === norm(b);
}

/** Whether the habit's current setup already reflects `change` (so the UI can show "Applied"). */
export function isChangeApplied(habit: Habit, change: HabitChange): boolean {
  if (change.pause) return isPaused(habit);
  if (change.reminderTime !== undefined && habit.reminderTime !== change.reminderTime) return false;
  if (change.scheduledDays !== undefined && !sameDays(habit.scheduledDays, change.scheduledDays)) return false;
  if (change.priority !== undefined && (habit.priority ?? 'normal') !== change.priority) return false;
  return true;
}

/** Applies a change, keeping reminder notifications in sync with the new time/days. */
export async function applyHabitChange(habitId: string, change: HabitChange, t: Dictionary): Promise<void> {
  const habit = getHabits().find((h) => h.id === habitId);
  if (!habit) return;

  if (change.pause) {
    await setHabitPaused(habit, true, t);
    return;
  }

  const patch: Parameters<typeof updateHabit>[1] = {};
  if (change.priority) patch.priority = change.priority;
  if (change.scheduledDays) {
    patch.scheduledDays = daysPerWeek(change.scheduledDays) === 7 ? undefined : [...change.scheduledDays].sort();
  }

  const time = change.reminderTime ?? habit.reminderTime;
  if ((change.reminderTime || change.scheduledDays) && time && !isPaused(habit)) {
    await cancelHabitReminder(habitReminderNotificationIds(habit));
    patch.reminderTime = time;
    patch.reminderNotificationIds = await scheduleHabitReminder(
      habit,
      time,
      t,
      'scheduledDays' in patch ? patch.scheduledDays : habit.scheduledDays
    );
  } else if (change.reminderTime) {
    patch.reminderTime = change.reminderTime;
  }

  updateHabit(habit.id, patch);
}

/** Pauses (cancelling reminders) or resumes (re-arming the reminder, if it had one) a habit. */
export async function setHabitPaused(habit: Habit, paused: boolean, t: Dictionary): Promise<void> {
  if (paused) {
    await cancelHabitReminder(habitReminderNotificationIds(habit));
    pauseHabit(habit.id);
    return;
  }
  resumeHabit(habit.id);
  if (habit.reminderTime) {
    const ids = await scheduleHabitReminder(habit, habit.reminderTime, t, habit.scheduledDays);
    updateHabit(habit.id, { reminderNotificationIds: ids });
  }
}

export function createPlannedHabit(input: { name: string; emoji: string; area: LifeArea; color: string }): Habit {
  return addHabit({ name: input.name, emoji: input.emoji, color: input.color, area: input.area });
}
