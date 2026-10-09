import { computeHabitHealth } from '@/lib/habit-health';

import { currentStreak, dayKey, daysPerWeek, isPaused, isScheduledOn, type Habit } from '@/lib/habits';

import type { Dictionary } from '@/lib/i18n';

import type { HabitChange } from '@/lib/habit-actions';

import { getMoodForDay } from '@/lib/mood';

import { getRecentDismissals, getRecommendationHistory } from '@/lib/recommendation-log';

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

        headline: t.nbaTimeShiftHeadline(h.emoji, h.name, h.reminderTime!, targetHour),

        reason: t.nbaTimeShiftReason(earlyRate, lateRate, h.reminderTime!),

        actionLabel: t.nbaTimeShiftAction(targetHour),

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

        headline: t.nbaReduceTargetHeadline(h.emoji, h.name, freq, 4),

        reason: t.nbaReduceTargetReason(h.name, health.consistency),

        actionLabel: t.nbaReduceTargetAction,

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

        headline: t.nbaRoutineStackHeadline(strugglingHabit.emoji, strugglingHabit.name, anchorHabit.emoji, anchorHabit.name),

        reason: t.nbaRoutineStackReason(anchorHealth.consistency, anchorHabit.name),

        actionLabel: t.nbaRoutineStackAction(anchorHabit.reminderTime!),

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

        headline: t.nbaMilestoneHeadline(h.emoji, h.name, targetMilestone),

        reason: t.nbaMilestoneReason(targetMilestone),

        actionLabel: t.nbaMilestoneAction(h.name),

        markCompletedDay: todayKey,

        impactGainPct: 50,

      });

    }

  }

  // 5. Recovery Rest — burnout detection
  for (const h of activeHabits) {
    const health = computeHabitHealth(h, t, today);
    if (health.risk === 'high' && health.trend === 'down' && health.consistency < 40) {
      let impact = 45;
      const mood = getMoodForDay(todayKey);
      if (mood && mood.energy <= 2) impact = 55;
      candidates.push({
        id: `recoveryRest-${h.id}`,
        type: 'recoveryRest',
        habitId: h.id,
        habitEmoji: h.emoji,
        habitName: h.name,
        headline: t.nbaRecoveryRestHeadline(h.emoji, h.name),
        reason: t.nbaRecoveryRestReason(h.name, health.consistency),
        actionLabel: t.nbaRecoveryRestAction,
        change: { pause: true },
        impactGainPct: impact,
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

      headline: t.nbaTimeShiftHeadline(lowest.emoji, lowest.name, currentRem, targetTime),

      reason: t.nbaTimeShiftReason(78, 31, currentRem),

      actionLabel: t.nbaTimeShiftAction(targetTime),

      change: { reminderTime: targetTime },

      impactGainPct: 47,

    });

  }

  // Filter out recently dismissed recommendations
  const dismissed = getRecentDismissals(3);
  const dismissedKeys = new Set(dismissed.map((e) => `${e.type}:${e.habitId}`));
  const filtered = candidates.filter((c) => !dismissedKeys.has(`${c.type}:${c.habitId}`));
  const final = filtered.length > 0 ? filtered : candidates;

  for (const c of final) {
    const history = getRecommendationHistory(c.habitId);
    const sameType = history.filter((e) => e.type === c.type);
    if (sameType.some((e) => e.verdict === 'harmful')) {
      c.impactGainPct = Math.round(c.impactGainPct * 0.5);
    } else if (sameType.some((e) => e.verdict === 'effective')) {
      c.impactGainPct = Math.round(c.impactGainPct * 1.1);
    }
  }

  final.sort((a, b) => b.impactGainPct - a.impactGainPct);

  return final[0];

}

