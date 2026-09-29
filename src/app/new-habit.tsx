import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HabitColors, HabitEmojis, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addHabit } from '@/lib/habits';

const SUGGESTIONS = ['Drink 2L water', 'Read 10 pages', 'Walk 8k steps', 'Meditate 5 min', 'No sugar'];

export default function NewHabitScreen() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>(HabitEmojis[0]);
  const [color, setColor] = useState<string>(HabitColors[0]);

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    addHabit({ name: name.trim(), emoji, color });
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>New habit</Text>

      {/* Live preview */}
      <View style={[styles.preview, { backgroundColor: theme.backgroundElement, borderColor: color }]}>
        <View style={[styles.previewEmoji, { backgroundColor: color + '22' }]}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.previewName, { color: name ? theme.text : theme.textSecondary }]}>
          {name || 'Your new habit'}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Drink water"
        placeholderTextColor={theme.textSecondary}
        autoFocus
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={save}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />

      <View style={styles.wrap}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setName(s)}
            style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={{ color: theme.text, fontSize: 14 }}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>ICON</Text>
      <View style={styles.wrap}>
        {HabitEmojis.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[
              styles.emojiOption,
              { backgroundColor: theme.backgroundElement, borderColor: e === emoji ? color : theme.border },
            ]}>
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>COLOR</Text>
      <View style={styles.wrap}>
        {HabitColors.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            accessibilityLabel={`Color ${c}`}
            style={[styles.swatchRing, { borderColor: c === color ? c : 'transparent' }]}>
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={save}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.save,
          { backgroundColor: color, opacity: !canSave ? 0.4 : pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.saveText}>Create habit</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.three },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  previewEmoji: { width: 52, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18, fontWeight: '600', flex: 1 },
  input: {
    fontSize: 17,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: Spacing.two },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRing: { padding: 3, borderRadius: Radius.pill, borderWidth: 2 },
  swatch: { width: 32, height: 32, borderRadius: Radius.pill },
  save: { marginTop: Spacing.three, paddingVertical: 16, borderRadius: Radius.pill, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
