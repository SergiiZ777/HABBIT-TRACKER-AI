import type { Habit } from '@/lib/habits';
import type { Dictionary } from '@/lib/i18n';

export type LifeArea = 'health' | 'learning' | 'productivity' | 'relationships' | 'mind' | 'finance';

export const LIFE_AREAS: LifeArea[] = ['health', 'learning', 'productivity', 'relationships', 'mind', 'finance'];

export const LIFE_AREA_EMOJI: Record<LifeArea, string> = {
  health: '🏃',
  learning: '🧠',
  productivity: '💼',
  relationships: '❤️',
  mind: '🧘',
  finance: '💰',
};

const EMOJI_AREAS: Record<string, LifeArea> = {
  '💧': 'health',
  '🏃': 'health',
  '🥗': 'health',
  '😴': 'health',
  '💪': 'health',
  '🚭': 'health',
  '💊': 'health',
  '🧘': 'mind',
  '🌞': 'mind',
  '📚': 'learning',
  '✍️': 'learning',
  '🎯': 'productivity',
  '💰': 'finance',
  '💵': 'finance',
  '📈': 'finance',
  '🏦': 'finance',
};

// Word stems across the app's six languages (en, da, de, es, ru, uk). Checked in order, so the
// more specific areas come first. A miss falls back to the emoji, then to productivity.
const KEYWORDS: [RegExp, LifeArea][] = [
  [/(famil|friend|partner|wife|husband|mom|mum|dad|kids|child|call |date night|freund|mutter|vater|kinder|amig|madre|padre|hij|сем|друз|мам|пап|дет|дiт|дружин|чолов|жен|муж|родин)/i, 'relationships'],
  [/(meditat|mindful|breath|gratitude|journal|pray|yoga|calm|медит|дыха|дих|благодар|вдяч|дневник|щоденник|йога|meditér|åndedræt|taknem|dankbar|atem|respira|gratitud|diario)/i, 'mind'],
  [/(read|book|learn|study|language|course|lesson|page|write|chess|læs|bog|lær|lesen|buch|lern|leer|libro|aprend|estudi|idioma|чита|книг|учи|учё|вчи|язык|мов|курс|пиш)/i, 'learning'],
  [/(water|walk|run|gym|workout|exercise|sport|step|sleep|sugar|vitamin|stretch|\beat|diet|fruit|veget|smok|alcohol|vand|gå|løb|søvn|wasser|lauf|schlaf|zucker|agua|camin|corr|dorm|azúcar|вод|ход|бег|біг|спорт|трен|сон|сахар|цукор|кур|отжим|віджим)/i, 'health'],
  [/(budget|save|money|invest|financ|expense|income|salary|debt|loan|bank|crypto|stock|spar|pengar|geld|dinero|ahorro|presupuest|деньг|грош|бюджет|фінанс|финанс|заощад|інвест|инвест)/i, 'finance'],
  [/(plan|work|focus|email|inbox|clean|tidy|code|task|todo|arbeit|arbejd|trabaj|работ|робот|план|фокус|уборк|прибир)/i, 'productivity'],
];

export function guessArea(name: string, emoji: string): LifeArea {
  for (const [re, area] of KEYWORDS) if (re.test(name)) return area;
  return EMOJI_AREAS[emoji] ?? 'productivity';
}

/** The habit's explicit area, or a best guess from its name/emoji. */
export function habitArea(habit: Habit): LifeArea {
  return habit.area ?? guessArea(habit.name, habit.emoji);
}

export function areaLabel(t: Dictionary, area: LifeArea): string {
  switch (area) {
    case 'health':
      return t.areaHealth;
    case 'learning':
      return t.areaLearning;
    case 'productivity':
      return t.areaProductivity;
    case 'relationships':
      return t.areaRelationships;
    case 'mind':
      return t.areaMind;
    case 'finance':
      return t.areaFinance;
  }
}
