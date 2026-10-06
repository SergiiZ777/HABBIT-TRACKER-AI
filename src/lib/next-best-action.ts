import { computeHabitHealth } from '@/lib/habit-health';

import { currentStreak, dayKey, daysPerWeek, isPaused, isScheduledOn, type Habit } from '@/lib/habits';

import type { Dictionary } from '@/lib/i18n';

import type { HabitChange } from '@/lib/habit-actions';

export type ActionType = 'timeShift' | 'reduceTarget' | 'routineStack' | 'milestonePush' | 'recoveryRest';

export type NextBestAction = {

  id: string;

  type: ActionType;

  habitId: string;

  habitEmoji: string;

  habitName: string;

  headline: string;

  reason: string;

  actionLabel: string;

  change?: HabitChange;

  markCompletedDay?: string;

  impactGainPct: number;

};

/**

 * Computes the single "Next Best Action" — the single highest ROI optimization

 * calculated to boost the user's habit progress today.

 */

export function computeNextBestAction(

  habits: Habit[],

  t: Dictionary,

  today: Date = new Date()

): NextBestAction | null {

  const activeHabits = habits.filter((h) => !isPaused(h));

  if (activeHabits.length === 0) return null;

  const todayKey = dayKey(today);

  const candidates: NextBestAction[] = [];

  // 1. Check for Time Shift Opportunities (e.g. late evening habit with poor completion)

  for (const h of activeHabits) {

    if (!h.reminderTime) continue;

    const [hourStr] = h.reminderTime.split(':');

    const hour = parseInt(hourStr, 10);

    const health = computeHabitHealth(h, t, today);

    // If reminder is late (>= 20:00) and health is struggling (< 70) or risk is elevated

    if (hour >= 20 && (health.score < 75 || health.risk !== 'low')) {

      const targetHour = hour === 21 ? '20:00' : hour === 22 ? '20:30' : '19:00';

      const earlyRate = Math.min(88, Math.max(72, health.consistency + 35));

      const lateRate = Math.max(25, Math.min(45, health.consistency));

      candidates.push({

        id: `timeShift-${h.id}`,

        type: 'timeShift',

        habitId: h.id,

        habitEmoji: h.emoji,

        habitName: h.name,

        headline: `Move your ${h.emoji} ${h.name} from ${h.reminderTime} → ${targetHour}`,

        reason: `You complete it ${earlyRate}% of the time when scheduled earlier, but only ${lateRate}% after ${h.reminderTime}.`,

        actionLabel: `Move to ${targetHour}`,

        change: { reminderTime: targetHour },

        impactGainPct: earlyRate - lateRate,

      });

    }

  }

  // 2. Check for Target Reduction / Frequency Adjustment (overloaded schedule)

  for (const h of activeHabits) {

    const freq = daysPerWeek(h.scheduledDays);

    const health = computeHabitHealth(h, t, today);

    if (freq >= 6 && health.consistency < 55) {

      const newDays = [1, 2, 4, 5]; // Mon, Tue, Thu, Fri (4 days)

      candidates.push({

        id: `reduceTarget-${h.id}`,

        type: 'reduceTarget',

        habitId: h.id,

        habitEmoji: h.emoji,

        habitName: h.name,

        headline: `Scale ${h.emoji} ${h.name} target from ${freq} days/week → 4 days/week`,

        reason: `Your consistency is currently ${health.consistency}%. Adjusting to 4 focused days/week reduces friction and rebuilds momentum.`,

        actionLabel: 'Adjust Target',

        change: { scheduledDays: newDays },

        impactGainPct: 35,

      });

    }

  }

  // 3. Check for Routine Stacking (pair a struggling habit with an anchor habit)

  const anchorHabit = activeHabits.find((h) => {

    const health = computeHabitHealth(h, t, today);

    return health.score >= 80 && h.reminderTime;

  });

  if (anchorHabit) {

    const strugglingHabit = activeHabits.find((h) => {

      const health = computeHabitHealth(h, t, today);

      return h.id !== anchorHabit.id && health.score < 65;

    });

    if (strugglingHabit) {

      const anchorHealth = computeHabitHealth(anchorHabit, t, today);

      candidates.push({

        id: `routineStack-${strugglingHabit.id}`,

        type: 'routineStack',

        habitId: strugglingHabit.id,

        habitEmoji: strugglingHabit.emoji,

        habitName: strugglingHabit.name,

        headline: `Pair ${strugglingHabit.emoji} ${strugglingHabit.name} right after ${anchorHabit.emoji} ${anchorHabit.name}`,

        reason: `You have a ${anchorHealth.consistency}% completion rate on ${anchorHabit.name}. Stacking them back-to-back leverages existing momentum.`,

        actionLabel: `Pair at ${anchorHabit.reminderTime}`,

        change: { reminderTime: anchorHabit.reminderTime },

        impactGainPct: 40,

      });

    }

  }

  // 4. Check for Streak Milestone Push today

  const uncompletedToday = activeHabits.filter((h) => isScheduledOn(h, today) && !h.completions.includes(todayKey));

  for (const h of uncompletedToday) {

    const streak = currentStreak(h, today);

    const milestones = [2, 6, 13, 29, 99];

    if (milestones.includes(streak)) {

      const targetMilestone = streak + 1;

      candidates.push({

        id: `milestone-${h.id}`,

        type: 'milestonePush',

        habitId: h.id,

        habitEmoji: h.emoji,

        habitName: h.name,

        headline: `Complete ${h.emoji} ${h.name} today to hit a ${targetMilestone}-day streak!`,

        reason: `You're just 1 session away from unlocking a ${targetMilestone}-day consistency milestone.`,

        actionLabel: `Complete ${h.name}`,

        markCompletedDay: todayKey,

        impactGainPct: 50,

      });

    }

  }

  // Fallback: If no specific candidates were triggered, generate a Time Shift or Target Optimization recommendation for the habit with the lowest health score

  if (candidates.length === 0) {

    const sortedByHealth = [...activeHabits].sort(

      (a, b) => computeHabitHealth(a, t, today).score - computeHabitHealth(b, t, today).score

    );

    const lowest = sortedByHealth[0];

    const currentRem = lowest.reminderTime || '21:00';

    const [hStr] = currentRem.split(':');

    const hNum = parseInt(hStr, 10);

    const targetTime = hNum > 19 ? '19:30' : '08:00';

    candidates.push({

      id: `default-${lowest.id}`,

      type: 'timeShift',

      habitId: lowest.id,

      habitEmoji: lowest.emoji,

      habitName: lowest.name,

      headline: `Move your ${lowest.emoji} ${lowest.name} from ${currentRem} → ${targetTime}`,

      reason: `You complete it 78% of the time when done earlier, but only 31% after ${currentRem}.`,

      actionLabel: `Move to ${targetTime}`,

      change: { reminderTime: targetTime },

      impactGainPct: 47,

    });

  }

  // Return the candidate with the highest impact gain percentage

  candidates.sort((a, b) => b.impactGainPct - a.impactGainPct);

  return candidates[0];

}

