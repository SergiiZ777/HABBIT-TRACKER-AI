import { computeHabitHealth } from '@/lib/habit-health';
import { isPaused, type Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';
import { areaLabel, habitArea, LIFE_AREAS, type LifeArea } from '@/lib/life-areas';

export type AreaBalance = {
  area: LifeArea;
  score: number;
  habitCount: number;
  trend: 'up' | 'down' | 'flat';
  trendDelta: number;
  topHabitId: string | null;
  weakHabitId: string | null;
};

export type ImbalanceAlert = {
  id: string;
  type: 'diverging' | 'declining' | 'neglected' | 'overinvested';
  emoji: string;
  headline: string;
  detail: string;
  severity: number;
};

export type LifeBalance = {
  areas: AreaBalance[];
  overallScore: number;
  imbalances: ImbalanceAlert[];
  hasEnoughData: boolean;
};

export function computeLifeBalance(
  habits: Habit[],
  t: Dictionary,
  today: Date = new Date()
): LifeBalance {
  const active = habits.filter((h) => !isPaused(h));
  const grouped = new Map<LifeArea, Habit[]>();
  for (const h of active) {
    const area = habitArea(h);
    const list = grouped.get(area);
    if (list) list.push(h);
    else grouped.set(area, [h]);
  }

  const areas: AreaBalance[] = [];

  for (const [area, areaHabits] of grouped) {
    let totalWeight = 0;
    let weightedScore = 0;
    let weightedDelta = 0;
    let topId: string | null = null;
    let topScore = -1;
    let weakId: string | null = null;
    let weakScore = 101;

    for (const h of areaHabits) {
      const health = computeHabitHealth(h, t, today);
      const w = h.priority === 'high' ? 1.5 : 1;
      totalWeight += w;
      weightedScore += health.score * w;
      weightedDelta += health.trendDelta * w;

      if (health.score > topScore) {
        topScore = health.score;
        topId = h.id;
      }
      if (health.score < weakScore) {
        weakScore = health.score;
        weakId = h.id;
      }
    }

    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const trendDelta = totalWeight > 0 ? Math.round(weightedDelta / totalWeight) : 0;
    const trend = trendDelta >= 8 ? 'up' : trendDelta <= -8 ? 'down' : 'flat';

    areas.push({ area, score, habitCount: areaHabits.length, trend, trendDelta, topHabitId: topId, weakHabitId: weakId });
  }

  const overallScore = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length) : 0;
  const hasEnoughData = areas.length >= 3;

  const imbalances = detectImbalances(areas, t);

  return { areas, overallScore, imbalances, hasEnoughData };
}

function detectImbalances(areas: AreaBalance[], t: Dictionary): ImbalanceAlert[] {
  const alerts: ImbalanceAlert[] = [];

  // Diverging: one area up while another is down
  for (const rising of areas) {
    if (rising.trendDelta < 8) continue;
    for (const falling of areas) {
      if (falling.area === rising.area || falling.trendDelta > -8) continue;
      const severity = Math.abs(rising.trendDelta) + Math.abs(falling.trendDelta);
      const rLabel = areaLabel(t, rising.area);
      const fLabel = areaLabel(t, falling.area);
      alerts.push({
        id: `diverging-${rising.area}-${falling.area}`,
        type: 'diverging',
        emoji: '⚖️',
        headline: t.imbalanceDiverging(rLabel, fLabel),
        detail: t.imbalanceDivergingDetail(rLabel, rising.trendDelta, fLabel, falling.trendDelta),
        severity,
      });
    }
  }

  // Declining: area trending down with score < 50
  for (const a of areas) {
    if (a.trend !== 'down' || a.score >= 50) continue;
    const label = areaLabel(t, a.area);
    alerts.push({
      id: `declining-${a.area}`,
      type: 'declining',
      emoji: '📉',
      headline: t.imbalanceDeclining(label),
      detail: t.imbalanceDecliningDetail(label, a.score, a.trendDelta),
      severity: 100 - a.score + Math.abs(a.trendDelta),
    });
  }

  // Neglected: life area with zero habits
  const populated = new Set(areas.map((a) => a.area));
  for (const area of LIFE_AREAS) {
    if (populated.has(area)) continue;
    const label = areaLabel(t, area);
    alerts.push({
      id: `neglected-${area}`,
      type: 'neglected',
      emoji: '🔍',
      headline: t.imbalanceNeglected(label),
      detail: t.imbalanceNeglectedDetail,
      severity: 20,
    });
  }

  // Overinvested: one area >= 85 while 2+ others below 50
  const weak = areas.filter((a) => a.score < 50);
  if (weak.length >= 2) {
    for (const strong of areas) {
      if (strong.score < 85) continue;
      const label = areaLabel(t, strong.area);
      const weakLabels = weak.map((w) => areaLabel(t, w.area)).join(', ');
      alerts.push({
        id: `overinvested-${strong.area}`,
        type: 'overinvested',
        emoji: '🎯',
        headline: t.imbalanceOverinvested(label, weak.length),
        detail: t.imbalanceOverinvestedDetail(label, strong.score, weakLabels),
        severity: weak.reduce((s, w) => s + (50 - w.score), 0) / weak.length,
      });
    }
  }

  alerts.sort((a, b) => b.severity - a.severity);
  return alerts.slice(0, 3);
}
