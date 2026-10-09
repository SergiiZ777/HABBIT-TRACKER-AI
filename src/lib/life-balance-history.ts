import { computeLifeBalance, type AreaBalance } from '@/lib/life-balance';
import { addDays, type Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';
import type { LifeArea } from '@/lib/life-areas';

export type BalanceSnapshot = {
  date: Date;
  label: string;
  areas: { area: LifeArea; score: number }[];
  overallScore: number;
};

export type BalanceTrendRange = 'monthly' | 'quarterly' | 'yearly';

export function computeBalanceHistory(
  habits: Habit[],
  t: Dictionary,
  range: BalanceTrendRange,
  today: Date,
  localeTag: string
): BalanceSnapshot[] {
  const points: { date: Date; labelFn: (d: Date) => string }[] = [];

  if (range === 'monthly') {
    for (let i = 4; i >= 0; i--) {
      const d = addDays(today, -i * 7);
      points.push({
        date: d,
        labelFn: (date) =>
          date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }),
      });
    }
  } else if (range === 'quarterly') {
    for (let i = 12; i >= 0; i--) {
      const d = addDays(today, -i * 7);
      points.push({
        date: d,
        labelFn: (date) =>
          date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 15);
      points.push({
        date: d,
        labelFn: (date) =>
          date.toLocaleDateString(localeTag, { month: 'short' }),
      });
    }
  }

  return points.map(({ date, labelFn }) => {
    const balance = computeLifeBalance(habits, t, date);
    return {
      date,
      label: labelFn(date),
      areas: balance.areas.map((a: AreaBalance) => ({ area: a.area, score: a.score })),
      overallScore: balance.overallScore,
    };
  });
}
