import { currentStreak, type Habit } from '@/lib/habits';
import { daysSinceLastCompletion } from '@/lib/motivation';

const STREAK_MILESTONES = [3, 7, 30, 100];

export type Recommendation = {
  habitId: string;
  habitEmoji: string;
  habitName: string;
  reason: 'closeMilestone' | 'longestStreak' | 'mostNeglected';
  detail: number;
};

export function computeRecommendation(
  habits: Habit[],
  day: string,
  today: Date,
): Recommendation | null {
  const uncompleted = habits.filter((h) => !h.completions.includes(day));
  if (uncompleted.length === 0) return null;

  const isHighPriority = (h: Habit) => h.priority === 'high';

  // Tier 1: one completion away from a streak milestone
  let closestMilestone: { habit: Habit; target: number } | undefined;
  for (const h of uncompleted) {
    const streak = currentStreak(h, today);
    const target = STREAK_MILESTONES.find((m) => m === streak + 1);
    if (
      target &&
      (!closestMilestone ||
        target > closestMilestone.target ||
        (target === closestMilestone.target && isHighPriority(h) && !isHighPriority(closestMilestone.habit)))
    ) {
      closestMilestone = { habit: h, target };
    }
  }
  if (closestMilestone) {
    return {
      habitId: closestMilestone.habit.id,
      habitEmoji: closestMilestone.habit.emoji,
      habitName: closestMilestone.habit.name,
      reason: 'closeMilestone',
      detail: closestMilestone.target,
    };
  }

  // Tier 2: longest active streak (most to lose)
  let longestStreak: { habit: Habit; streak: number } | undefined;
  for (const h of uncompleted) {
    const s = currentStreak(h, today);
    if (
      s > 0 &&
      (!longestStreak ||
        s > longestStreak.streak ||
        (s === longestStreak.streak && isHighPriority(h) && !isHighPriority(longestStreak.habit)))
    ) {
      longestStreak = { habit: h, streak: s };
    }
  }
  if (longestStreak) {
    return {
      habitId: longestStreak.habit.id,
      habitEmoji: longestStreak.habit.emoji,
      habitName: longestStreak.habit.name,
      reason: 'longestStreak',
      detail: longestStreak.streak,
    };
  }

  // Tier 3: most neglected
  let mostNeglected: { habit: Habit; gap: number } | undefined;
  for (const h of uncompleted) {
    const gap = daysSinceLastCompletion(h, today);
    if (
      Number.isFinite(gap) &&
      gap >= 2 &&
      (!mostNeglected ||
        gap > mostNeglected.gap ||
        (gap === mostNeglected.gap && isHighPriority(h) && !isHighPriority(mostNeglected.habit)))
    ) {
      mostNeglected = { habit: h, gap };
    }
  }
  if (mostNeglected) {
    return {
      habitId: mostNeglected.habit.id,
      habitEmoji: mostNeglected.habit.emoji,
      habitName: mostNeglected.habit.name,
      reason: 'mostNeglected',
      detail: mostNeglected.gap,
    };
  }

  return null;
}
