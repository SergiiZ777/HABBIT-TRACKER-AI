import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import { getMoodForDay, setMoodForDay, useMood } from '@/lib/mood';

const ENERGY_EMOJIS = ['😴', '😐', '🙂', '😊', '⚡'];
const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];

type Props = { day: string };

export function MoodInput({ day }: Props) {
  const theme = useTheme();
  const t = useT();
  useMood();
  const entry = getMoodForDay(day);

  const setEnergy = (level: number) => {
    setMoodForDay(day, { energy: level, mood: entry?.mood ?? 0 });
  };
  const setMoodLevel = (level: number) => {
    setMoodForDay(day, { energy: entry?.energy ?? 0, mood: level });
  };

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
              <Pressable
                key={e}
                onPress={() => setEnergy(level)}
                style={[
                  styles.emojiBtn,
                  selected
                    ? { backgroundColor: theme.accent + '22', borderColor: theme.accent }
                    : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                ]}>
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
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
              <Pressable
                key={e}
                onPress={() => setMoodLevel(level)}
                style={[
                  styles.emojiBtn,
                  selected
                    ? { backgroundColor: theme.accent + '22', borderColor: theme.accent }
                    : { backgroundColor: theme.backgroundSelected, borderColor: 'transparent' },
                ]}>
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
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
