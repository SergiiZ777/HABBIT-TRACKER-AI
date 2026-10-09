import * as Haptics from 'expo-haptics';

import { useRef, useState } from 'react';

import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

import { useTheme } from '@/hooks/use-theme';

import { applyHabitChange, isChangeApplied } from '@/lib/habit-actions';

import { getHabits, toggleCompletion } from '@/lib/habits';

import { startExperiment, useExperiments } from '@/lib/habit-experiments';

import { computeHabitHealth } from '@/lib/habit-health';

import { useT } from '@/lib/i18n';

import type { NextBestAction } from '@/lib/next-best-action';

import { getEffectivenessStats, logRecommendation, markApplied, markDismissed } from '@/lib/recommendation-log';

type Props = {

  action: NextBestAction;

  onApplied?: () => void;

  onDismissed?: () => void;

};

export function NextBestActionCard({ action, onApplied, onDismissed }: Props) {

  const theme = useTheme();

  const t = useT();

  const entryIdRef = useRef<string | null>(null);

  if (entryIdRef.current == null) {
    const habit = getHabits().find((h) => h.id === action.habitId);
    const preScore = habit ? computeHabitHealth(habit, t, new Date()).score : undefined;
    entryIdRef.current = logRecommendation({
      source: 'nextBestAction',
      type: action.type,
      habitId: action.habitId,
      habitName: action.habitName,
      headline: action.headline,
      change: action.change,
      preScore,
    });
  }

  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prevTime] = useState(() => getHabits().find((h) => h.id === action.habitId)?.reminderTime ?? '—');

  const [done, setDone] = useState(() => {

    const habit = getHabits().find((h) => h.id === action.habitId);

    if (action.markCompletedDay && habit) {

      return habit.completions.includes(action.markCompletedDay);

    }

    if (action.change && habit) {

      return isChangeApplied(habit, action.change);

    }

    return false;

  });

  const experiments = useExperiments();

  const canExperiment =
    action.type === 'timeShift' &&
    !!action.change?.reminderTime &&
    !done &&
    !experiments.some((e) => e.habitId === action.habitId && e.status === 'running');

  const handleExperiment = async () => {
    if (!action.change?.reminderTime || loading) return;
    setLoading(true);
    try {
      await startExperiment(action.habitId, action.change.reminderTime, t);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (entryIdRef.current) markDismissed(entryIdRef.current);
    setDismissed(true);
    onDismissed?.();
  };

  if (dismissed) return null;

  const isRest = action.type === 'recoveryRest';
  const tint = isRest ? '#8b5cf6' : theme.accent;
  const stats = getEffectivenessStats();

  const appliedDetail = (() => {
    if (!done) return null;
    if (action.markCompletedDay) return t.nbaAppliedMilestone;
    if (action.change?.pause) return t.nbaAppliedPause;
    if (action.change?.reminderTime && action.type === 'routineStack')
      return t.nbaAppliedRoutineStack(action.change.reminderTime);
    if (action.change?.reminderTime) {
      return t.nbaAppliedTimeShift(prevTime, action.change.reminderTime);
    }
    if (action.change?.scheduledDays)
      return t.nbaAppliedReduceTarget(action.change.scheduledDays.length);
    return null;
  })();

  const handleApply = async () => {

    if (done || loading) return;

    if (Platform.OS !== 'web') {

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    }

    setLoading(true);

    try {

      if (action.markCompletedDay) {

        toggleCompletion(action.habitId, action.markCompletedDay);

        setDone(true);

      } else if (action.change) {

        await applyHabitChange(action.habitId, action.change, t);

        setDone(true);

      }

      if (entryIdRef.current) markApplied(entryIdRef.current);

      onApplied?.();

    } finally {

      setLoading(false);

    }

  };

  return (

    <View style={[styles.card, { backgroundColor: tint + '15', borderColor: tint + '44' }]}>

      <View style={styles.headerRow}>

        <Text style={[styles.eyebrow, { color: tint }]}>{isRest ? '🌿' : '✨'} {t.nbaEyebrow}</Text>

        <View style={[styles.impactBadge, { backgroundColor: tint + '25' }]}>

          <Text style={[styles.impactText, { color: tint }]}>{t.nbaRoi(action.impactGainPct)}</Text>

        </View>

      </View>

      <Text style={[styles.headline, { color: theme.text }]}>{action.headline}</Text>

      <View style={[styles.reasonBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>

        <Text style={[styles.reasonText, { color: theme.textSecondary }]}>

          &ldquo;{action.reason}&rdquo;

        </Text>

      </View>

      <Pressable

        onPress={handleApply}

        disabled={done || loading}

        style={({ pressed }) => [

          styles.actionButton,

          { backgroundColor: done ? theme.backgroundSelected : tint },

          pressed && styles.pressed,

        ]}>

        {loading ? (

          <ActivityIndicator color="#ffffff" size="small" />

        ) : (

          <Text style={[styles.actionButtonText, { color: done ? theme.textSecondary : '#ffffff' }]}>

            {done ? t.nbaApplied : action.actionLabel}

          </Text>

        )}

      </Pressable>

      {done && appliedDetail && (
        <Text style={[styles.appliedDetail, { color: '#22c55e' }]}>
          ✅ {appliedDetail}
        </Text>
      )}

      {canExperiment && (
        <Pressable onPress={handleExperiment} disabled={loading} style={styles.experimentLink}>
          <Text style={[styles.experimentLinkText, { color: tint }]}>🧪 {t.experimentStartButton}</Text>
        </Pressable>
      )}

      {!done && (
        <Pressable onPress={handleDismiss} style={styles.dismissLink}>
          <Text style={[styles.dismissLinkText, { color: theme.textSecondary }]}>{t.nbaDismiss}</Text>
        </Pressable>
      )}

      {stats.totalApplied >= 3 && (
        <Text style={[styles.effectivenessText, { color: theme.textSecondary }]}>
          {t.nbaEffectivenessLabel(stats.effectivenessRate, stats.totalApplied)}
        </Text>
      )}

    </View>

  );

}

const styles = StyleSheet.create({

  card: {

    padding: Spacing.four,

    borderRadius: Radius.lg,

    borderWidth: 1.5,

    gap: Spacing.three,

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

  },

  eyebrow: {

    fontSize: 12,

    fontWeight: '800',

    letterSpacing: 1.2,

  },

  impactBadge: {

    paddingHorizontal: Spacing.two,

    paddingVertical: 3,

    borderRadius: Radius.pill,

  },

  impactText: {

    fontSize: 11,

    fontWeight: '800',

  },

  headline: {

    fontSize: 18,

    fontWeight: '800',

    lineHeight: 24,

  },

  reasonBox: {

    padding: Spacing.three,

    borderRadius: Radius.md,

    borderWidth: 1,

  },

  reasonText: {

    fontSize: 14,

    lineHeight: 20,

    fontStyle: 'italic',

  },

  actionButton: {

    paddingVertical: Spacing.three,

    paddingHorizontal: Spacing.four,

    borderRadius: Radius.pill,

    alignItems: 'center',

    justifyContent: 'center',

    alignSelf: 'flex-start',

  },

  actionButtonText: {

    fontSize: 14,

    fontWeight: '700',

  },

  experimentLink: { alignSelf: 'flex-start', paddingVertical: 4 },

  experimentLinkText: { fontSize: 13, fontWeight: '700' },

  dismissLink: { alignSelf: 'flex-start', paddingVertical: 4 },

  dismissLinkText: { fontSize: 13, fontWeight: '600' },

  appliedDetail: { fontSize: 13, fontWeight: '600' },

  effectivenessText: { fontSize: 12, fontStyle: 'italic' },

  pressed: {

    opacity: 0.85,

    transform: [{ scale: 0.98 }],

  },

});

