import type { Dictionary } from './types';

const COLOR_NAMES = ['Індиго', 'Помаранчевий', 'Зелений', 'Червоний', 'Синій', 'Фіолетовий', 'Жовтий'];

/** Standard Slavic 3-form plural rule (one/few/many), shared by Ukrainian and Russian. */
function ukPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export const uk: Dictionary = {
  tabToday: 'Сьогодні',
  tabCoach: 'Коуч',
  tabDashboard: 'Панель',

  screenNewHabit: 'Нова звичка',
  screenEditHabit: 'Редагувати звичку',

  greetingMorning: 'Доброго ранку',
  greetingAfternoon: 'Доброго дня',
  greetingEvening: 'Доброго вечора',
  lookingBack: 'Минулий день',
  encouragementEmpty: 'Додайте свою першу звичку, щоб почати.',
  encouragementAllDone: 'Усе виконано. Чудова робота! 🎉',
  encouragementNoneDone: 'Малі кроки важливі. Оберіть одну звичку для початку.',
  encouragementRemaining: (n) => `Залишилось ${n}. Так тримати!`,
  doneOfTotal: (done, total) => `Виконано ${done} з ${total}`,
  sectionHabits: 'ЗВИЧКИ',
  emptyNoHabits: (fabLabel) => `Звичок ще немає. Натисніть «${fabLabel}» нижче, щоб створити.`,
  hintTapLongPress: 'Натисніть, щоб відмітити · Утримуйте для інших дій',
  fabNewHabit: '＋ Нова звичка',
  languageButtonLabel: 'Змінити мову',

  eyebrowProgress: 'ВАШ ПРОГРЕС',
  dashboardTitle: 'Панель',
  statBestStreak: 'Найкраща серія',
  statCompletions: 'Виконано разів',
  statHabits: 'Звички',
  statPerfectDays: 'Ідеальні дні',
  trendsTitle: 'Тенденції',
  rangeWeek: 'Тиждень',
  rangeMonth: 'Місяць',
  trendSummary: (avgPct, perfectDays) =>
    `${avgPct}% в середньому · ${perfectDays} ${ukPlural(perfectDays, 'ідеальний день', 'ідеальні дні', 'ідеальних днів')}`,
  achievementsHeader: (unlocked, total) => `ДОСЯГНЕННЯ · ${unlocked}/${total}`,
  perHabit: 'ЗА ЗВИЧКАМИ',
  dashboardEmpty: 'Додайте звичку на вкладці «Сьогодні», щоб почати відкривати досягнення.',

  aiRecommendations: 'AI-РЕКОМЕНДАЦІЇ',
  coachTitle: 'Коуч',
  coachThinking: 'Коуч думає…',
  coachPlaceholder: 'Запитайте коуча про будь-що…',
  coachSend: 'Надіслати',
  coachSuggestion1: 'На якій звичці зосередитися сьогодні?',
  coachSuggestion2: 'Як побудувати кращу серію?',
  coachSuggestion3: 'Чим цей застосунок відрізняється від інших?',
  marketBlurb:
    'Короткий огляд ринку: Habitica перетворює звички на гру з очками та рівнями, Streaks ' +
    'навмисно мінімалістичний і зовсім без ШІ, а новіші застосунки на кшталт BeeDone чи Beyond ' +
    'Time використовують ШІ, щоб підказати найкращий час доби для звички. Втім, більшість із ' +
    'них лише показують графіки — мало хто дозволяє поставити коучу запитання, спираючись на ' +
    'ваші власні дані. Саме для цього цей чат. Питайте про що завгодно — звички, читання, ' +
    'тренування, харчування, дисципліну, мотивацію, будь-що.',
  coachFallbackError: 'Не вдалося зв’язатися з коучем — перевірте з’єднання і спробуйте ще раз за мить.',

  suggestionDrinkWater: 'Пити 2л води',
  suggestionReadPages: 'Читати 10 сторінок',
  suggestionWalkSteps: 'Проходити 8000 кроків',
  suggestionMeditate: 'Медитувати 5 хв',
  suggestionNoSugar: 'Без цукру',
  yourNewHabit: 'Ваша нова звичка',
  placeholderHabitName: 'напр. Пити воду',
  labelIcon: 'ІКОНКА',
  labelColor: 'КОЛІР',
  labelReminder: 'НАГАДУВАННЯ',
  dailyReminder: 'Щоденне нагадування',
  colorName: (i) => COLOR_NAMES[i] ?? 'Колір',
  remindMeAt: 'Нагадати о',
  done: 'Готово',
  createHabit: 'Створити звичку',
  saveChanges: 'Зберегти зміни',
  newHabitTitle: 'Нова звичка',
  editHabitTitle: 'Редагувати звичку',

  actionEdit: 'Редагувати',
  actionDelete: 'Видалити',
  actionCancel: 'Скасувати',
  startStreakToday: 'Почніть серію сьогодні',
  daysStreak: (n) => `🔥 ${n}-денна серія`,

  remindersDisabledTitle: 'Нагадування вимкнено',
  remindersDisabledMessage: 'Увімкніть сповіщення в Налаштуваннях, щоб отримувати щоденне нагадування для цієї звички.',

  notifChannelName: 'Нагадування про звички',
  notifTitle: 'Нагадування про звичку',
  notifBody: (emoji, name) => `Час для ${emoji} ${name}`,

  motivFallback: [
    { headline: 'Малі кроки складаються у великі', detail: 'Оберіть одну звичку і почніть зараз — темп наростає швидко.' },
    { headline: 'Стабільність важливіша за інтенсивність', detail: 'Просто зробіть це сьогодні. Оце і є вся справа.' },
    { headline: 'Майбутній ви розраховує на це', detail: 'Хвилина сьогодні економить набагато більше зусиль потім.' },
    { headline: 'Прогрес, а не досконалість', detail: 'Будь-яка відмічена сьогодні звичка — це перемога.' },
    { headline: 'По одній звичці за раз', detail: 'Не обов’язково робити все — лише наступний крок.' },
  ],
  motivReadyHeadline: 'Готові почати',
  motivReadyDetail: 'Додайте свою першу звичку на вкладці «Сьогодні», щоб почати нарощувати темп.',
  motivPerfectHeadline: 'Ідеальний день!',
  motivPerfectDetail: 'Ви виконали всі звички сьогодні. Саме так і будуються серії.',
  motivCloseHeadline: 'Так близько!',
  motivCloseDetail: (emoji, name, target) =>
    `Виконайте ${emoji} ${name} сьогодні — і матимете ${target}-денну серію!`,
  motivNeglectedHeadline: 'Не втрачайте темп',
  motivNeglectedDetail: (emoji, name, gap) =>
    `${emoji} ${name} не відмічено вже ${gap} ${ukPlural(gap, 'день', 'дні', 'днів')}. Маленький крок сьогодні підтримає звичку.`,
  motivKeepGoingHeadline: 'Так тримати',
  motivKeepGoingDetail: (n) => `Залишилось ${n} ${ukPlural(n, 'звичка', 'звички', 'звичок')} на сьогодні. У вас усе вийде!`,

  badgeTitleFirstStep: 'Перший крок',
  badgeTitleStreak3: '3-денна серія',
  badgeTitleStreak7: 'Тижневий воїн',
  badgeTitleStreak30: 'Майстер стабільності',
  badgeTitleStreak100: 'Центуріон',
  badgeTitleCompletions10: 'Хороший старт',
  badgeTitleCompletions100: 'Будівничий звичок',
  badgeTitleCompletions500: 'Відданість справі',
  badgeTitlePerfectDay: 'Ідеальний день',
  badgeTitlePerfectWeek: 'Ідеальний тиждень',
  badgeTitleFiveHabits: 'Колекціонер звичок',
  badgeDescFirstStep: 'Виконайте звичку вперше',
  badgeDescStreak: (n) => `Досягніть ${n}-денної серії в будь-якій звичці`,
  badgeDescCompletions: (n) => `Наберіть ${n} ${ukPlural(n, 'виконання', 'виконання', 'виконань')} загалом`,
  badgeDescPerfectDay: 'Виконайте всі звички за один день',
  badgeDescPerfectWeek: '7 ідеальних днів поспіль',
  badgeDescFiveHabits: 'Створіть 5 або більше звичок',

  languagePickerTitle: 'Мова',
};
