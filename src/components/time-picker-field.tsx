import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateToTime, formatTime, timeToDate } from '@/lib/habits';

type Props = { time: string; color: string; onChange: (time: string) => void };

/** Native (iOS/Android) time field: a tappable row that reveals the platform's own time picker. */
export function TimePickerField({ time, color, onChange }: Props) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) onChange(dateToTime(selectedDate));
      return;
    }
    if (selectedDate) onChange(dateToTime(selectedDate));
  };

  return (
    <>
      <Pressable
        onPress={() => setShowPicker((v) => !v)}
        style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.text }]}>Remind me at</Text>
        <Text style={[styles.time, { color }]}>{formatTime(time)}</Text>
      </Pressable>

      {showPicker && (
        <View style={[styles.pickerWrap, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <DateTimePicker
            value={timeToDate(time)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={() => setShowPicker(false)} style={styles.done}>
              <Text style={[styles.doneText, { color }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  label: { fontSize: 16, fontWeight: '600' },
  time: { fontSize: 16, fontWeight: '700' },
  pickerWrap: { borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', paddingBottom: Spacing.two },
  done: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.four },
  doneText: { fontSize: 16, fontWeight: '700' },
});
