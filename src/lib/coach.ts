import { computeStats } from '@/lib/achievements';
import { getDeviceId } from '@/lib/backup';
import type { CoachAction } from '@/lib/coach-insights';
import { addDays, currentStreak, daysPerWeek, dayKey, isPaused, isScheduledOn, type Habit } from '@/lib/habits';
import type { Dictionary, Locale } from '@/lib/i18n';
import { areaLabel, habitArea } from '@/lib/life-areas';
import { computeLifeBalance } from '@/lib/life-balance';
import { getMissReasonsForHabit } from '@/lib/miss-reasons';
import { getMoodForDay } from '@/lib/mood';

const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c33477830';
const COACH_WEBHOOK_KEY = process.env.EXPO_PUBLIC_COACH_KEY ?? '';

export type CoachResponse = {
  text: string;
  action?: CoachAction;
};

function buildRichContext(habits: Habit[], t: Dictionary, today: Date) {
  const key = dayKey(today);
  const active = habits.filter((h) => !isPaused(h));

  const days14: Date[] = [];
  for (let i = 13; i >= 0; i--) days14.push(addDays(today, -i));

  const habitStats = active.map((h) => {
    const compSet = new Set(h.completions);
    let schedCount = 0;
    let doneCount = 0;
    const dowDone = Array(7).fill(0);
    const dowSched = Array(7).fill(0);

    for (const d of days14) {
      if (!isScheduledOn(h, d)) continue;
      schedCount++;
      const dow = d.getDay();
      dowSched[dow]++;
      if (compSet.has(dayKey(d))) {
        doneCount++;
        dowDone[dow]++;
      }
    }

    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      area: habitArea(h),
      priority: h.priority ?? 'normal',
      streak: currentStreak(h, today),
      completedToday: h.completions.includes(key),
      scheduledToday: isScheduledOn(h, today),
      reminderTime: h.reminderTime ?? null,
      daysPerWeek: daysPerWeek(h.scheduledDays),
      last14DaysRate: schedCount > 0 ? Math.round((doneCount / schedCount) * 100) : 0,
      dowFailures: dowSched.map((s, i) => (s >= 2 && dowDone[i] === 0 ? i : null)).filter((x): x is number => x !== null),
      missReasons: getMissReasonsForHabit(h.id)
        .filter((e) => days14.some((d) => dayKey(d) === e.day))
        .reduce((acc, e) => { acc[e.reason] = (acc[e.reason] || 0) + 1; return acc; }, {} as Record<string, number>),
    };
  });

  const balance = computeLifeBalance(habits, t, today);

  return {
    today: key,
    activeHabitsCount: active.length,
    habits: habitStats,
    stats: computeStats(habits, today),
    mood: getMoodForDay(key),
    lifeBalance: {
      overallScore: balance.overallScore,
      areas: balance.areas.map((a) => ({
        area: areaLabel(t, a.area),
        score: a.score,
        trend: a.trend,
        trendDelta: a.trendDelta,
        habitCount: a.habitCount,
      })),
      imbalances: balance.imbalances.map((i) => ({
        type: i.type,
        headline: i.headline,
      })),
    },
  };
}

/**
 * Asks the AI coach a question grounded in the user's detailed habit history & patterns.
 */
export async function askCoach(
  question: string,
  habits: Habit[],
  locale: Locale,
  t: Dictionary,
  today: Date = new Date()
): Promise<CoachResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': COACH_WEBHOOK_KEY },
      body: JSON.stringify({ question, context: buildRichContext(habits, t, today), locale, deviceId: getDeviceId() }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Empty answer');

    const text = data.answer.trim();

    // Check if the answer contains JSON payload or action code
    let action: CoachAction | undefined;
    const match = text.match(/```json\s*(\{[\s\S]*?\})\s*```/i);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]) as Record<string, unknown>;
        if (parsed.habitId && parsed.change) {
          action = {
            habitId: String(parsed.habitId),
            change: parsed.change as any,
            buttonLabel: String(parsed.buttonLabel ?? 'Apply System Change'),
          };
        }
      } catch {
        // Fallthrough if not valid JSON
      }
    }

    const cleanText = text.replace(/```json\s*\{[\s\S]*?\}\s*```/gi, '').trim();

    return { text: cleanText || text, action };
  } catch {
    return { text: t.coachFallbackError };
  }
}
