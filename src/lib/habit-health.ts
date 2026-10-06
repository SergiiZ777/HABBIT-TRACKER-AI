import { addDays, daysPerWeek, dayKey, isPaused, isScheduledOn, type Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';

export type TrendDirection = 'up' | 'down' | 'flat';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type AbandonmentRisk = 'low' | 'medium' | 'high';

export type HabitHealth = {
  score: number; // 0 - 100
  consistency: number; // 0 - 100
  frequency: number; // 0 - 100
  trend: TrendDirection;
  trendDelta: number; // percentage point change
  difficulty: DifficultyLevel;
  risk: AbandonmentRisk;
  explanation: string;
  badgeColor: string;
};

/**
 * Calculates a comprehensive Habit Health Score (0-100) based on 30-day consistency,
 * 14-day recent trend, scheduling frequency, and abandonment risk metrics.
 */
export function computeHabitHealth(
  habit: Habit,
  t: Dictionary,
  today: Date = new Date()
): HabitHealth {
  if (isPaused(habit)) {
    return {
      score: 0,
      consistency: 0,
      frequency: 0,
      trend: 'flat',
      trendDelta: 0,
      difficulty: 'medium',
      risk: 'high',
      explanation: 'Habit is currently paused. Resume when you are ready to rebuild consistency.',
      badgeColor: '#94a3b8',
    };
  }

  const compSet = new Set(habit.completions);
  const createdKey = dayKey(new Date(habit.createdAt));

  // Collect days in last 14 days and previous 14 days (15-28 days ago)
  const last14: Date[] = [];
  for (let i = 13; i >= 0; i--) last14.push(addDays(today, -i));

  const prev14: Date[] = [];
  for (let i = 27; i >= 14; i--) prev14.push(addDays(today, -i));

  // 14-day stats
  let done14 = 0, sched14 = 0;
  let consecutiveMisses = 0;
  let scanningMisses = true;

  for (let i = last14.length - 1; i >= 0; i--) {
    const d = last14[i];
    const key = dayKey(d);
    if (key < createdKey || !isScheduledOn(habit, d)) continue;
    sched14++;
    if (compSet.has(key)) {
      done14++;
      scanningMisses = false;
    } else if (scanningMisses) {
      consecutiveMisses++;
    }
  }

  // Previous 14-day stats
  let donePrev14 = 0, schedPrev14 = 0;
  for (const d of prev14) {
    const key = dayKey(d);
    if (key < createdKey || !isScheduledOn(habit, d)) continue;
    schedPrev14++;
    if (compSet.has(key)) donePrev14++;
  }

  const rate14 = sched14 > 0 ? (done14 / sched14) * 100 : 100;
  const ratePrev14 = schedPrev14 > 0 ? (donePrev14 / schedPrev14) * 100 : rate14;

  const trendDelta = Math.round(rate14 - ratePrev14);
  const trend: TrendDirection = trendDelta >= 8 ? 'up' : trendDelta <= -8 ? 'down' : 'flat';

  const consistency = Math.round(rate14);
  const scheduledPerWeek = daysPerWeek(habit.scheduledDays);
  const frequency = Math.round((scheduledPerWeek / 7) * 100);

  // Difficulty
  let difficulty: DifficultyLevel = 'medium';
  if (scheduledPerWeek >= 6 && rate14 < 60) difficulty = 'hard';
  else if (scheduledPerWeek <= 3 || rate14 >= 85) difficulty = 'easy';

  // Abandonment Risk
  let risk: AbandonmentRisk = 'low';
  if (consecutiveMisses >= 4 || rate14 < 35 || trendDelta <= -25) {
    risk = 'high';
  } else if (consecutiveMisses >= 2 || rate14 < 65 || trendDelta <= -12) {
    risk = 'medium';
  }

  // Overall Score Calculation (0-100)
  const momentumBonus = Math.min(15, (habit.completions.length / 30) * 15);
  let rawScore = 0.55 * consistency + 0.3 * (scheduledPerWeek * 12) + momentumBonus;

  if (trend === 'up') rawScore += 5;
  if (trend === 'down') rawScore -= 10;
  if (risk === 'high') rawScore -= 20;
  if (risk === 'medium') rawScore -= 8;

  const score = Math.max(5, Math.min(99, Math.round(rawScore)));

  // Badge Color
  const badgeColor = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';

  // AI Explanation Copy
  let explanation = '';
  if (score >= 80) {
    explanation = "This habit is healthy. Don't increase the target yet. Maintain it for another 2 weeks.";
  } else if (score >= 60) {
    explanation = 'Solid progress! Keep your current schedule and protect against weekend misses.';
  } else if (risk === 'high') {
    explanation = `High risk of abandonment. Missed ${consecutiveMisses} sessions in a row. Consider reducing target or changing reminder time.`;
  } else if (score >= 40) {
    explanation = 'Friction detected. Reduce weekly frequency or move to an earlier slot to rebuild momentum.';
  } else {
    explanation = 'Struggling habit. Scale back the target or pause briefly to reset.';
  }

  return {
    score,
    consistency,
    frequency,
    trend,
    trendDelta,
    difficulty,
    risk,
    explanation,
    badgeColor,
  };
}
