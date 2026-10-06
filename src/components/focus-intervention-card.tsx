import { useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

import { useTheme } from '@/hooks/use-theme';

import { setFocusModeEnabled, useFocusModeEnabled, type FocusPlan } from '@/lib/focus-mode';

import { useT } from '@/lib/i18n';

type Props = {

  plan: FocusPlan;

  onToggleFocus?: (active: boolean) => void;

};

export function FocusInterventionCard({ plan, onToggleFocus }: Props) {

  const theme = useTheme();

  const t = useT();

  const focusActive = useFocusModeEnabled();

  const [expanded, setExpanded] = useState(focusActive);

  if (!plan.isOverloaded && !plan.focusModeActive) return null;

  const handleToggle = () => {

    const next = !expanded;

    setExpanded(next);

    setFocusModeEnabled(next);

    onToggleFocus?.(next);

  };

  return (

    <View style={[styles.card, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '44' }]}>

      <View style={styles.headerRow}>

        <Text style={styles.emoji}>🎯</Text>

        <View style={styles.flex}>

          <Text style={[styles.eyebrow, { color: theme.accent }]}>AI COACH INTERVENTION</Text>

          <Text style={[styles.headline, { color: theme.text }]}>

            {t.overloadInterventionHeadline(plan.totalCount)}

          </Text>

        </View>

      </View>

      <View style={[styles.focusBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>

        <Text style={[styles.focusSectionTitle, { color: theme.text }]}>{t.focusSectionTitle}</Text>

        <View style={styles.focusList}>

          {plan.focusHabits.map((h, idx) => (

            <View key={h.id} style={styles.habitRow}>

              <Text style={[styles.habitIndex, { color: theme.accent }]}>{idx + 1}.</Text>

              <Text style={{ fontSize: 18 }}>{h.emoji}</Text>

              <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>

                {h.name}

              </Text>

            </View>

          ))}

        </View>

        <Text style={[styles.secondaryNote, { color: theme.textSecondary }]}>

          Everything else becomes secondary.

        </Text>

      </View>

      <View style={styles.buttonRow}>

        <Pressable

          onPress={handleToggle}

          style={({ pressed }) => [

            styles.primaryButton,

            { backgroundColor: expanded ? theme.backgroundSelected : theme.accent },

            pressed && styles.pressed,

          ]}>

          <Text style={[styles.primaryButtonText, { color: expanded ? theme.text : '#ffffff' }]}>

            {expanded ? t.showAllHabitsButton : t.focusTopThreeButton}

          </Text>

        </Pressable>

      </View>

    </View>

  );

}

const styles = StyleSheet.create({

  flex: { flex: 1 },

  card: {

    padding: Spacing.four,

    borderRadius: Radius.lg,

    borderWidth: 1.5,

    gap: Spacing.three,

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: Spacing.three,

  },

  emoji: {

    fontSize: 28,

  },

  eyebrow: {

    fontSize: 11,

    fontWeight: '800',

    letterSpacing: 1.2,

    marginBottom: 2,

  },

  headline: {

    fontSize: 15,

    fontWeight: '700',

    lineHeight: 22,

  },

  focusBox: {

    padding: Spacing.three,

    borderRadius: Radius.md,

    borderWidth: 1,

    gap: Spacing.two,

  },

  focusSectionTitle: {

    fontSize: 13,

    fontWeight: '800',

    letterSpacing: 0.5,

  },

  focusList: {

    gap: Spacing.two,

  },

  habitRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: Spacing.two,

  },

  habitIndex: {

    fontSize: 16,

    fontWeight: '800',

    width: 20,

  },

  habitName: {

    fontSize: 16,

    fontWeight: '700',

    flex: 1,

  },

  secondaryNote: {

    fontSize: 12,

    fontStyle: 'italic',

    marginTop: 4,

  },

  buttonRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: Spacing.two,

  },

  primaryButton: {

    paddingVertical: Spacing.three,

    paddingHorizontal: Spacing.four,

    borderRadius: Radius.pill,

    alignItems: 'center',

    justifyContent: 'center',

    alignSelf: 'flex-start',

  },

  primaryButtonText: {

    fontSize: 13,

    fontWeight: '700',

  },

  pressed: {

    opacity: 0.85,

    transform: [{ scale: 0.98 }],

  },

});

