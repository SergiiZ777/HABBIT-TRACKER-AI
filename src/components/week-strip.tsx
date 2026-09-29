import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dayKey, type Habit } from '@/lib/habits';
import { useLocaleTag } from '@/lib/i18n';

type Props = {
  habits: Habit[];
  selected: string;
  onSelect: (day: string) => void;
};

/** The last 7 days; each day shows a dot filled by that day's completion rate. */
export function WeekStrip({ habits, selected, onSelect }: Props) {
  const theme = useTheme();
  const localeTag = useLocaleTag();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <View style={styles.row}>
      {days.map((date) => {
        const key = dayKey(date);
        const isSelected = key === selected;
        const doneCount = habits.filter((h) => h.completions.includes(key)).length;
        const rate = habits.length ? doneCount / habits.length : 0;

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            style={[styles.day, isSelected && { backgroundColor: theme.text }]}>
            <Text style={[styles.weekday, { color: isSelected ? theme.background : theme.textSecondary }]}>
              {date.toLocaleDateString(localeTag, { weekday: 'narrow' })}
            </Text>
            <Text style={[styles.date, { color: isSelected ? theme.background : theme.text }]}>
              {date.getDate()}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: rate === 1 ? theme.accent : isSelected ? theme.background : theme.border,
                  opacity: rate > 0 && rate < 1 ? 0.4 + rate * 0.6 : 1,
                },
                rate > 0 && rate < 1 && { backgroundColor: theme.accent },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    width: 44,
    borderRadius: Radius.md,
  },
  weekday: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 17, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
