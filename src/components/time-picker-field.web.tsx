import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { time: string; color: string; onChange: (time: string) => void };

/**
 * Web fallback: @react-native-community/datetimepicker has no web implementation
 * (renders nothing there), so this uses the browser's native <input type="time">,
 * whose value format ("HH:mm") already matches how we store reminderTime.
 */
export function TimePickerField({ time, color, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.text }]}>Remind me at</Text>
      {/* Plain DOM element: react-native-web renders on top of ReactDOM, so a host tag works here. */}
      <input
        type="time"
        value={time}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{
          fontSize: 16,
          fontWeight: 700,
          color,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </View>
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
});
