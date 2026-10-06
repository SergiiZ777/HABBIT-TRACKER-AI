import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { computeHabitHealth, type HabitHealth } from '@/lib/habit-health';

import type { Habit } from '@/lib/habits';

import { useT } from '@/lib/i18n';

type Props = {

  habit: Habit;

  health?: HabitHealth;

  today?: Date;

  compact?: boolean;

};

export function HabitHealthCard({ habit, health: customHealth, today = new Date(), compact = false }: Props) {

  const theme = useTheme();

  const t = useT();

  const health = customHealth ?? computeHabitHealth(habit, t, today);

  const riskLabel =

    health.risk === 'high'

      ? t.riskHigh

      : health.risk === 'medium'

        ? t.riskMedium

        : t.riskLow;

  const riskColor =

    health.risk === 'high'

      ? '#ef4444'

      : health.risk === 'medium'

        ? '#f59e0b'

        : '#22c55e';

  const difficultyLabel =

    health.difficulty === 'hard'

      ? t.difficultyHard

      : health.difficulty === 'medium'

        ? t.difficultyMedium

        : t.difficultyEasy;

  const trendSymbol =

    health.trend === 'up' ? '↑' : health.trend === 'down' ? '↓' : '→';

  const trendColor =

    health.trend === 'up'

      ? '#22c55e'

      : health.trend === 'down'

        ? '#ef4444'

        : theme.textSecondary;

  if (compact) {

    return (

      <View style={[styles.compactContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>

        <View style={styles.headerRow}>

          <Text style={{ fontSize: 20 }}>{habit.emoji}</Text>

          <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>

            {habit.name}

          </Text>

          <View style={[styles.scoreBadge, { backgroundColor: health.badgeColor + '22' }]}>

            <Text style={[styles.scoreBadgeText, { color: health.badgeColor }]}>

              {health.score}/100

            </Text>

          </View>

        </View>

        <View style={styles.compactMetaRow}>

          <Text style={[styles.compactMeta, { color: theme.textSecondary }]}>

            {t.statConsistencyLabel}: <Text style={{ color: theme.text, fontWeight: '700' }}>{health.consistency}%</Text>

          </Text>

          <Text style={[styles.compactMeta, { color: theme.textSecondary }]}>

            {t.statTrendLabel}: <Text style={{ color: trendColor, fontWeight: '700' }}>{trendSymbol}</Text>

          </Text>

          <Text style={[styles.compactMeta, { color: theme.textSecondary }]}>

            {t.statRiskLabel}: <Text style={{ color: riskColor, fontWeight: '700' }}>{riskLabel}</Text>

          </Text>

        </View>

        <View style={[styles.aiExplanationBox, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '33' }]}>

          <Text style={[styles.aiQuote, { color: theme.text }]}>

            &ldquo;{health.explanation}&rdquo;

          </Text>

        </View>

      </View>

    );

  }

  return (

    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>

      <View style={styles.headerRow}>

        <View style={styles.titleWrap}>

          <Text style={{ fontSize: 22 }}>{habit.emoji}</Text>

          <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>

            {habit.name}

          </Text>

        </View>

        <View style={[styles.scoreBadgeLarge, { backgroundColor: health.badgeColor + '22', borderColor: health.badgeColor + '44' }]}>

          <Text style={[styles.scoreValueLarge, { color: health.badgeColor }]}>

            {health.score}

          </Text>

          <Text style={[styles.scoreMaxText, { color: health.badgeColor + 'aa' }]}>/100</Text>

        </View>

      </View>

      <View style={styles.statsGrid}>

        <View style={[styles.statTile, { backgroundColor: theme.backgroundSelected }]}>

          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t.statConsistencyLabel}</Text>

          <Text style={[styles.statValue, { color: theme.text }]}>{health.consistency}%</Text>

        </View>

        <View style={[styles.statTile, { backgroundColor: theme.backgroundSelected }]}>

          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t.statFrequencyLabel}</Text>

          <Text style={[styles.statValue, { color: theme.text }]}>{health.frequency}%</Text>

        </View>

        <View style={[styles.statTile, { backgroundColor: theme.backgroundSelected }]}>

          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t.statTrendLabel}</Text>

          <Text style={[styles.statValue, { color: trendColor }]}>

            {trendSymbol} {health.trendDelta > 0 ? `+${health.trendDelta}%` : health.trendDelta < 0 ? `${health.trendDelta}%` : ''}

          </Text>

        </View>

        <View style={[styles.statTile, { backgroundColor: theme.backgroundSelected }]}>

          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t.statDifficultyLabel}</Text>

          <Text style={[styles.statValue, { color: theme.text }]}>{difficultyLabel}</Text>

        </View>

      </View>

      <View style={[styles.riskRow, { backgroundColor: riskColor + '15', borderColor: riskColor + '30' }]}>

        <Text style={[styles.riskRowLabel, { color: theme.textSecondary }]}>{t.statRiskLabel}:</Text>

        <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>

          <Text style={styles.riskBadgeText}>{riskLabel}</Text>

        </View>

      </View>

      <View style={[styles.aiExplanationBox, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '33' }]}>

        <Text style={styles.aiEmoji}>🤖</Text>

        <View style={styles.flex}>

          <Text style={[styles.aiTitle, { color: theme.textSecondary }]}>AI COACH EXPLANATION</Text>

          <Text style={[styles.aiQuote, { color: theme.text }]}>&ldquo;{health.explanation}&rdquo;</Text>

        </View>

      </View>

    </View>

  );

}

