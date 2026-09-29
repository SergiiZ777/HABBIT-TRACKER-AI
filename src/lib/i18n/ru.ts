import type { Dictionary } from './types';

const COLOR_NAMES = ['Индиго', 'Оранжевый', 'Зелёный', 'Красный', 'Синий', 'Фиолетовый', 'Жёлтый'];

/** Standard Slavic 3-form plural rule (one/few/many), shared by Russian and Ukrainian. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

export const ru: Dictionary = {
  tabToday: 'Сегодня',
  tabCoach: 'Коуч',
  tabDashboard: 'Панель',

  screenNewHabit: 'Новая привычка',
  screenEditHabit: 'Редактировать привычку',

  greetingMorning: 'Доброе утро',
  greetingAfternoon: 'Добрый день',
  greetingEvening: 'Добрый вечер',
  lookingBack: 'Прошедший день',
  encouragementEmpty: 'Добавьте первую привычку, чтобы начать.',
  encouragementAllDone: 'Всё выполнено. Отличная работа! 🎉',
  encouragementNoneDone: 'Маленькие шаги важны. Выберите одну привычку для начала.',
  encouragementRemaining: (n) => `Осталось ${n}. Продолжайте!`,
  doneOfTotal: (done, total) => `Выполнено ${done} из ${total}`,
  sectionHabits: 'ПРИВЫЧКИ',
  emptyNoHabits: (fabLabel) => `Привычек пока нет. Нажмите «${fabLabel}» ниже, чтобы создать.`,
  hintTapLongPress: 'Нажмите, чтобы отметить · Удерживайте для других действий',
  fabNewHabit: '＋ Новая привычка',
  languageButtonLabel: 'Сменить язык',

  eyebrowProgress: 'ВАШ ПРОГРЕСС',
  dashboardTitle: 'Панель',
  statBestStreak: 'Лучшая серия',
  statCompletions: 'Выполнений',
  statHabits: 'Привычки',
  statPerfectDays: 'Идеальные дни',
  trendsTitle: 'Тенденции',
  rangeWeek: 'Неделя',
  rangeMonth: 'Месяц',
  rangeYear: 'Год',
  heatmapLess: 'Меньше',
  heatmapMore: 'Больше',
  heatmapNoHabits: 'Пока нет привычек',
  yearViewHeatmap: 'Тепловая карта',
  yearViewGraph: 'График',
  trendSummary: (avgPct, perfectDays) =>
    `${avgPct}% в среднем · ${perfectDays} ${ruPlural(perfectDays, 'идеальный день', 'идеальных дня', 'идеальных дней')}`,
  achievementsHeader: (unlocked, total) => `ДОСТИЖЕНИЯ · ${unlocked}/${total}`,
  perHabit: 'ПО ПРИВЫЧКАМ',
  dashboardEmpty: 'Добавьте привычку на вкладке «Сегодня», чтобы начать открывать достижения.',

  aiRecommendations: 'AI-РЕКОМЕНДАЦИИ',
  coachTitle: 'Коуч',
  coachThinking: 'Коуч думает…',
  coachPlaceholder: 'Спросите коуча о чём угодно…',
  coachSend: 'Отправить',
  coachSuggestion1: 'На какой привычке сосредоточиться сегодня?',
  coachSuggestion2: 'Как построить более длинную серию?',
  coachSuggestion3: 'Чем это приложение отличается от других?',
  marketBlurb:
    'Краткий обзор рынка: Habitica превращает привычки в игру с очками и уровнями, Streaks ' +
    'намеренно минималистичен и вовсе без ИИ, а более новые приложения вроде BeeDone или ' +
    'Beyond Time используют ИИ, чтобы подсказать лучшее время дня для привычки. Впрочем, ' +
    'большинство из них лишь показывают графики — мало кто позволяет задать коучу вопрос, ' +
    'опираясь на ваши собственные данные. Именно для этого этот чат. Спрашивайте о чём угодно ' +
    '— привычки, чтение, тренировки, питание, дисциплину, мотивацию, что угодно.',
  coachFallbackError: 'Не удалось связаться с коучем — проверьте соединение и попробуйте снова через мгновение.',

  suggestionDrinkWater: 'Пить 2л воды',
  suggestionReadPages: 'Читать 10 страниц',
  suggestionWalkSteps: 'Проходить 8000 шагов',
  suggestionMeditate: 'Медитировать 5 мин',
  suggestionNoSugar: 'Без сахара',
  yourNewHabit: 'Ваша новая привычка',
  placeholderHabitName: 'напр. Пить воду',
  labelIcon: 'ИКОНКА',
  labelColor: 'ЦВЕТ',
  labelReminder: 'НАПОМИНАНИЕ',
  dailyReminder: 'Ежедневное напоминание',
  colorName: (i) => COLOR_NAMES[i] ?? 'Цвет',
  remindMeAt: 'Напомнить в',
  done: 'Готово',
  createHabit: 'Создать привычку',
  saveChanges: 'Сохранить изменения',
  newHabitTitle: 'Новая привычка',
  editHabitTitle: 'Редактировать привычку',

  actionEdit: 'Редактировать',
  actionDelete: 'Удалить',
  actionCancel: 'Отмена',
  startStreakToday: 'Начните серию сегодня',
  daysStreak: (n) => `🔥 ${n}-дневная серия`,

  remindersDisabledTitle: 'Напоминания отключены',
  remindersDisabledMessage: 'Включите уведомления в Настройках, чтобы получать ежедневное напоминание для этой привычки.',

  notifChannelName: 'Напоминания о привычках',
  notifTitle: 'Напоминание о привычке',
  notifBody: (emoji, name) => `Время для ${emoji} ${name}`,

  motivFallback: [
    { headline: 'Маленькие шаги складываются в большие', detail: 'Выберите одну привычку и начните сейчас — импульс нарастает быстро.' },
    { headline: 'Постоянство важнее интенсивности', detail: 'Просто сделайте это сегодня. В этом вся суть.' },
    { headline: 'Будущий вы рассчитывает на это', detail: 'Минута сегодня экономит гораздо больше усилий потом.' },
    { headline: 'Прогресс, а не совершенство', detail: 'Любая отмеченная сегодня привычка — это победа.' },
    { headline: 'По одной привычке за раз', detail: 'Не нужно делать всё сразу — только следующий шаг.' },
  ],
  motivReadyHeadline: 'Готовы начать',
  motivReadyDetail: 'Добавьте первую привычку на вкладке «Сегодня», чтобы начать набирать темп.',
  motivPerfectHeadline: 'Идеальный день!',
  motivPerfectDetail: 'Вы выполнили все привычки сегодня. Именно так и строятся серии.',
  motivCloseHeadline: 'Так близко!',
  motivCloseDetail: (emoji, name, target) =>
    `Выполните ${emoji} ${name} сегодня — и у вас будет ${target}-дневная серия!`,
  motivNeglectedHeadline: 'Не теряйте темп',
  motivNeglectedDetail: (emoji, name, gap) =>
    `${emoji} ${name} не отмечалась уже ${gap} ${ruPlural(gap, 'день', 'дня', 'дней')}. Маленький шаг сегодня сохранит привычку.`,
  motivKeepGoingHeadline: 'Продолжайте',
  motivKeepGoingDetail: (n) => `Осталось ${n} ${ruPlural(n, 'привычка', 'привычки', 'привычек')} на сегодня. У вас всё получится!`,

  badgeTitleFirstStep: 'Первый шаг',
  badgeTitleStreak3: '3-дневная серия',
  badgeTitleStreak7: 'Недельный воин',
  badgeTitleStreak30: 'Мастер постоянства',
  badgeTitleStreak100: 'Центурион',
  badgeTitleCompletions10: 'Хорошее начало',
  badgeTitleCompletions100: 'Строитель привычек',
  badgeTitleCompletions500: 'Преданность делу',
  badgeTitlePerfectDay: 'Идеальный день',
  badgeTitlePerfectWeek: 'Идеальная неделя',
  badgeTitleFiveHabits: 'Коллекционер привычек',
  badgeDescFirstStep: 'Выполните привычку в первый раз',
  badgeDescStreak: (n) => `Достигните ${n}-дневной серии в любой привычке`,
  badgeDescCompletions: (n) => `Наберите ${n} ${ruPlural(n, 'выполнение', 'выполнения', 'выполнений')} всего`,
  badgeDescPerfectDay: 'Выполните все привычки за один день',
  badgeDescPerfectWeek: '7 идеальных дней подряд',
  badgeDescFiveHabits: 'Создайте 5 или больше привычек',

  languagePickerTitle: 'Язык',

  onboardWelcomeTitle: 'Добро пожаловать',
  onboardWelcomeTagline: 'Простые привычки под контролем — с AI-коучем рядом.',
  onboardFeatureHabitsTitle: 'Привычки и серии',
  onboardFeatureHabitsDesc: 'Отслеживайте ежедневные привычки и наблюдайте за ростом серий.',
  onboardFeatureCoachTitle: 'AI-коуч',
  onboardFeatureCoachDesc: 'Задавайте настоящие вопросы о привычках, мотивации или саморазвитии — в любое время.',
  onboardFeatureAchievementsTitle: 'Достижения',
  onboardFeatureAchievementsDesc: 'Открывайте бейджи и следите за прогрессом на панели.',
  onboardGetStartedTitle: 'Готовы начать?',
  onboardGetStartedSubtitle: 'Выберите привычки, с которых хотите начать — позже можно добавить ещё.',
  onboardContinue: 'Продолжить',
  onboardSkip: 'Пропустить пока',
  onboardNext: 'Далее',
  onboardRestoreLink: 'Уже есть ID резервной копии? Восстановить',
  onboardRestorePlaceholder: 'Вставьте свой ID резервной копии',
  onboardRestoreButton: 'Восстановить',
  onboardRestoreSuccess: 'Восстановлено! С возвращением.',
  onboardRestoreNotFound: 'Резервная копия для этого ID не найдена — проверьте и попробуйте снова.',
  onboardRestoreError: 'Не удалось восстановить сейчас — проверьте соединение и попробуйте снова.',

  backupIdLabel: 'ID резервной копии',
  backupIdHint: 'Сохраните это в надёжном месте. Используйте, чтобы восстановить привычки на новом устройстве.',
  backupIdCopied: 'Скопировано!',
  copyButton: 'Копировать',
};
