import { computeHabitDependencies } from '@/lib/habit-dependencies';
import { computeHabitHealth } from '@/lib/habit-health';
import {
  addDays,
  currentStreak,
  dayKey,
  getHabits,
  habitReminderNotificationIds,
  isPaused,
  isScheduledOn,
  onHabitsChange,
  updateHabit,
  weekdayLabel,
  type Habit,
} from '@/lib/habits';
import { getLocaleTag, getT, onLocaleChange } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n/types';
import { getMoodForDay, onMoodChange } from '@/lib/mood';
import { daysSinceLastCompletion } from '@/lib/motivation';
import { cancelHabitReminder, scheduleHabitReminder, scheduleOneshotReminder } from '@/lib/notifications';

const STREAK_MILESTONES = [3, 7, 14, 30, 100];
const MIN_DOW_SAMPLES = 4;
const FOLLOWUP_DELAY_MIN = 30;

type DowStats = { occurrences: number; completed: number };

function dayOfWeekStats(habit: Habit, today: Date): DowStats[] {
  const stats: DowStats[] = Array.from({ length: 7 }, () => ({ occurrences: 0, completed: 0 }));
  const todayKey = dayKey(today);
  const compSet = new Set(habit.completions);
  let cursor = new Date(habit.createdAt);
  let guard = 0;
  while (dayKey(cursor) <= todayKey && guard < 3660) {
    if (isScheduledOn(habit, cursor)) {
      const bucket = stats[cursor.getDay()];
      bucket.occurrences++;
      if (compSet.has(dayKey(cursor))) bucket.completed++;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  return stats;
}

export function computeSmartReminder(
  habit: Habit,
  allHabits: Habit[],
  t: Dictionary,
  localeTag: string,
  isFollowUp = false,
  today: Date = new Date()
): { title: string; body: string } {
  const title = t.notifTitle;

  if (isFollowUp) {
    return { title, body: t.smartFollowupShortVersion(habit.emoji, habit.name) };
  }

  const health = computeHabitHealth(habit, t, today);
  const streak = currentStreak(habit, today);

  // 1. Milestone push
  const nextMilestone = STREAK_MILESTONES.find((m) => m === streak + 1);
  if (nextMilestone) {
    return { title, body: t.smartReminderMilestone(habit.emoji, habit.name, nextMilestone) };
  }

  // 2. At risk
  if (health.risk === 'high') {
    const gap = daysSinceLastCompletion(habit, today);
    if (gap >= 3 && Number.isFinite(gap)) {
      return { title, body: t.smartReminderAtRisk(habit.emoji, habit.name, gap) };
    }
  }

  // 3. Dependency trigger — an anchor habit was completed today
  const todayKey = dayKey(today);
  const deps = computeHabitDependencies(allHabits, today);
  const dep = deps.find((d) => d.to.id === habit.id && d.from.completions.includes(todayKey));
  if (dep) {
    return {
      title,
      body: t.smartReminderDependency(habit.emoji, habit.name, `${dep.from.emoji} ${dep.from.name}`, dep.lift),
    };
  }

  // 4/5. Best / worst day of week
  const dow = today.getDay();
  const dowStats = dayOfWeekStats(habit, today);
  const todayStat = dowStats[dow];
  if (todayStat.occurrences >= MIN_DOW_SAMPLES) {
    const todayRate = Math.round((todayStat.completed / todayStat.occurrences) * 100);
    const eligible = dowStats.filter((s) => s.occurrences >= MIN_DOW_SAMPLES);
    const rates = eligible.map((s) => Math.round((s.completed / s.occurrences) * 100));
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    if (maxRate - minRate >= 20) {
      const dayName = weekdayLabel(dow, localeTag);
      if (todayRate === maxRate && todayRate >= 70) {
        return { title, body: t.smartReminderBestDay(habit.emoji, habit.name, dayName, todayRate) };
      }
      if (todayRate === minRate && todayRate <= 50) {
        return { title, body: t.smartReminderWorstDay(habit.emoji, habit.name, dayName) };
      }
    }
  }

  // 6. Declining trend
  if (health.trendDelta <= -12) {
    return { title, body: t.smartReminderDeclining(habit.emoji, habit.name, Math.abs(health.trendDelta)) };
  }

  // 7. Strong momentum
  if (health.score >= 80 && health.trend === 'up') {
    return { title, body: t.smartReminderMomentum(habit.emoji, habit.name, streak) };
  }

  // 8. Low energy
  const mood = getMoodForDay(todayKey);
  if (mood && mood.energy <= 2) {
    return { title, body: t.smartReminderLowEnergy(habit.emoji, habit.name) };
  }

  // 9. Default with consistency stat
  return { title, body: t.smartReminderDefault(habit.emoji, habit.name, health.consistency) };
}

// ---------- auto-refresh ----------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let refreshing = false;

async function doRefresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const habits = getHabits();
    const t = getT();
    const localeTag = getLocaleTag();
    const today = new Date();
    const todayKey = dayKey(today);

    for (const habit of habits) {
      if (!habit.reminderTime || isPaused(habit)) continue;

      // Cancel existing
      await cancelHabitReminder(habitReminderNotificationIds(habit));

      // Compute smart content and schedule primary
      const content = computeSmartReminder(habit, habits, t, localeTag, false, today);
      const ids = await scheduleHabitReminder(
        habit,
        habit.reminderTime,
        t,
        habit.scheduledDays,
        content
      );

      // Schedule follow-up if habit not yet completed today
      const followupIds: string[] = [];
      if (!habit.completions.includes(todayKey) && isScheduledOn(habit, today)) {
        const [hStr, mStr] = habit.reminderTime.split(':');
        const followupDate = new Date();
        followupDate.setHours(Number(hStr), Number(mStr) + FOLLOWUP_DELAY_MIN, 0, 0);
        if (followupDate > today) {
          const followupContent = computeSmartReminder(habit, habits, t, localeTag, true, today);
          const fId = await scheduleOneshotReminder(habit, followupDate, followupContent, t.notifChannelName);
          if (fId) followupIds.push(fId);
        }
      }

      updateHabit(habit.id, { reminderNotificationIds: [...(ids ?? []), ...followupIds] });
    }
  } finally {
    refreshing = false;
  }
}

export function refreshAllSmartReminders() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void doRefresh(), 2000);
}

// Register listeners — same side-effect pattern as daily-nudge.ts
onHabitsChange(refreshAllSmartReminders);
onMoodChange(refreshAllSmartReminders);
onLocaleChange(refreshAllSmartReminders);

// Initial refresh on import
refreshAllSmartReminders();