const styles = StyleSheet.create({

  flex: { flex: 1 },

  container: {

    padding: Spacing.four,

    borderRadius: Radius.lg,

    borderWidth: 1.5,

    gap: Spacing.three,

  },

  compactContainer: {

    padding: Spacing.three,

    borderRadius: Radius.md,

    borderWidth: 1,

    gap: Spacing.two,

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: Spacing.two,

  },

  titleWrap: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: Spacing.two,

    flex: 1,

  },

  habitName: {

    fontSize: 18,

    fontWeight: '800',

    flex: 1,

  },

  scoreBadge: {

    paddingHorizontal: Spacing.two,

    paddingVertical: 4,

    borderRadius: Radius.pill,

  },

  scoreBadgeText: {

    fontSize: 13,

    fontWeight: '800',

  },

  scoreBadgeLarge: {

    flexDirection: 'row',

    alignItems: 'baseline',

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: Radius.pill,

    borderWidth: 1,

  },

  scoreValueLarge: {

    fontSize: 22,

    fontWeight: '900',

  },

  scoreMaxText: {

    fontSize: 13,

    fontWeight: '700',

  },

  compactMetaRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: Spacing.one,

  },

  compactMeta: {

    fontSize: 12,

  },

  statsGrid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: Spacing.two,

  },

  statTile: {

    flexBasis: '47%',

    flexGrow: 1,

    padding: Spacing.three,

    borderRadius: Radius.md,

    gap: 2,

  },

  statLabel: {

    fontSize: 12,

    fontWeight: '600',

  },

  statValue: {

    fontSize: 16,

    fontWeight: '800',

  },

  riskRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: Spacing.three,

    paddingVertical: Spacing.two,

    borderRadius: Radius.md,

    borderWidth: 1,

  },

  riskRowLabel: {

    fontSize: 13,

    fontWeight: '600',

  },

  riskBadge: {

    paddingHorizontal: Spacing.two,

    paddingVertical: 3,

    borderRadius: Radius.pill,

  },

  riskBadgeText: {

    color: '#ffffff',

    fontSize: 12,

    fontWeight: '800',

  },

  aiExplanationBox: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: Spacing.two,

    padding: Spacing.three,

    borderRadius: Radius.md,

    borderWidth: 1,

  },

  aiEmoji: {

    fontSize: 20,

    marginTop: 2,

  },

  aiTitle: {

    fontSize: 10,

    fontWeight: '800',

    letterSpacing: 1,

    marginBottom: 2,

  },

  aiQuote: {

    fontSize: 13,

    lineHeight: 19,

    fontStyle: 'italic',

  },

});

