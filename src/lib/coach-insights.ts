import type { HabitChange } from '@/lib/habit-actions';
import { addDays, daysPerWeek, dayKey, isPaused, isScheduledOn, scheduledDaysOn, weekdayLabel, type Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';

export type CoachActionKind = 'changeTime' | 'reduceTarget' | 'pauseHabit' | 'setPriority' | 'restDay';

export type CoachAction = {
  habitId: string;
  change: HabitChange;
  buttonLabel: string;
};

export type CoachInsight = {
  id: string;
  type: 'recurringMissedDay' | 'timeOfDayFailure' | 'unrealisticTarget' | 'overload' | 'decliningMotivation' | 'successfulRoutine';
  emoji: string;
  title: string;
  habit?: Habit;
  description: string;
  action?: CoachAction;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function dowRate(completions: Set<string>, habit: Habit, days: Date[], dow: number): { scheduled: number; done: number; rate: number } {
  let scheduled = 0;
  let done = 0;
  for (const d of days) {
    if (d.getDay() !== dow) continue;
    const key = dayKey(d);
    if (!isScheduledOn(habit, d)) continue;
    scheduled++;
    if (completions.has(key)) done++;
  }
  return { scheduled, done, rate: scheduled > 0 ? done / scheduled : 0 };
}

/**
 * Detects deep behavioral patterns in the user's habits over the last 14-30 days and generates
 * actionable system suggestions that can be applied with a single tap.
 */
export function detectCoachInsights(
  habits: Habit[],
  t: Dictionary,
  localeTag: string,
  today: Date = new Date()
): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const activeHabits = habits.filter((h) => !isPaused(h));
  if (activeHabits.length === 0) return insights;

  // Scan last 14 days and last 28 days
  const days14: Date[] = [];
  for (let i = 13; i >= 0; i--) days14.push(addDays(today, -i));
  const days28: Date[] = [];
  for (let i = 27; i >= 0; i--) days28.push(addDays(today, -i));

  const habitSets = new Map<string, Set<string>>();
  for (const h of habits) habitSets.set(h.id, new Set(h.completions));

  // 1. Recurring missed days (e.g. "missed Workout 4 times in the last 2 weeks, always on Wednesdays")
  for (const h of activeHabits) {
    const comp = habitSets.get(h.id)!;
    const effectiveDays = scheduledDaysOn(h, dayKey(today)) ?? ALL_DAYS;
    if (effectiveDays.length <= 2) continue;

    for (const dow of effectiveDays) {
      const stats = dowRate(comp, h, days14, dow);
      if (stats.scheduled >= 2 && stats.done === 0) {
        // Find a better day not currently scheduled or a day with 100% success
        const otherDays = ALL_DAYS.filter((d) => !effectiveDays.includes(d));
        const targetDow = otherDays[0] ?? (dow === 6 ? 0 : dow + 1);
        const targetLabel = weekdayLabel(targetDow, localeTag, 'long');
        const badDayLabel = weekdayLabel(dow, localeTag, 'long');

        const newSchedule = effectiveDays.map((d) => (d === dow ? targetDow : d)).sort();

        insights.push({
          id: `missed-dow-${h.id}-${dow}`,
          type: 'recurringMissedDay',
          emoji: '⚠️',
          title: `${h.emoji} ${h.name}: ${badDayLabel} struggle`,
          habit: h,
          description: `You've missed ${h.name} ${stats.scheduled} times in the last 2 weeks, always on ${badDayLabel}s. Your ${badDayLabel} schedule appears overloaded. Move to ${targetLabel}?`,
          action: {
            habitId: h.id,
            change: { scheduledDays: newSchedule },
            buttonLabel: `Move to ${targetLabel}`,
          },
        });
        break;
      }
    }
  }

  // 2. Time-of-day failures (e.g. evening habit failing consistently)
  for (const h of activeHabits) {
    if (!h.reminderTime) continue;
    const hour = parseInt(h.reminderTime.split(':')[0], 10);
    if (hour >= 18) {
      const comp = habitSets.get(h.id)!;
      let scheduled = 0;
      let done = 0;
      for (const d of days14) {
        if (!isScheduledOn(h, d)) continue;
        scheduled++;
        if (comp.has(dayKey(d))) done++;
      }
      if (scheduled >= 5 && done / scheduled < 0.4) {
        insights.push({
          id: `time-failure-${h.id}`,
          type: 'timeOfDayFailure',
          emoji: '⏰',
          title: `${h.emoji} ${h.name}: Evening failure pattern`,
          habit: h,
          description: `Your ${h.name} habit drops to ${Math.round((done / scheduled) * 100)}% in the evening. Most evening habits fail due to decision fatigue. Shift to 08:30 AM?`,
          action: {
            habitId: h.id,
            change: { reminderTime: '08:30' },
            buttonLabel: 'Move to 08:30 AM',
          },
        });
      }
    }
  }

  // 3. Unrealistic targets (scheduled 7 days/week, doing 2-3 days)
  for (const h of activeHabits) {
    const curFreq = daysPerWeek(h.scheduledDays);
    if (curFreq < 5) continue;
    const comp = habitSets.get(h.id)!;
    let done14 = 0;
    let sched14 = 0;
    for (const d of days14) {
      if (!isScheduledOn(h, d)) continue;
      sched14++;
      if (comp.has(dayKey(d))) done14++;
    }
    if (sched14 >= 8 && done14 / sched14 <= 0.45) {
      const targetFreq = 3;
      // Select 3 best days
      const dowsWithRates = ALL_DAYS.map((dow) => ({ dow, ...dowRate(comp, h, days28, dow) }));
      const best3 = dowsWithRates.sort((a, b) => b.rate - a.rate).slice(0, targetFreq).map((x) => x.dow).sort();

      insights.push({
        id: `unrealistic-target-${h.id}`,
        type: 'unrealisticTarget',
        emoji: '🎯',
        title: `${h.emoji} ${h.name}: Target is causing friction`,
        habit: h,
        description: `You complete ${h.name} ${Math.round((done14 / sched14) * 100)}% of scheduled days. Reducing target from ${curFreq}×/week → 3×/week stabilizes consistency without guilt.`,
        action: {
          habitId: h.id,
          change: { scheduledDays: best3 },
          buttonLabel: `Reduce target to 3×/week`,
        },
      });
    }
  }

  // 4. Overloading on specific days
  const dayLoads = ALL_DAYS.map((dow) => {
    const count = activeHabits.filter((h) => (h.scheduledDays ?? ALL_DAYS).includes(dow)).length;
    return { dow, count };
  });
  const maxLoad = Math.max(...dayLoads.map((d) => d.count));
  if (maxLoad >= 5 && activeHabits.length >= 5) {
    const heavyDow = dayLoads.find((d) => d.count === maxLoad)!.dow;
    const heavyLabel = weekdayLabel(heavyDow, localeTag, 'long');
    const heavyHabit = activeHabits.find((h) => (h.scheduledDays ?? ALL_DAYS).includes(heavyDow) && h.priority !== 'high');

    if (heavyHabit) {
      const newDays = (heavyHabit.scheduledDays ?? ALL_DAYS).filter((d) => d !== heavyDow);
      insights.push({
        id: `overload-day-${heavyDow}`,
        type: 'overload',
        emoji: '⚖️',
        title: `${heavyLabel} overload detected`,
        habit: heavyHabit,
        description: `You have ${maxLoad} habits scheduled on ${heavyLabel}s. Lighten ${heavyLabel}s by freeing up ${heavyHabit.emoji} ${heavyHabit.name}?`,
        action: {
          habitId: heavyHabit.id,
          change: { scheduledDays: newDays },
          buttonLabel: `Remove ${heavyLabel} from ${heavyHabit.name}`,
        },
      });
    }
  }

  // 5. Successful routine recognition
  const highStreak = activeHabits.find((h) => {
    const comp = habitSets.get(h.id)!;
    let done = 0;
    for (const d of days14) if (comp.has(dayKey(d))) done++;
    return done >= 12;
  });
  if (highStreak) {
    insights.push({
      id: `success-routine-${highStreak.id}`,
      type: 'successfulRoutine',
      emoji: '🌟',
      title: `Rock solid: ${highStreak.emoji} ${highStreak.name}`,
      habit: highStreak,
      description: `You've achieved near-perfect consistency on ${highStreak.name} over the last 2 weeks! This routine is officially anchored into your identity.`,
    });
  }

  return insights.slice(0, 4);
}
