import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentStreak, deleteHabit, formatTime, toggleCompletion, type Habit } from '@/lib/habits';
import { cancelHabitReminder } from '@/lib/notifications';

type Props = { habit: Habit; day: string };

export function HabitCard({ habit, day }: Props) {
  const theme = useTheme();
  const done = habit.completions.includes(day);
  const streak = currentStreak(habit);

  const onToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleCompletion(habit.id, day);
  };

  const onLongPress = () => {
    Alert.alert(habit.name, undefined, [
      { text: 'Edit', onPress: () => router.push({ pathname: '/edit-habit', params: { id: habit.id } }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelHabitReminder(habit.reminderNotificationId);
          deleteHabit(habit.id);
        },
      },
      { text: 'Cancel', style: 'cancel' },
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
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'} streak` : 'Start your streak today'}
          {habit.reminderTime ? `  ·  ⏰ ${formatTime(habit.reminderTime)}` : ''}
        </Text>
      </View>

      <View
        style={[
          styles.check,
          done ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: theme.border },
        ]}>
        {done && <Text style={styles.checkMark}>✓</Text>}
      </View>
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
  meta: { fontSize: 13 },
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
