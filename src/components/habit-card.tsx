import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, deleteHabit, formatTime, habitReminderNotificationIds, streakMilestoneColor, toggleCompletion, type Habit } from '@/lib/habits';
import { useLocaleTag, useT } from '@/lib/i18n';
import { cancelHabitReminder } from '@/lib/notifications';

type Props = { habit: Habit; day: string };

export function HabitCard({ habit, day }: Props) {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const done = habit.completions.includes(day);
  const streak = currentStreak(habit);

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
    Alert.alert(habit.name, undefined, [
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
    ]);
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
          {habit.name}
        </Text>
        <View style={styles.metaRow}>
          {streak > 0 ? (
            <View style={[styles.streakPill, { backgroundColor: (streakMilestoneColor(streak) ?? theme.textSecondary) + '22' }]}>
              <Text style={[styles.streakPillText, { color: streakMilestoneColor(streak) ?? theme.textSecondary }]}>
                🔥 {t.streakBadge(streak)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{t.startStreakToday}</Text>
          )}
          {habit.reminderTime ? (
            <Text style={[styles.meta, { color: theme.textSecondary }]}>⏰ {formatTime(habit.reminderTime, localeTag)}</Text>
          ) : null}
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
  streakPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  streakPillText: { fontSize: 12, fontWeight: '700' },
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
