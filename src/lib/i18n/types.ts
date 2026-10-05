/**
 * The shared shape every locale dictionary must implement. English (en.ts) is the canonical
 * source; TypeScript enforces that every other locale provides every key with a matching
 * signature, including the function-valued keys used for interpolation and pluralization
 * (each locale implements its own plural rule directly — Ukrainian/Russian need three plural
 * categories, English/Danish/Spanish/German only two, so a generic ICU engine isn't worth it
 * for a dictionary this size).
 */
export interface Dictionary {
  // Tabs
  tabToday: string;
  tabCoach: string;
  tabDashboard: string;

  // Root stack screen titles (headerShown is false, but keep for a11y/multitasking previews)
  screenNewHabit: string;
  screenEditHabit: string;

  // Today screen
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  lookingBack: string;
  encouragementEmpty: string;
  encouragementAllDone: string;
  encouragementNoneDone: string;
  encouragementRemaining: (n: number) => string;
  doneOfTotal: (done: number, total: number) => string;
  sectionHabits: string;
  emptyNoHabits: (fabLabel: string) => string;
  /** Shown when the user has habits, but none are scheduled for the selected day (not the same as having zero habits at all). */
  noHabitsScheduledToday: string;
  sectionMorning: string;
  sectionEvening: string;
  sectionAnytime: string;
  hintTapLongPress: string;
  fabNewHabit: string;
  languageButtonLabel: string;

  // Dashboard
  eyebrowProgress: string;
  dashboardTitle: string;
  statBestStreak: string;
  statCompletions: string;
  statHabits: string;
  statPerfectDays: string;
  trendsTitle: string;
  rangeWeek: string;
  rangeMonth: string;
  rangeYear: string;
  heatmapLess: string;
  heatmapMore: string;
  heatmapNoHabits: string;
  yearViewHeatmap: string;
  yearViewGraph: string;
  trendSummary: (avgPct: number, perfectDays: number) => string;
  achievementsHeader: (unlocked: number, total: number) => string;
  perHabit: string;
  dashboardEmpty: string;

  // Coach
  aiRecommendations: string;
  coachTitle: string;
  coachThinking: string;
  coachPlaceholder: string;
  coachSend: string;
  coachSuggestion1: string;
  coachSuggestion2: string;
  coachSuggestion3: string;
  marketBlurb: string;
  coachFallbackError: string;

  // Habit form
  suggestionDrinkWater: string;
  suggestionReadPages: string;
  suggestionWalkSteps: string;
  suggestionMeditate: string;
  suggestionNoSugar: string;
  yourNewHabit: string;
  placeholderHabitName: string;
  labelIcon: string;
  labelColor: string;
  labelScheduledDays: string;
  labelPriority: string;
  priorityHigh: string;
  priorityNormal: string;
  labelReminder: string;
  dailyReminder: string;
  /** index into constants/theme.ts's HabitColors, in the same order */
  colorName: (index: number) => string;
  remindMeAt: string;
  done: string;
  createHabit: string;
  saveChanges: string;
  newHabitTitle: string;
  editHabitTitle: string;

  // Habit card
  actionEdit: string;
  actionDelete: string;
  actionCancel: string;
  startStreakToday: string;
  daysStreak: (n: number) => string;
  streakBadge: (n: number) => string;
  topStreakLabel: string;
  topStreakValue: (emoji: string, name: string, n: number) => string;

  // Recommendation
  recommendationTitle: string;
  recommendationCloseMilestone: (emoji: string, name: string, target: number) => string;
  recommendationLongestStreak: (emoji: string, name: string, streak: number) => string;
  recommendationMostNeglected: (emoji: string, name: string, gap: number) => string;

  // Alerts
  remindersDisabledTitle: string;
  remindersDisabledMessage: string;

  // Notifications
  notifChannelName: string;
  notifTitle: string;
  notifBody: (emoji: string, name: string) => string;

  // Motivation
  motivFallback: { headline: string; detail: string }[];
  motivReadyHeadline: string;
  motivReadyDetail: string;
  motivPerfectHeadline: string;
  motivPerfectDetail: string;
  motivCloseHeadline: string;
  motivCloseDetail: (emoji: string, name: string, target: number) => string;
  motivNeglectedHeadline: string;
  motivNeglectedDetail: (emoji: string, name: string, gap: number) => string;
  motivKeepGoingHeadline: string;
  motivKeepGoingDetail: (n: number) => string;

  // Pattern insight
  insightPatternHeadline: string;
  insightPatternDetail: (emoji: string, name: string, bestPct: number, bestDay: string, worstPct: number, worstDay: string) => string;

  // Badges
  badgeTitleFirstStep: string;
  badgeTitleStreak3: string;
  badgeTitleStreak7: string;
  badgeTitleStreak30: string;
  badgeTitleStreak100: string;
  badgeTitleCompletions10: string;
  badgeTitleCompletions100: string;
  badgeTitleCompletions500: string;
  badgeTitlePerfectDay: string;
  badgeTitlePerfectWeek: string;
  badgeTitleFiveHabits: string;
  badgeDescFirstStep: string;
  badgeDescStreak: (n: number) => string;
  badgeDescCompletions: (n: number) => string;
  badgeDescPerfectDay: string;
  badgeDescPerfectWeek: string;
  badgeDescFiveHabits: string;

  languagePickerTitle: string;

  // Onboarding
  onboardWelcomeTitle: string;
  onboardWelcomeTagline: string;
  onboardFeatureHabitsTitle: string;
  onboardFeatureHabitsDesc: string;
  onboardFeatureCoachTitle: string;
  onboardFeatureCoachDesc: string;
  onboardFeatureAchievementsTitle: string;
  onboardFeatureAchievementsDesc: string;
  onboardGetStartedTitle: string;
  onboardGetStartedSubtitle: string;
  onboardContinue: string;
  onboardSkip: string;
  onboardNext: string;
  onboardRestoreLink: string;
  onboardRestorePlaceholder: string;
  onboardRestoreButton: string;
  onboardRestoreSuccess: string;
  onboardRestoreNotFound: string;
  onboardRestoreError: string;

  // Backup
  backupIdLabel: string;
  backupIdHint: string;
  backupIdCopied: string;
  copyButton: string;

  // Mood
  moodSectionTitle: string;
  moodEnergyLabel: string;
  moodMoodLabel: string;

  // Daily nudge
  dailyNudgeTitle: string;
  dailyNudgeLabel: string;
  dailyNudgeHint: string;
  dailyNudgeDisabledMessage: string;
  weeklyRecapLabel: string;
  weeklyRecapHint: string;
  weeklyRecapDisabledMessage: string;
}
