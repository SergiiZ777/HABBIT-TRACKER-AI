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

import { logRecommendation, markApplied } from '@/lib/recommendation-log';

type Props = {

  action: NextBestAction;

  onApplied?: () => void;

};

export function NextBestActionCard({ action, onApplied }: Props) {

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

  const [loading, setLoading] = useState(false);

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

    <View style={[styles.card, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '44' }]}>

      <View style={styles.headerRow}>

        <Text style={[styles.eyebrow, { color: theme.accent }]}>✨ TODAY&apos;S RECOMMENDATION</Text>

        <View style={[styles.impactBadge, { backgroundColor: theme.accent + '25' }]}>

          <Text style={[styles.impactText, { color: theme.accent }]}>+{action.impactGainPct}% ROI</Text>

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

          { backgroundColor: done ? theme.backgroundSelected : theme.accent },

          pressed && styles.pressed,

        ]}>

        {loading ? (

          <ActivityIndicator color="#ffffff" size="small" />

        ) : (

          <Text style={[styles.actionButtonText, { color: done ? theme.textSecondary : '#ffffff' }]}>

            {done ? 'Applied ✓' : action.actionLabel}

          </Text>

        )}

      </Pressable>

      {canExperiment && (
        <Pressable onPress={handleExperiment} disabled={loading} style={styles.experimentLink}>
          <Text style={[styles.experimentLinkText, { color: theme.accent }]}>🧪 {t.experimentStartButton}</Text>
        </Pressable>
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

  pressed: {

    opacity: 0.85,

    transform: [{ scale: 0.98 }],

  },

});

