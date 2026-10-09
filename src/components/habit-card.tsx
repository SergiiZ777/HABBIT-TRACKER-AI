import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeHabitHealth } from '@/lib/habit-health';
import { currentStreak, dayKey, deleteHabit, formatTime, habitReminderNotificationIds, isScheduledOn, streakMilestoneColor, toggleCompletion, type Habit } from '@/lib/habits';
import { useLocaleTag, useT } from '@/lib/i18n';
import { hasReasonForHabitDay, setMissReason, type MissReason } from '@/lib/miss-reasons';
import { cancelHabitReminder } from '@/lib/notifications';

type Props = { habit: Habit; day: string };

export function HabitCard({ habit, day }: Props) {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const done = habit.completions.includes(day);
  const streak = currentStreak(habit);
  const health = computeHabitHealth(habit, t, new Date(day + 'T12:00:00'));
  const todayKey = dayKey(new Date());
  const isPastMiss = day < todayKey && !done && isScheduledOn(habit, new Date(day + 'T12:00:00'));
  const hasReason = isPastMiss && hasReasonForHabitDay(habit.id, day);

  const showWhyPrompt = () => {
    const reasons: { key: MissReason; label: string }[] = [
      { key: 'tooTired', label: t.missReasonTooTired },
      { key: 'noTime', label: t.missReasonNoTime },
      { key: 'forgot', label: t.missReasonForgot },
      { key: 'noMotivation', label: t.missReasonNoMotivation },
      { key: 'scheduleConflict', label: t.missReasonScheduleConflict },
      { key: 'tooDifficult', label: t.missReasonTooDifficult },
    ];
    if (Platform.OS === 'web') {
      const options = reasons.map((r, i) => `${i + 1}. ${r.label}`).join('\n');
      const choice = prompt(`${t.missReasonPrompt}\n\n${options}`);
      if (choice) {
        const idx = parseInt(choice, 10) - 1;
        if (idx >= 0 && idx < reasons.length) setMissReason(habit.id, day, reasons[idx].key);
      }
    } else {
      Alert.alert(
        t.missReasonPrompt,
        undefined,
        [
          ...reasons.map((r) => ({ text: r.label, onPress: () => setMissReason(habit.id, day, r.key) })),
          { text: t.missReasonSkip, style: 'cancel' as const },
        ]
      );
    }
  };

  const scale = useSharedValue(1);
  const prevDone = useRef(done);
  useEffect(() => {
    if (done && !prevDone.current) {
      scale.value = withSequence(withTiming(1.25, { duration: 100 }), withSpring(1, { damping: 10, stiffness: 200 }));
    }
    prevDone.current = done;
  }, [done, scale]);
  const checkAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onToggle = () => {
    if (Platform.OS !== 'web') {
      if (done) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    toggleCompletion(habit.id, day);
  };

  const onLongPress = () => {
    const riskText =
      health.risk === 'high'
        ? t.riskHigh
        : health.risk === 'medium'
          ? t.riskMedium
          : t.riskLow;

    const info = `${t.statConsistencyLabel}: ${health.consistency}%\n${t.statTrendLabel}: ${health.trend === 'up' ? '↑' : health.trend === 'down' ? '↓' : '→'}\n${t.statRiskLabel}: ${riskText}\n\n🤖 "${health.explanation}"`;

    if (Platform.OS === 'web') {
      const choice = prompt(
        `${habit.emoji} ${habit.name} — ${health.score}/100\n\n${info}\n\n1. ${t.actionEdit}\n2. ${t.actionDelete}\n3. ${t.actionCancel}`
      );
      if (choice === '1') {
        router.push({ pathname: '/edit-habit', params: { id: habit.id } });
      } else if (choice === '2') {
        if (confirm(`${t.actionDelete} "${habit.name}"?`)) {
          void cancelHabitReminder(habitReminderNotificationIds(habit)).then(() => deleteHabit(habit.id));
        }
      }
    } else {
      Alert.alert(
        `${habit.emoji} ${habit.name} — ${health.score}/100`,
        info,
        [
          { text: t.actionEdit, onPress: () => router.push({ pathname: '/edit-habit', params: { id: habit.id } }) },
          {
            text: t.actionDelete,
            style: 'destructive',
            onPress: async () => {
              await cancelHabitReminder(habitReminderNotificationIds(habit));
              deleteHabit(habit.id);
            },
          },
          { text: t.actionCancel, style: 'cancel' },
        ]
      );
    }
  };

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={habit.name}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: done ? habit.color : theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.emojiWrap, { backgroundColor: habit.color + '22' }]}>
        <Text style={styles.emoji}>{habit.emoji}</Text>
      </View>

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: theme.text },
            done && { textDecorationLine: 'line-through', color: theme.textSecondary },
          ]}>
          {habit.priority === 'high' ? '⭐ ' : ''}{habit.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.healthPill, { backgroundColor: health.badgeColor + '22' }]}>
            <Text style={[styles.healthPillText, { color: health.badgeColor }]}>
              💚 {health.score}/100
            </Text>
          </View>
          {streak > 0 ? (
            <View style={[styles.streakPill, { backgroundColor: (streakMilestoneColor(streak) ?? theme.textSecondary) + '22' }]}>
              <Text style={[styles.streakPillText, { color: streakMilestoneColor(streak) ?? theme.textSecondary }]}>
                🔥 {t.streakBadge(streak)}
              </Text>
            </View>
          ) : null}
          {habit.reminderTime ? (
            <Text style={[styles.meta, { color: theme.textSecondary }]}>⏰ {formatTime(habit.reminderTime, localeTag)}</Text>
          ) : null}
          {isPastMiss && !hasReason && (
            <Pressable onPress={showWhyPrompt} hitSlop={8}>
              <Text style={[styles.whyLink, { color: theme.accent }]}>{t.missReasonWhyLink}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          styles.check,
          done ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: theme.border },
          checkAnimStyle,
        ]}>
        {done && <Text style={styles.checkMark}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  body: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { fontSize: 13 },
  healthPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill },
  healthPillText: { fontSize: 11, fontWeight: '800' },
  streakPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  streakPillText: { fontSize: 12, fontWeight: '700' },
  whyLink: { fontSize: 12, fontWeight: '700' },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
