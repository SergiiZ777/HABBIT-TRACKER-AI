import { computeStats } from '@/lib/achievements';
import { currentStreak, dayKey, type Habit } from '@/lib/habits';

// n8n workflow "Habit Tracker AI - Coach Chat" — webhook -> AI Agent (Claude) grounded in real habit data.
const COACH_WEBHOOK_URL = 'https://n8n.justbehappyandrichn8n.com/webhook/habit-coach-062761f499c3';

export type ChatTurn = { role: 'user' | 'coach'; content: string };

function buildContext(habits: Habit[], today: Date) {
  const key = dayKey(today);
  return {
    today: key,
    habits: habits.map((h) => ({
      name: h.name,
      emoji: h.emoji,
      streak: currentStreak(h, today),
      completedToday: h.completions.includes(key),
      reminderTime: h.reminderTime ?? null,
    })),
    stats: computeStats(habits, today),
  };
}

/** Asks the coach a question grounded in the user's real habit data. Never throws — returns a friendly fallback on any failure. */
export async function askCoach(
  question: string,
  habits: Habit[],
  history: ChatTurn[],
  today: Date = new Date()
): Promise<string> {
  try {
    const res = await fetch(COACH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context: buildContext(habits, today), history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Empty answer');
    return data.answer.trim();
  } catch {
    return "I couldn't reach the coach just now — check your connection and try again in a moment.";
  }
}
