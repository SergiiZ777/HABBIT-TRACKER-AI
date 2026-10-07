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
  coachSuggestion4: string;
  coachSuggestion5: string;
  coachInsightsHeader: string;
  coachApplyAction: string;
  coachActionApplied: string;
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
  recommendationGetStarted: (emoji: string, name: string) => string;

  // Alerts
  remindersDisabledTitle: string;
  remindersDisabledMessage: string;

  // Notifications
  notifChannelName: string;
  notifTitle: string;
  notifBody: (emoji: string, name: string) => string;
  notifActionMarkDone: string;
  notifActionSnooze: string;

  // Smart reminders
  smartReminderMilestone: (emoji: string, name: string, target: number) => string;
  smartReminderAtRisk: (emoji: string, name: string, gap: number) => string;
  smartReminderDependency: (emoji: string, name: string, anchorName: string, liftPct: number) => string;
  smartReminderBestDay: (emoji: string, name: string, dayName: string, ratePct: number) => string;
  smartReminderWorstDay: (emoji: string, name: string, dayName: string) => string;
  smartReminderDeclining: (emoji: string, name: string, deltaPct: number) => string;
  smartReminderMomentum: (emoji: string, name: string, streak: number) => string;
  smartReminderLowEnergy: (emoji: string, name: string) => string;
  smartReminderDefault: (emoji: string, name: string, consistencyPct: number) => string;
  smartFollowupShortVersion: (emoji: string, name: string) => string;
  smartFollowupStillTime: (emoji: string, name: string) => string;

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

  // Weekly review
  weeklyReviewTitle: string;
  weeklyReviewDateRange: (start: string, end: string) => string;
  weeklyOverviewDone: (done: number, total: number) => string;
  weeklyPerfectDays: (n: number) => string;
  weeklyTrendUp: (delta: number) => string;
  weeklyTrendDown: (delta: number) => string;
  weeklyTrendFlat: string;
  weeklyBestHabits: string;
  weeklyWorstHabits: string;
  weeklyMissedHabits: string;
  weeklyMissedNone: string;
  weeklyMoodAvg: string;
  weeklyCorrelationsTitle: string;
  weeklyCorrelationPair: (a: string, b: string, days: number) => string;
  weeklyAiReviewTitle: string;
  weeklyAiLoading: string;
  weeklyAiError: string;
  weeklyAiWentWell: string;
  weeklyAiFailed: string;
  weeklyAiWhyFailed: string;
  weeklyAiNextWeek: string;
  dashboardWeeklyCard: string;
  dashboardWeeklyCardSummary: (rate: number, trend: string) => string;

  // Yearly review
  yearlyReviewTitle: string;
  yearlyReviewYear: (year: number) => string;
  yearlyConsistencyScore: string;
  yearlyTotalCompletions: string;
  yearlyPerfectDays: (n: number) => string;
  yearlyActiveDays: (active: number, total: number) => string;
  yearlyBeforeAfterTitle: string;
  yearlyBeforeLabel: string;
  yearlyAfterLabel: string;
  yearlyCompletionRate: (rate: number) => string;
  yearlyMonthlyTrendsTitle: string;
  yearlyBestMonth: (month: string, rate: number) => string;
  yearlyWorstMonth: (month: string, rate: number) => string;
  yearlyLongestStreakTitle: string;
  yearlyLongestStreakValue: (emoji: string, name: string, days: number) => string;
  yearlyHabitEvolutionTitle: string;
  yearlyTrendImproving: string;
  yearlyTrendDeclining: string;
  yearlyTrendSteady: string;
  yearlyBiggestImprovementsTitle: string;
  yearlyImprovementStat: (earlyRate: number, recentRate: number) => string;
  yearlyNoImprovements: string;
  yearlyGoalsAchievedTitle: string;
  yearlyNoGoals: string;
  yearlyMoodAvgTitle: string;
  yearlyAiTitle: string;
  yearlyAiLoading: string;
  yearlyAiError: string;
  yearlyAiStory: string;
  yearlyAiProud: string;
  yearlyAiTransformation: string;
  yearlyAiNextYear: string;
  yearlyAiClosing: string;
  yearlyHabitsAdded: (n: number) => string;
  dashboardYearlyCard: string;
  dashboardYearlyCardSummary: (score: number) => string;

  // Daily nudge
  dailyNudgeTitle: string;
  dailyNudgeLabel: string;
  dailyNudgeHint: string;
  dailyNudgeDisabledMessage: string;
  weeklyRecapLabel: string;
  weeklyRecapHint: string;
  weeklyRecapDisabledMessage: string;

  // Life Areas
  labelLifeArea: string;
  areaHealth: string;
  areaLearning: string;
  areaProductivity: string;
  areaRelationships: string;
  areaMind: string;
  areaFinance: string;

  // Life Balance
  lifeBalanceTitle: string;
  lifeBalanceOverall: (score: number) => string;
  lifeBalanceNoData: string;
  nextBestActionEyebrow: string;
  imbalanceDiverging: (risingArea: string, fallingArea: string) => string;
  imbalanceDivergingDetail: (risingArea: string, risingDelta: number, fallingArea: string, fallingDelta: number) => string;
  imbalanceDeclining: (area: string) => string;
  imbalanceDecliningDetail: (area: string, score: number, delta: number) => string;
  imbalanceNeglected: (area: string) => string;
  imbalanceNeglectedDetail: string;
  imbalanceOverinvested: (area: string, count: number) => string;
  imbalanceOverinvestedDetail: (area: string, score: number, weakAreas: string) => string;
  areaBreakdownTitle: string;
  areaHabitCount: (n: number) => string;

  // Monthly Review
  monthlyReviewTitle: string;
  monthlyAtAGlance: string;
  monthlyConsistency: string;
  monthlyHabitsCompleted: (done: number, total: number) => string;
  monthlyBestStreak: (days: number) => string;
  monthlyHabitsImproved: (count: number) => string;
  monthlyHabitsDeclined: (count: number) => string;
  monthlyGoalsAchieved: (achieved: number, total: number) => string;
  monthlyComparison: (prevMonth: string, currMonth: string, prevRate: number, currRate: number, delta: number) => string;
  monthlyProgressByArea: string;
  monthlyBiggestWins: string;
  monthlyYourBiggestWin: string;
  monthlyBiggestProblems: string;
  monthlyYourBiggestProblem: string;
  monthlyHabitByHabit: string;
  monthlyWhatToChange: string;
  monthlyNextMonthPriorities: string;
  monthlyReflectionTitle: string;
  monthlyQuestionWorked: string;
  monthlyQuestionDifficult: string;
  monthlyQuestionImprove: string;
  monthlyReflectionSaved: string;
  monthlyNextMonthPlan: string;
  monthlyPlanKeep: string;
  monthlyPlanChange: string;
  monthlyPlanPause: string;
  monthlyPlanNew: string;
  monthlyPlanFocusLabel: string;
  monthlyPlanFocusConsistency: string;
  monthlyPlanFocusStabilize: string;
  monthlyPlanFocusGrowth: string;
  monthlyPlanFocusMaintain: string;
  monthlyPlanApplyButton: string;
  monthlyPlanApplied: string;
  monthlyYearConnection: string;
  monthlyProgressStory: string;
  monthlyApplySuggestion: string;
  monthlySuggestionApplied: string;
  monthlyPauseHabit: string;
  monthlyResumeHabit: string;
  dashboardMonthlyCard: string;
  dashboardMonthlyCardSummary: (rate: number | null) => string;
  impactHigh: string;
  impactMedium: string;
  impactLow: string;

  // Habit Health
  habitHealthTitle: string;
  habitHealthScore: (score: number) => string;
  statConsistencyLabel: string;
  statFrequencyLabel: string;
  statTrendLabel: string;
  statDifficultyLabel: string;
  statRiskLabel: string;
  riskLow: string;
  riskMedium: string;
  riskHigh: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;

  // Focus Mode & Overload Intervention
  focusModeTitle: string;
  overloadInterventionHeadline: (count: number) => string;
  focusSectionTitle: string;
  secondarySectionTitle: string;
  overloadWarningTitle: string;
  overloadWarningBody: (count: number) => string;
  focusTopThreeButton: string;
  showAllHabitsButton: string;
  createAnywayButton: string;

  // Habit dependencies
  dependenciesTitle: string;
  dependencyInsight: (from: string, to: string, withPct: number, withoutPct: number) => string;
  dependenciesEmpty: string;

  // Habit experiments
  experimentsTitle: string;
  experimentStartButton: string;
  experimentStarted: string;
  experimentBadge: (days: number) => string;
  experimentMove: (emoji: string, name: string, from: string, to: string) => string;
  experimentGoal: string;
  experimentProgress: (day: number, total: number) => string;
  experimentRates: (baseline: number, current: number | null) => string;
  experimentVerdictBetter: (delta: number) => string;
  experimentVerdictWorse: (delta: number) => string;
  experimentVerdictSame: string;
  experimentKeep: string;
  experimentRevert: string;
}
