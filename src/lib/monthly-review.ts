import { computeBadges } from '@/lib/achievements';
import { getDeviceId } from '@/lib/backup';
import type { HabitChange } from '@/lib/habit-actions';
import { addDays, daysPerWeek, dayKey, isPaused, isScheduledOn, scheduledDaysOn, type Habit } from '@/lib/habits';
import type { Locale } from '@/lib/i18n';
import { habitArea, LIFE_AREAS, type LifeArea } from '@/lib/life-areas';
import { getMissReasons } from '@/lib/miss-reasons';
import type { AppliedPlan, Reflection } from '@/lib/monthly-store';

const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c33477830';
const COACH_WEBHOOK_KEY = process.env.EXPO_PUBLIC_COACH_KEY ?? '';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_MORNING_TIME = '08:00';

// ---------- Months ----------

export type MonthRef = { year: number; month: number };

export function monthOf(date: Date): MonthRef {
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function monthKey(m: MonthRef): string {
  return `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  return monthOf(new Date(m.year, m.month + delta, 1));
}

export function compareMonths(a: MonthRef, b: MonthRef): number {
  return (a.year - b.year) * 12 + (a.month - b.month);
}

/** During the first week of a month the just-finished month is the one worth reviewing. */
export function defaultReviewMonth(today: Date = new Date()): MonthRef {
  const current = monthOf(today);
  return today.getDate() <= 7 ? shiftMonth(current, -1) : current;
}

export function monthLabel(m: MonthRef, localeTag: string, withYear = false): string {
  const label = new Date(m.year, m.month, 15).toLocaleDateString(
    localeTag,
    withYear ? { month: 'long', year: 'numeric' } : { month: 'long' }
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function hourOf(time: string | undefined): number | null {
  if (!time) return null;
  const h = parseInt(time.split(':')[0], 10);
  return Number.isFinite(h) ? h : null;
}

// ---------- Range statistics ----------

type HabitStats = {
  scheduled: number;
  done: number;
  /** Current consecutive-done run while scanning (internal). */
  run: number;
  bestRun: number;
  dowScheduled: number[];
  dowDone: number[];
  lateScheduled: number;
  lateMisses: number;
};

type MonthAgg = {
  ref: MonthRef;
  startKey: string;
  endKey: string;
  dayCount: number;
  totalDays: number;
  complete: boolean;
  scheduled: number;
  done: number;
  rate: number | null;
  perfectDays: number;
  perHabit: Map<string, HabitStats>;
};

const pct = (done: number, total: number): number | null => (total > 0 ? Math.round((done / total) * 100) : null);

function aggregateMonth(habits: Habit[], ref: MonthRef, today: Date): MonthAgg {
  const first = new Date(ref.year, ref.month, 1, 12);
  const last = new Date(ref.year, ref.month + 1, 0, 12);
  const todayKey = dayKey(today);
  // An in-progress month stops at yesterday: today's habits aren't "missed" yet.
  const yesterday = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12), -1);
  const end = dayKey(last) < todayKey ? last : yesterday;
  const totalDays = last.getDate();

  const perHabit = new Map<string, HabitStats>();
  const sets = new Map<string, Set<string>>();
  const created = new Map<string, string>();
  for (const h of habits) {
    sets.set(h.id, new Set(h.completions));
    created.set(h.id, dayKey(new Date(h.createdAt)));
  }

  const days: Date[] = [];
  for (let d = first; dayKey(d) <= dayKey(end); d = addDays(d, 1)) days.push(d);
  const lateFrom = days.length - 10;

  let scheduled = 0;
  let done = 0;
  let perfectDays = 0;

  days.forEach((day, i) => {
    const key = dayKey(day);
    const dow = day.getDay();
    let dayTotal = 0;
    let dayDone = 0;
    for (const h of habits) {
      if (key < created.get(h.id)! || !isScheduledOn(h, day)) continue;
      let s = perHabit.get(h.id);
      if (!s) {
        s = { scheduled: 0, done: 0, run: 0, bestRun: 0, dowScheduled: Array(7).fill(0), dowDone: Array(7).fill(0), lateScheduled: 0, lateMisses: 0 };
        perHabit.set(h.id, s);
      }
      s.scheduled++;
      s.dowScheduled[dow]++;
      if (i >= lateFrom) s.lateScheduled++;
      dayTotal++;
      if (sets.get(h.id)!.has(key)) {
        s.done++;
        s.dowDone[dow]++;
        dayDone++;
        s.run++;
        s.bestRun = Math.max(s.bestRun, s.run);
      } else {
        s.run = 0;
        if (i >= lateFrom) s.lateMisses++;
      }
    }
    scheduled += dayTotal;
    done += dayDone;
    if (dayTotal > 0 && dayDone === dayTotal) perfectDays++;
  });

  return {
    ref,
    startKey: dayKey(first),
    endKey: dayKey(end),
    dayCount: days.length,
    totalDays,
    complete: dayKey(last) < todayKey,
    scheduled,
    done,
    rate: pct(done, scheduled),
    perfectDays,
    perHabit,
  };
}

// ---------- Public types ----------

export type SuggestedAction = { habitId: string; change: HabitChange };

export type Pattern =
  | { kind: 'evening'; time: string; eveningRate: number; morningRate: number }
  | { kind: 'weekend'; share: number }
  | { kind: 'weekday'; dow: number; share: number; dowRate: number; otherRate: number }
  | { kind: 'fading'; share: number };

export type Advice =
  | { kind: 'keep' }
  | { kind: 'automatic' }
  | { kind: 'steady' }
  | { kind: 'forming' }
  | { kind: 'noData' }
  | { kind: 'watch'; from: number; to: number }
  | { kind: 'reduce'; from: number; to: number; action: SuggestedAction }
  | { kind: 'dropDay'; dow: number; dowRate: number; otherRate: number; action: SuggestedAction }
  | { kind: 'weekendOff'; action: SuggestedAction }
  | { kind: 'morning'; eveningRate: number; morningRate: number; time: string; action: SuggestedAction }
  | { kind: 'pause'; rate: number; action: SuggestedAction };

export type ActionAdvice = Extract<Advice, { action: SuggestedAction }>;

export function adviceAction(advice: Advice): SuggestedAction | null {
  return 'action' in advice ? advice.action : null;
}

export type HabitReport = {
  habit: Habit;
  area: LifeArea;
  scheduled: number;
  done: number;
  rate: number;
  prevRate: number | null;
  prevDone: number | null;
  delta: number | null;
  trend: 'up' | 'down' | 'flat';
  bestRun: number;
  bestDow: number | null;
  worstDow: number | null;
  /** Weekly frequency in effect during the reviewed month. */
  daysPerWeek: number;
  /** Reminder time in effect during the reviewed month. */
  reminderTime?: string;
  isNew: boolean;
  advice: Advice;
};

export type AreaRow = { area: LifeArea; score: number; prevScore: number | null; delta: number | null; habitCount: number };

export type Win =
  | { kind: 'moreDays'; habit: Habit; done: number; scheduled: number; prevDone: number }
  | { kind: 'longRun'; habit: Habit; days: number }
  | { kind: 'rateUp'; habit: Habit; percent: number }
  | { kind: 'highRate'; habit: Habit; rate: number }
  | { kind: 'established'; count: number }
  | { kind: 'perfectDays'; count: number };

export type Problem = {
  habit: Habit;
  kind: 'drop' | 'low';
  prevRate: number | null;
  rate: number;
  pattern: Pattern | null;
  fix: ActionAdvice | null;
};

export type PriorityKind = 'fix' | 'reduce' | 'morning' | 'pause' | 'protect' | 'grow';

export type Priority = {
  kind: PriorityKind;
  impact: 'high' | 'medium' | 'low';
  habit?: Habit;
  /** Percentage-point drop (for 'fix' on a declining habit). */
  drop?: number;
  rate?: number;
  advice?: ActionAdvice;
};

export type MonthlyPlan = {
  from: MonthRef;
  to: MonthRef;
  keep: Habit[];
  change: { habit: Habit; advice: ActionAdvice }[];
  pause: Habit[];
  canAddNew: boolean;
  focus: 'consistency' | 'stabilize' | 'growth' | 'maintain';
  priorityHabits: { habit: Habit; days: number }[];
};

export type YearProgress = {
  startMonth: MonthRef;
  endMonth: MonthRef;
  startRate: number;
  endRate: number;
  established: number;
  abandoned: number;
  totalCompletions: number;
  verdict:
    | { kind: 'bestYear' }
    | { kind: 'improving' }
    | { kind: 'steady' }
    | { kind: 'declining'; peak: MonthRef; months: number; overload: boolean };
};

export type MonthlyReview = {
  month: MonthRef;
  prevMonth: MonthRef;
  nextMonth: MonthRef;
  complete: boolean;
  dayCount: number;
  totalDays: number;
  hasData: boolean;
  consistency: number;
  prevConsistency: number | null;
  done: number;
  scheduled: number;
  perfectDays: number;
  bestStreak: { habit: Habit; days: number } | null;
  improvedCount: number;
  declinedCount: number;
  goals: { achieved: number; total: number } | null;
  newBadges: number;
  areas: AreaRow[];
  wins: Win[];
  problems: Problem[];
  habits: HabitReport[];
  priorities: Priority[];
  plan: MonthlyPlan;
  year: YearProgress | null;
  isBestMonthOfYear: boolean;
  eveningWeak: { eveningRate: number; morningRate: number } | null;
  driver: Habit | null;
};

// ---------- Helpers ----------

function dowRate(s: HabitStats, dow: number): number | null {
  return s.dowScheduled[dow] > 0 ? s.dowDone[dow] / s.dowScheduled[dow] : null;
}

function bestAndWorstDow(s: HabitStats): { best: number | null; worst: number | null } {
  let best: number | null = null;
  let worst: number | null = null;
  let bestR = -1;
  let worstR = 2;
  for (const dow of ALL_DAYS) {
    if (s.dowScheduled[dow] < 2) continue;
    const r = s.dowDone[dow] / s.dowScheduled[dow];
    if (r > bestR) [bestR, best] = [r, dow];
    if (r < worstR) [worstR, worst] = [r, dow];
  }
  if (best === worst || bestR - worstR < 0.15) return { best, worst: null };
  return { best, worst };
}

/** Keeps the `target` weekdays the user actually completes most often. */
function reducedSchedule(effective: number[], s: HabitStats, target: number): number[] {
  const weekdayFirst = (d: number) => (d === 0 || d === 6 ? 1 : 0);
  return [...effective]
    .sort((a, b) => (dowRate(s, b) ?? 0.5) - (dowRate(s, a) ?? 0.5) || weekdayFirst(a) - weekdayFirst(b) || a - b)
    .slice(0, target)
    .sort((a, b) => a - b);
}

/** Make the target what the user really manages (plus a little), never below 2×/week. */
function reduceTarget(current: number, rate: number): number {
  return Math.max(2, Math.min(current - 1, Math.ceil((current * rate) / 100)));
}

function detectPattern(
  s: HabitStats,
  rate: number,
  reminder: string | undefined,
  slots: { morning: number; evening: number } | null
): Pattern | null {
  const misses = s.scheduled - s.done;
  if (misses < 3) return null;

  const hour = hourOf(reminder);
  if (reminder && hour !== null && hour >= 18 && slots && slots.morning - slots.evening >= 15) {
    return { kind: 'evening', time: reminder, eveningRate: slots.evening, morningRate: slots.morning };
  }

  const wkScheduled = s.dowScheduled[0] + s.dowScheduled[6];
  const wkMisses = wkScheduled - s.dowDone[0] - s.dowDone[6];
  const wkShare = wkMisses / misses;
  if (wkScheduled >= 3 && wkShare >= 0.6 && wkShare - wkScheduled / s.scheduled >= 0.25) {
    return { kind: 'weekend', share: Math.round(wkShare * 100) };
  }

  const { worst } = bestAndWorstDow(s);
  if (worst !== null) {
    const worstRate = Math.round((dowRate(s, worst) ?? 0) * 100);
    const otherSched = s.scheduled - s.dowScheduled[worst];
    const otherRate = pct(s.done - s.dowDone[worst], otherSched) ?? rate;
    if (otherRate - worstRate >= 25) {
      const share = Math.round(((s.dowScheduled[worst] - s.dowDone[worst]) / misses) * 100);
      return { kind: 'weekday', dow: worst, share, dowRate: worstRate, otherRate };
    }
  }

  if (s.lateScheduled >= 5) {
    const lateShare = s.lateMisses / misses;
    if (lateShare >= 0.6 && lateShare - s.lateScheduled / s.scheduled >= 0.2) {
      return { kind: 'fading', share: Math.round(lateShare * 100) };
    }
  }
  return null;
}

type FixContext = {
  habit: Habit;
  s: HabitStats;
  rate: number;
  prevRate: number | null;
  effective: number[];
  pattern: Pattern | null;
  overloaded: boolean;
  morningTime: string;
};

/** The single most useful change for a struggling habit — usually doing less, not more. */
function fixFor({ habit, s, rate, prevRate, effective, pattern, overloaded, morningTime }: FixContext): ActionAdvice | null {
  const n = effective.length;
  const action = (change: HabitChange): SuggestedAction => ({ habitId: habit.id, change });

  if (pattern?.kind === 'evening') {
    const change: HabitChange = { reminderTime: morningTime };
    if (rate < 50 && n >= 5) change.scheduledDays = reducedSchedule(effective, s, reduceTarget(n, rate));
    return { kind: 'morning', eveningRate: pattern.eveningRate, morningRate: pattern.morningRate, time: morningTime, action: action(change) };
  }
  if (pattern?.kind === 'weekend') {
    const days = effective.filter((d) => d !== 0 && d !== 6);
    if (days.length >= 2 && days.length < n) return { kind: 'weekendOff', action: action({ scheduledDays: days }) };
  }
  if (pattern?.kind === 'weekday' && n >= 3) {
    return {
      kind: 'dropDay',
      dow: pattern.dow,
      dowRate: pattern.dowRate,
      otherRate: pattern.otherRate,
      action: action({ scheduledDays: effective.filter((d) => d !== pattern.dow) }),
    };
  }
  if (rate < 35 && overloaded && (prevRate === null || prevRate < 40) && s.scheduled >= 8) {
    return { kind: 'pause', rate, action: action({ pause: true }) };
  }
  if (n >= 3) {
    const to = reduceTarget(n, rate);
    if (to < n) return { kind: 'reduce', from: n, to, action: action({ scheduledDays: reducedSchedule(effective, s, to) }) };
  }
  if (overloaded || rate < 25) return { kind: 'pause', rate, action: action({ pause: true }) };
  return null;
}

function newBadgesBetween(habits: Habit[], startKey: string, endKey: string, end: Date): number {
  const clip = (maxKey: string, inclusive: boolean) =>
    habits.map((h) => ({ ...h, completions: h.completions.filter((c) => (inclusive ? c <= maxKey : c < maxKey)) }));
  const before = new Set(computeBadges(clip(startKey, false), addDays(new Date(`${startKey}T12:00:00`), -1)).filter((b) => b.unlocked).map((b) => b.id));
  return computeBadges(clip(endKey, true), end).filter((b) => b.unlocked && !before.has(b.id)).length;
}

// ---------- Main computation ----------

export type MonthlyReviewOptions = {
  /** Reminder times as they were during the month, for habits whose reminder a suggestion has since moved. */
  reminderSnapshots?: Record<string, string | null>;
  /** The plan the user applied FOR this month (from last month's review), to score goals. */
  appliedPlan?: AppliedPlan;
};

export function computeMonthlyReview(
  habits: Habit[],
  month: MonthRef,
  today: Date = new Date(),
  options: MonthlyReviewOptions = {}
): MonthlyReview {
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const cur = aggregateMonth(habits, month, today);
  const prev = aggregateMonth(habits, prevMonth, today);
  const byId = new Map(habits.map((h) => [h.id, h]));

  const reminderOf = (h: Habit): string | undefined => {
    const snaps = options.reminderSnapshots;
    if (snaps && h.id in snaps) return snaps[h.id] ?? undefined;
    return h.reminderTime;
  };

  // Morning vs evening pooled completion — the "time of day" signal (reminder time is the proxy).
  let mDone = 0, mSched = 0, eDone = 0, eSched = 0;
  let bestMorning: { time: string; rate: number } | null = null;
  for (const [id, s] of cur.perHabit) {
    const h = byId.get(id)!;
    const hour = hourOf(reminderOf(h));
    if (hour === null) continue;
    if (hour < 12) {
      mDone += s.done;
      mSched += s.scheduled;
      const r = s.scheduled >= 5 ? s.done / s.scheduled : 0;
      if (r >= 0.7 && (!bestMorning || r > bestMorning.rate)) bestMorning = { time: reminderOf(h)!, rate: r };
    } else if (hour >= 18) {
      eDone += s.done;
      eSched += s.scheduled;
    }
  }
  const slots = mSched >= 10 && eSched >= 10 ? { morning: pct(mDone, mSched)!, evening: pct(eDone, eSched)! } : null;
  const eveningWeak = slots && slots.morning - slots.evening >= 15 ? { eveningRate: slots.evening, morningRate: slots.morning } : null;
  const morningTime = bestMorning?.time ?? DEFAULT_MORNING_TIME;

  const consistency = cur.rate ?? 0;
  const prevConsistency = prev.rate;
  const activeCount = cur.perHabit.size;
  const overloaded = activeCount >= 6 && consistency < 70;

  // ----- Per-habit reports (advice filled in after problems are known) -----
  const reportsBase = [...cur.perHabit.entries()].map(([id, s]) => {
    const habit = byId.get(id)!;
    const p = prev.perHabit.get(id);
    const rate = pct(s.done, s.scheduled) ?? 0;
    const prevRate = p && p.scheduled >= 4 ? pct(p.done, p.scheduled) : null;
    const delta = prevRate === null ? null : rate - prevRate;
    const { best, worst } = bestAndWorstDow(s);
    const effective = scheduledDaysOn(habit, cur.endKey) ?? ALL_DAYS;
    const isNew = dayKey(new Date(habit.createdAt)) >= cur.startKey || s.scheduled < 8;
    const reminderTime = reminderOf(habit);
    return {
      habit,
      s,
      rate,
      prevRate,
      prevDone: p ? p.done : null,
      delta,
      best,
      worst,
      effective,
      isNew,
      reminderTime,
      pattern: detectPattern(s, rate, reminderTime, slots),
    };
  });

  // ----- Problems -----
  const problems: Problem[] = reportsBase
    .filter((r) => r.s.scheduled >= 6)
    .map((r) => {
      const drop = r.prevRate !== null ? r.prevRate - r.rate : 0;
      const isDrop = drop >= 15;
      const isLow = !isDrop && r.rate < 50 && !r.isNew;
      if (!isDrop && !isLow) return null;
      const severity = isDrop ? drop + (r.habit.priority === 'high' ? 10 : 0) : (50 - r.rate) * 0.6;
      const fix = fixFor({ ...r, overloaded, morningTime });
      return { severity, problem: { habit: r.habit, kind: isDrop ? 'drop' : 'low', prevRate: r.prevRate, rate: r.rate, pattern: r.pattern, fix } as Problem };
    })
    .filter((x): x is { severity: number; problem: Problem } => x !== null)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map((x) => x.problem);
  const problemById = new Map(problems.map((p) => [p.habit.id, p]));

  const habitsReports: HabitReport[] = reportsBase
    .map((r) => {
      let advice: Advice;
      const problem = problemById.get(r.habit.id);
      if (r.s.scheduled < 4) advice = { kind: 'noData' };
      else if (problem) advice = problem.fix ?? (r.prevRate !== null ? { kind: 'watch', from: r.prevRate, to: r.rate } : { kind: 'steady' });
      else if (r.isNew) advice = { kind: 'forming' };
      else if (r.rate < 60) advice = fixFor({ ...r, overloaded, morningTime }) ?? { kind: 'steady' };
      else if (r.delta !== null && r.delta >= 5) advice = { kind: 'keep' };
      else if (r.rate >= 85) advice = { kind: 'automatic' };
      else if (r.delta !== null && r.delta <= -10 && r.prevRate !== null) advice = { kind: 'watch', from: r.prevRate, to: r.rate };
      else advice = { kind: 'steady' };

      return {
        habit: r.habit,
        area: habitArea(r.habit),
        scheduled: r.s.scheduled,
        done: r.s.done,
        rate: r.rate,
        prevRate: r.prevRate,
        prevDone: r.prevDone,
        delta: r.delta,
        trend: r.delta === null || Math.abs(r.delta) < 5 ? 'flat' : r.delta > 0 ? 'up' : 'down',
        bestRun: r.s.bestRun,
        bestDow: r.best,
        worstDow: r.worst,
        daysPerWeek: r.effective.length,
        reminderTime: r.reminderTime,
        isNew: r.isNew,
        advice,
      } satisfies HabitReport;
    })
    .sort((a, b) => (a.habit.priority === 'high' ? 0 : 1) - (b.habit.priority === 'high' ? 0 : 1) || b.rate - a.rate);

  const comparable = habitsReports.filter((r) => r.delta !== null && r.scheduled >= 4);
  const improvedCount = comparable.filter((r) => r.delta! >= 10).length;
  const declinedCount = comparable.filter((r) => r.delta! <= -10).length;

  // ----- Best streak within the month -----
  let bestStreak: { habit: Habit; days: number } | null = null;
  for (const r of habitsReports) if (r.bestRun > 0 && (!bestStreak || r.bestRun > bestStreak.days)) bestStreak = { habit: r.habit, days: r.bestRun };

  // ----- Life areas -----
  const areas: AreaRow[] = LIFE_AREAS.map((area) => {
    let d = 0, s = 0, pd = 0, ps = 0, count = 0;
    for (const [id, st] of cur.perHabit) {
      if (habitArea(byId.get(id)!) !== area) continue;
      d += st.done;
      s += st.scheduled;
      count++;
    }
    for (const [id, st] of prev.perHabit) {
      const h = byId.get(id);
      if (!h || habitArea(h) !== area) continue;
      pd += st.done;
      ps += st.scheduled;
    }
    const score = pct(d, s);
    const prevScore = ps >= 4 ? pct(pd, ps) : null;
    return { area, score: score ?? 0, prevScore, delta: score !== null && prevScore !== null ? score - prevScore : null, habitCount: count, has: score !== null };
  })
    .filter((a) => a.has)
    .map(({ has: _has, ...rest }) => rest)
    .sort((a, b) => b.score - a.score);

  // ----- Wins -----
  const winCandidates: { score: number; habitId?: string; win: Win }[] = [];
  for (const r of habitsReports) {
    if (r.prevDone !== null && r.delta !== null && r.delta >= 10 && r.done - r.prevDone >= 3) {
      winCandidates.push({ score: (r.done - r.prevDone) * 2 + r.delta / 5, habitId: r.habit.id, win: { kind: 'moreDays', habit: r.habit, done: r.done, scheduled: r.scheduled, prevDone: r.prevDone } });
    }
    if (r.bestRun >= 7) winCandidates.push({ score: r.bestRun, habitId: r.habit.id, win: { kind: 'longRun', habit: r.habit, days: r.bestRun } });
    if (r.prevRate !== null && r.prevRate >= 10 && r.delta !== null && r.delta >= 10) {
      const percent = Math.round((r.delta / r.prevRate) * 100);
      if (percent >= 25) winCandidates.push({ score: r.delta * 0.8, habitId: r.habit.id, win: { kind: 'rateUp', habit: r.habit, percent } });
    }
    if (r.rate >= 90 && r.scheduled >= 10) winCandidates.push({ score: 8, habitId: r.habit.id, win: { kind: 'highRate', habit: r.habit, rate: r.rate } });
  }
  const prevStartKey = prev.startKey;
  const established = habitsReports.filter(
    (r) => dayKey(new Date(r.habit.createdAt)) >= prevStartKey && r.rate >= 70 && r.scheduled >= 8
  ).length;
  if (established > 0 && (prevConsistency === null || consistency >= prevConsistency)) {
    winCandidates.push({ score: 12 * established, win: { kind: 'established', count: established } });
  }
  if (cur.perfectDays >= 3) winCandidates.push({ score: cur.perfectDays * 1.5, win: { kind: 'perfectDays', count: cur.perfectDays } });
  const seenWinHabits = new Set<string>();
  const wins = winCandidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => {
      if (!c.habitId) return true;
      if (seenWinHabits.has(c.habitId)) return false;
      seenWinHabits.add(c.habitId);
      return true;
    })
    .slice(0, 4)
    .map((c) => c.win);
  const driverWin = wins.find((w) => 'habit' in w) as Extract<Win, { habit: Habit }> | undefined;

  // ----- Priorities (max 3, ranked by impact) -----
  const prioCandidates: { score: number; p: Priority }[] = [];
  const kindForAdvice = (a: ActionAdvice, fallback: PriorityKind): PriorityKind =>
    a.kind === 'morning' ? 'morning' : a.kind === 'pause' ? 'pause' : fallback;
  for (const pr of problems) {
    if (!pr.fix) continue;
    const drop = pr.prevRate !== null ? pr.prevRate - pr.rate : 0;
    const high = drop >= 20 || pr.habit.priority === 'high' || pr.rate < 30;
    prioCandidates.push({
      score: (high ? 100 : 50) + drop + (50 - pr.rate) / 2,
      p: {
        kind: kindForAdvice(pr.fix, pr.kind === 'drop' ? 'fix' : 'reduce'),
        impact: high ? 'high' : 'medium',
        habit: pr.habit,
        drop: pr.kind === 'drop' ? drop : undefined,
        rate: pr.rate,
        advice: pr.fix,
      },
    });
  }
  for (const r of habitsReports) {
    if (problemById.has(r.habit.id)) continue;
    const action = adviceAction(r.advice);
    if (!action) continue;
    const a = r.advice as ActionAdvice;
    prioCandidates.push({
      score: 40 + (60 - r.rate) / 2,
      p: { kind: kindForAdvice(a, 'reduce'), impact: a.kind === 'pause' ? 'low' : 'medium', habit: r.habit, rate: r.rate, advice: a },
    });
  }
  const actionable = prioCandidates.sort((a, b) => b.score - a.score).map((c) => c.p);
  const protectCandidate = habitsReports
    .filter((r) => r.rate >= 70 && (r.delta === null || r.delta >= -5) && !adviceAction(r.advice) && !r.isNew)
    .sort((a, b) => b.bestRun - a.bestRun || b.rate - a.rate)[0];
  const protect: Priority | null = protectCandidate ? { kind: 'protect', impact: 'low', habit: protectCandidate.habit, rate: protectCandidate.rate } : null;
  const grow: Priority | null =
    consistency >= 80 && declinedCount === 0 && problems.length === 0 && cur.dayCount >= 14 ? { kind: 'grow', impact: 'low', rate: consistency } : null;
  const priorities: Priority[] = [...actionable.slice(0, protect || grow ? 2 : 3)];
  if (protect && priorities.length < 3) priorities.push(protect);
  if (grow && priorities.length < 3) priorities.push(grow);
  for (const p of actionable.slice(priorities.length)) if (priorities.length < 3 && !priorities.includes(p)) priorities.push(p);
  const impactRank = { high: 0, medium: 1, low: 2 } as const;
  priorities.sort((a, b) => impactRank[a.impact] - impactRank[b.impact]);

  // ----- Next month plan -----
  const change = new Map<string, { habit: Habit; advice: ActionAdvice }>();
  const pauseList: Habit[] = [];
  for (const r of habitsReports) {
    if (!adviceAction(r.advice)) continue;
    const a = r.advice as ActionAdvice;
    if (a.kind === 'pause') {
      if (pauseList.length < 2) pauseList.push(r.habit);
    } else {
      change.set(r.habit.id, { habit: r.habit, advice: a });
    }
  }
  const pausedIds = new Set(pauseList.map((h) => h.id));
  const activeNow = habits.filter((h) => !isPaused(h));
  const keep = activeNow.filter((h) => !change.has(h.id) && !pausedIds.has(h.id));
  const canAddNew = consistency >= 75 && declinedCount === 0 && pauseList.length === 0 && !problems.some((p) => p.kind === 'drop');
  const focus: MonthlyPlan['focus'] =
    pauseList.length > 0 || overloaded || (prevConsistency !== null && consistency <= prevConsistency - 5)
      ? 'consistency'
      : change.size > 0
        ? 'stabilize'
        : canAddNew
          ? 'growth'
          : 'maintain';

  const rateOf = new Map(habitsReports.map((r) => [r.habit.id, r.rate]));
  const priorityOrder: Habit[] = [];
  const pushPriority = (h: Habit | undefined) => {
    if (!h || isPaused(h) || pausedIds.has(h.id) || priorityOrder.some((x) => x.id === h.id)) return;
    priorityOrder.push(h);
  };
  priorities.forEach((p) => p.kind !== 'pause' && pushPriority(p.habit));
  activeNow.filter((h) => h.priority === 'high').forEach(pushPriority);
  [...keep].sort((a, b) => (rateOf.get(b.id) ?? 0) - (rateOf.get(a.id) ?? 0)).forEach(pushPriority);
  const priorityHabits = priorityOrder.slice(0, 3).map((h) => {
    const planned = change.get(h.id)?.advice.action.change.scheduledDays;
    return { habit: h, days: daysPerWeek(planned ?? h.scheduledDays) };
  });

  const plan: MonthlyPlan = {
    from: month,
    to: nextMonth,
    keep,
    change: [...change.values()],
    pause: pauseList,
    canAddNew,
    focus,
    priorityHabits,
  };

  // ----- Goals (from the plan applied for this month) -----
  let goals: { achieved: number; total: number } | null = null;
  if (options.appliedPlan) {
    const tracked = options.appliedPlan.priorities.filter((p) => byId.has(p.habitId));
    if (tracked.length) {
      goals = { total: tracked.length, achieved: tracked.filter((p) => (rateOf.get(p.habitId) ?? 0) >= 80).length };
    }
  }

  const endDate = new Date(`${cur.endKey}T12:00:00`);
  const newBadges = cur.scheduled > 0 ? newBadgesBetween(habits, cur.startKey, cur.endKey, endDate) : 0;

  const year = computeYearProgress(habits, month, today, cur, prev);
  const isBestMonthOfYear = year?.isBest ?? false;

  return {
    month,
    prevMonth,
    nextMonth,
    complete: cur.complete,
    dayCount: cur.dayCount,
    totalDays: cur.totalDays,
    hasData: cur.scheduled > 0,
    consistency,
    prevConsistency,
    done: cur.done,
    scheduled: cur.scheduled,
    perfectDays: cur.perfectDays,
    bestStreak,
    improvedCount,
    declinedCount,
    goals,
    newBadges,
    areas,
    wins,
    problems,
    habits: habitsReports,
    priorities,
    plan,
    year: year?.progress ?? null,
    isBestMonthOfYear,
    eveningWeak,
    driver: driverWin?.habit ?? null,
  };
}

// ---------- Year progress ----------

function computeYearProgress(
  habits: Habit[],
  month: MonthRef,
  today: Date,
  cur: MonthAgg,
  prev: MonthAgg
): { progress: YearProgress; isBest: boolean } | null {
  const months: MonthAgg[] = [];
  for (let m = 0; m <= month.month; m++) {
    const ref = { year: month.year, month: m };
    if (m === month.month) months.push(cur);
    else if (compareMonths(ref, prev.ref) === 0) months.push(prev);
    else months.push(aggregateMonth(habits, ref, today));
  }
  const active = months.filter((m) => m.rate !== null && m.scheduled >= 10);
  if (active.length === 0 || cur.rate === null) return null;

  const rates = active.map((m) => m.rate!);
  const totalCompletions = months.reduce((s, m) => s + m.done, 0);
  const totalScheduled = months.reduce((s, m) => s + m.scheduled, 0);
  const ytd = totalScheduled > 0 ? totalCompletions / totalScheduled : 0;

  const prevRateFor = (id: string) => {
    const p = prev.perHabit.get(id);
    return p && p.scheduled >= 4 ? p.done / p.scheduled : null;
  };
  let established = 0;
  let abandoned = 0;
  for (const h of habits) {
    let yearSched = 0;
    let maxRate = 0;
    for (const m of months) {
      const s = m.perHabit.get(h.id);
      if (!s) continue;
      yearSched += s.scheduled;
      if (s.scheduled >= 8) maxRate = Math.max(maxRate, s.done / s.scheduled);
    }
    const c = cur.perHabit.get(h.id);
    const curRate = c && c.scheduled > 0 ? c.done / c.scheduled : null;
    if (yearSched >= 30 && curRate !== null && curRate >= 0.7 && (prevRateFor(h.id) ?? 0.7) >= 0.7) established++;
    if (maxRate >= 0.4 && (isPaused(h) || (curRate !== null && curRate < 0.2 && (c?.scheduled ?? 0) >= 6))) abandoned++;
  }

  // Previous calendar year, only if the user has history that old.
  const yearStartKey = `${month.year}-01-01`;
  let prevYearRate: number | null = null;
  if (habits.some((h) => dayKey(new Date(h.createdAt)) < yearStartKey)) {
    let d = 0;
    let s = 0;
    for (let m = 0; m < 12; m++) {
      const agg = aggregateMonth(habits, { year: month.year - 1, month: m }, today);
      d += agg.done;
      s += agg.scheduled;
    }
    prevYearRate = s >= 30 ? d / s : null;
  }

  let verdict: YearProgress['verdict'] = { kind: 'steady' };
  const peakIdx = rates.indexOf(Math.max(...rates));
  const lastIdx = rates.length - 1;
  let decliningRun = peakIdx < lastIdx;
  for (let i = peakIdx + 1; i <= lastIdx && decliningRun; i++) if (rates[i] > rates[i - 1] + 2) decliningRun = false;
  if (rates.length >= 4 && decliningRun && lastIdx - peakIdx >= 3 && rates[lastIdx] <= rates[peakIdx] - 10) {
    verdict = {
      kind: 'declining',
      peak: active[peakIdx].ref,
      months: lastIdx - peakIdx,
      overload: active[lastIdx].perHabit.size > active[peakIdx].perHabit.size,
    };
  } else {
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const trendingUp = rates.length >= 3 && avg(rates.slice(-3)) >= avg(rates.slice(0, 3)) + 5;
    if (prevYearRate !== null ? ytd > prevYearRate : trendingUp) verdict = { kind: 'bestYear' };
    else if (trendingUp) verdict = { kind: 'improving' };
  }

  return {
    progress: {
      startMonth: active[0].ref,
      endMonth: month,
      startRate: rates[0],
      endRate: cur.rate,
      established,
      abandoned,
      totalCompletions,
      verdict,
    },
    isBest: active.length >= 2 && cur.rate >= Math.max(...rates),
  };
}

// ---------- AI ----------

export type AiMonthlyReport = {
  story?: string;
  biggestWin?: string;
  problemInsight?: string;
  /** Short per-habit notes keyed by habit id. */
  habitNotes: Record<string, string>;
  /** One "why" line per priority, in the same order as sent. */
  priorityNotes: string[];
  reflectionInsight?: string;
  focus?: string;
  newHabit?: { name: string; emoji: string; area: LifeArea };
  yearVerdict?: string;
};

const aiCache = new Map<string, AiMonthlyReport | null>();

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function parseAnswer(answer: unknown): Record<string, unknown> | null {
  if (answer && typeof answer === 'object') return answer as Record<string, unknown>;
  if (typeof answer !== 'string') return null;
  const cleaned = answer.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Asks the coach webhook (type "monthlyReview") to narrate the report. The AI only writes text —
 * every action button is derived locally from the data, so a missing/odd AI reply never breaks
 * the review, and the AI can't make changes the app didn't compute.
 */
export async function fetchAiMonthlyReport(
  review: MonthlyReview,
  locale: Locale,
  reflection?: Reflection
): Promise<AiMonthlyReport | null> {
  const hasReflection = !!reflection && !!(reflection.worked || reflection.difficult || reflection.improve);
  const cacheKey = `${monthKey(review.month)}|${locale}|${review.done}/${review.scheduled}|${hasReflection ? JSON.stringify(reflection) : ''}`;
  if (aiCache.has(cacheKey)) return aiCache.get(cacheKey)!;

  const h = (habit: Habit) => `${habit.emoji} ${habit.name}`;
  const context = {
    month: monthKey(review.month),
    complete: review.complete,
    daysCovered: review.dayCount,
    consistency: review.consistency,
    prevConsistency: review.prevConsistency,
    completed: review.done,
    scheduled: review.scheduled,
    perfectDays: review.perfectDays,
    bestStreak: review.bestStreak ? { habit: h(review.bestStreak.habit), days: review.bestStreak.days } : null,
    improved: review.improvedCount,
    declined: review.declinedCount,
    goals: review.goals,
    areas: review.areas.map((a) => ({ area: a.area, score: a.score, delta: a.delta })),
    eveningWeak: review.eveningWeak,
    habits: review.habits.map((r) => ({
      id: r.habit.id,
      habit: h(r.habit),
      area: r.area,
      priority: r.habit.priority ?? 'normal',
      rate: r.rate,
      prevRate: r.prevRate,
      daysPerWeek: r.daysPerWeek,
      reminderTime: r.reminderTime ?? null,
      bestDay: r.bestDow,
      weakestDay: r.worstDow,
      advice: r.advice.kind,
      proposedChange: adviceAction(r.advice)?.change ?? null,
    })),
    wins: review.wins.map((w) => ({ ...w, habit: 'habit' in w ? h(w.habit) : undefined })),
    problems: review.problems.map((p) => ({
      habit: h(p.habit),
      kind: p.kind,
      prevRate: p.prevRate,
      rate: p.rate,
      pattern: p.pattern,
      proposedChange: p.fix?.action.change ?? null,
    })),
    priorities: review.priorities.map((p) => ({ kind: p.kind, impact: p.impact, habit: p.habit ? h(p.habit) : null, drop: p.drop, rate: p.rate })),
    plan: {
      focus: review.plan.focus,
      keep: review.plan.keep.map(h),
      change: review.plan.change.map((c) => ({ habit: h(c.habit), change: c.advice.action.change })),
      pause: review.plan.pause.map(h),
      canAddNew: review.plan.canAddNew,
    },
    year: review.year,
    reflection: hasReflection ? reflection : null,
    missReasons: (() => {
      const startKey = monthKey(review.month) + '-01';
      const endKey = monthKey(review.nextMonth) + '-01';
      const all = getMissReasons().filter((e) => e.day >= startKey && e.day < endKey);
      if (all.length === 0) return null;
      const counts: Record<string, number> = {};
      for (const e of all) counts[e.reason] = (counts[e.reason] || 0) + 1;
      return counts;
    })(),
  };

  try {
    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': COACH_WEBHOOK_KEY },
      body: JSON.stringify({ type: 'monthlyReview', context, locale, deviceId: getDeviceId() }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: unknown };
    const parsed = parseAnswer(data.answer);
    if (!parsed || !str(parsed.story)) {
      aiCache.set(cacheKey, null);
      return null;
    }

    const habitNotes: Record<string, string> = {};
    if (parsed.habitNotes && typeof parsed.habitNotes === 'object') {
      for (const [id, note] of Object.entries(parsed.habitNotes as Record<string, unknown>)) {
        const s = str(note);
        if (s) habitNotes[id] = s;
      }
    }
    const priorityNotes = Array.isArray(parsed.priorityNotes) ? parsed.priorityNotes.map((n) => str(n) ?? '') : [];
    let newHabit: AiMonthlyReport['newHabit'];
    const nh = parsed.newHabit as Record<string, unknown> | undefined;
    if (nh && str(nh.name)) {
      const area = LIFE_AREAS.includes(nh.area as LifeArea) ? (nh.area as LifeArea) : 'productivity';
      newHabit = { name: str(nh.name)!.slice(0, 40), emoji: str(nh.emoji) ?? '🎯', area };
    }

    const result: AiMonthlyReport = {
      story: str(parsed.story),
      biggestWin: str(parsed.biggestWin),
      problemInsight: str(parsed.problemInsight),
      habitNotes,
      priorityNotes,
      reflectionInsight: str(parsed.reflectionInsight),
      focus: str(parsed.focus),
      newHabit,
      yearVerdict: str(parsed.yearVerdict),
    };
    aiCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ---------- Lightweight summary for the dashboard card ----------

export function computeMonthConsistency(habits: Habit[], month: MonthRef, today: Date = new Date()): number | null {
  return aggregateMonth(habits, month, today).rate;
}
