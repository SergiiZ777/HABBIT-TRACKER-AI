import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { TimePickerField } from '@/components/time-picker-field';
import { HabitColors, HabitEmojis, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weekdayLabel } from '@/lib/habits';
import { useLocaleTag, useT } from '@/lib/i18n';

import { areaLabel, guessArea, LIFE_AREA_EMOJI, LIFE_AREAS, type LifeArea } from '@/lib/life-areas';

const DEFAULT_REMINDER_TIME = '08:00';
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export type HabitFormValues = {
  name: string;
  emoji: string;
  color: string;
  scheduledDays: number[];
  priority: 'high' | 'normal';
  area: LifeArea;
  reminderEnabled: boolean;
  reminderTime: string;
};

type Props = {
  title: string;
  submitLabel: string;
  initialValues?: Partial<HabitFormValues>;
  onSubmit: (values: HabitFormValues) => void | Promise<void>;
  onDelete?: () => void;
};

export function HabitForm({ title, submitLabel, initialValues, onSubmit, onDelete }: Props) {
  const theme = useTheme();
  const t = useT();
  const localeTag = useLocaleTag();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [emoji, setEmoji] = useState<string>(initialValues?.emoji ?? HabitEmojis[0]);
  const [color, setColor] = useState<string>(initialValues?.color ?? HabitColors[0]);
  const [scheduledDays, setScheduledDays] = useState<number[]>(initialValues?.scheduledDays ?? ALL_DAYS);
  const [priority, setPriority] = useState<'high' | 'normal'>(initialValues?.priority ?? 'normal');
  const [area, setArea] = useState<LifeArea>(initialValues?.area ?? guessArea(initialValues?.name ?? '', initialValues?.emoji ?? HabitEmojis[0]));
  const [reminderEnabled, setReminderEnabled] = useState(initialValues?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(initialValues?.reminderTime ?? DEFAULT_REMINDER_TIME);

  const toggleDay = (dow: number) => {
    setScheduledDays((prev) => {
      if (prev.includes(dow)) {
        if (prev.length === 1) return prev; // always keep at least one day scheduled
        return prev.filter((d) => d !== dow);
      }
      return [...prev, dow].sort();
    });
  };

  const suggestions = [
    t.suggestionDrinkWater,
    t.suggestionReadPages,
    t.suggestionWalkSteps,
    t.suggestionMeditate,
    t.suggestionNoSugar,
  ];

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSubmit({ name: name.trim(), emoji, color, scheduledDays, priority, area, reminderEnabled, reminderTime });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

      {/* Live preview */}
      <View style={[styles.preview, { backgroundColor: theme.backgroundElement, borderColor: color }]}>
        <View style={[styles.previewEmoji, { backgroundColor: color + '22' }]}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.previewName, { color: name ? theme.text : theme.textSecondary }]}>
          {name || t.yourNewHabit}
        </Text>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t.placeholderHabitName}
        placeholderTextColor={theme.textSecondary}
        autoFocus={!initialValues}
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={save}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />

      <View style={styles.wrap}>
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => setName(s)}
            style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={{ color: theme.text, fontSize: 14 }}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelIcon}</Text>
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

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelColor}</Text>
      <View style={styles.wrap}>
        {HabitColors.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            accessibilityLabel={t.colorName(i)}
            style={[styles.swatchRing, { borderColor: c === color ? c : 'transparent' }]}>
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelScheduledDays}</Text>
      <View style={styles.wrap}>
        {ALL_DAYS.map((dow) => {
          const selected = scheduledDays.includes(dow);
          return (
            <Pressable
              key={dow}
              onPress={() => toggleDay(dow)}
              accessibilityLabel={weekdayLabel(dow, localeTag, 'long')}
              style={[
                styles.dayOption,
                { backgroundColor: selected ? color : theme.backgroundElement, borderColor: selected ? color : theme.border },
              ]}>
              <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '700' }}>
                {weekdayLabel(dow, localeTag, 'narrow')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelPriority}</Text>
      <View style={styles.priorityRow}>
        {(['normal', 'high'] as const).map((p) => {
          const active = priority === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.priorityOption,
                { backgroundColor: active ? color : theme.backgroundElement, borderColor: active ? color : theme.border },
              ]}>
              <Text style={{ color: active ? '#fff' : theme.text, fontSize: 14, fontWeight: '600' }}>
                {p === 'high' ? `⭐ ${t.priorityHigh}` : t.priorityNormal}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelLifeArea}</Text>
      <View style={styles.wrap}>
        {LIFE_AREAS.map((a) => {
          const selected = area === a;
          return (
            <Pressable
              key={a}
              onPress={() => setArea(a)}
              style={[
                styles.areaChip,
                { backgroundColor: selected ? color : theme.backgroundElement, borderColor: selected ? color : theme.border },
              ]}>
              <Text style={{ color: selected ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
                {LIFE_AREA_EMOJI[a]} {areaLabel(t, a)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>{t.labelReminder}</Text>
      <View style={[styles.reminderRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={[styles.reminderLabel, { color: theme.text }]}>{t.dailyReminder}</Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ true: color, false: theme.backgroundSelected }}
        />
      </View>

      {reminderEnabled && <TimePickerField time={reminderTime} color={color} onChange={setReminderTime} />}

      <Pressable
        onPress={save}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.save,
          { backgroundColor: color, opacity: !canSave ? 0.4 : pressed ? 0.85 : 1 },
        ]}>
        <Text style={styles.saveText}>{submitLabel}</Text>
      </Pressable>

      {onDelete && (
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { borderColor: '#ef4444', opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={styles.deleteText}>{t.deleteHabitButton}</Text>
        </Pressable>
      )}
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
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityRow: { flexDirection: 'row', gap: Spacing.two },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  reminderLabel: { fontSize: 16, fontWeight: '600' },
  save: { marginTop: Spacing.three, paddingVertical: 16, borderRadius: Radius.pill, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  deleteButton: { paddingVertical: 14, borderRadius: Radius.pill, alignItems: 'center', borderWidth: 1.5 },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
