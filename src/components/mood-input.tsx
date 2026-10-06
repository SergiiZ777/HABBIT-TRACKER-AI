import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import { setMoodForDay, useMoodForDay } from '@/lib/mood';

const ENERGY_EMOJIS = ['😴', '😐', '🙂', '😊', '⚡'];
const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];

type Props = { day: string };

export function MoodInput({ day }: Props) {
  const theme = useTheme();
  const t = useT();
  const entry = useMoodForDay(day);

  const setEnergy = useCallback(
    (level: number) => {
      setMoodForDay(day, { energy: level, mood: entry?.mood ?? 0 });
    },
    [day, entry?.mood],
  );
  const setMoodLevel = useCallback(
    (level: number) => {
      setMoodForDay(day, { energy: entry?.energy ?? 0, mood: level });
    },
    [day, entry?.energy],
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t.moodSectionTitle}</Text>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t.moodEnergyLabel}</Text>
        <View style={styles.emojis}>
          {ENERGY_EMOJIS.map((e, i) => {
            const level = i + 1;
            const selected = entry?.energy === level;
            return (
              <TouchableOpacity
                key={e}
                onPress={() => setEnergy(level)}
                activeOpacity={0.6}
                style={[
                  styles.emojiBtn,
                  selected
                    ? { backgroundColor: theme.accent + '44', borderColor: theme.accent, transform: [{ scale: 1.15 }] }
                    : { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                ]}>
                <Text style={styles.emoji}>{e}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t.moodMoodLabel}</Text>
        <View style={styles.emojis}>
          {MOOD_EMOJIS.map((e, i) => {
            const level = i + 1;
            const selected = entry?.mood === level;
            return (
              <TouchableOpacity
                key={e}
                onPress={() => setMoodLevel(level)}
                activeOpacity={0.6}
                style={[
                  styles.emojiBtn,
                  selected
                    ? { backgroundColor: theme.accent + '44', borderColor: theme.accent, transform: [{ scale: 1.15 }] }
                    : { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                ]}>
                <Text style={styles.emoji}>{e}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.two },
  title: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 13, fontWeight: '600', width: 60 },
  emojis: { flexDirection: 'row', gap: 6, flex: 1 },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
});
