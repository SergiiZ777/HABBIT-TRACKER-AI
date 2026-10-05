import { computeStats } from '@/lib/achievements';
import { getDeviceId } from '@/lib/backup';
import { currentStreak, dayKey, isScheduledOn, type Habit } from '@/lib/habits';
import type { Dictionary, Locale } from '@/lib/i18n';
import { getMoodForDay } from '@/lib/mood';

// n8n workflow "Habit Tracker AI - Coach Chat" — webhook -> AI Agent (Claude) grounded in real habit data.
const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c33477830';
// Shared secret checked by the workflow's "Check Auth" node — keeps random discoverers of the
// URL from spending the Anthropic credits behind it. Not a login secret; still kept out of git
// via .env.local (see .env.example) rather than hardcoded, since this repo is public.
const COACH_WEBHOOK_KEY = process.env.EXPO_PUBLIC_COACH_KEY ?? '';

function buildContext(habits: Habit[], today: Date) {
  const key = dayKey(today);
  return {
    today: key,
    habits: habits.map((h) => ({
      name: h.name,
      emoji: h.emoji,
      streak: currentStreak(h, today),
      completedToday: h.completions.includes(key),
      scheduledToday: isScheduledOn(h, today),
      reminderTime: h.reminderTime ?? null,
    })),
    stats: computeStats(habits, today),
    mood: getMoodForDay(key),
  };
}

/**
 * Asks the coach a question grounded in the user's real habit data. Never throws — returns a
 * friendly fallback on any failure. Conversation memory is server-side now (keyed by this
 * device's Backup ID, via the n8n workflow's Data Table), so no local history is sent —
 * the coach recalls prior sessions on its own.
 */
export async function askCoach(
  question: string,
  habits: Habit[],
  locale: Locale,
  t: Dictionary,
  today: Date = new Date()
): Promise<string> {
  try {
    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Habit-Coach-Key': COACH_WEBHOOK_KEY },
      body: JSON.stringify({ question, context: buildContext(habits, today), locale, deviceId: getDeviceId() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Empty answer');
    return data.answer.trim();
  } catch {
    return t.coachFallbackError;
  }
}
