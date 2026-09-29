import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitcher } from '@/components/language-switcher';
import { HabitColors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addHabit, restoreHabits } from '@/lib/habits';
import { useT } from '@/lib/i18n';
import { completeOnboarding } from '@/lib/onboarding-store';
import { pullBackup } from '@/lib/backup';

const STEPS = 3;

export function OnboardingFlow() {
  const theme = useTheme();
  const t = useT();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showRestore, setShowRestore] = useState(false);
  const [backupId, setBackupId] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'notFound' | 'error'>('idle');

  const starters = [
    { text: t.suggestionDrinkWater, emoji: '💧' },
    { text: t.suggestionReadPages, emoji: '📚' },
    { text: t.suggestionWalkSteps, emoji: '🏃' },
    { text: t.suggestionMeditate, emoji: '🧘' },
    { text: t.suggestionNoSugar, emoji: '🥗' },
  ];

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const finishWithSelection = () => {
    starters.forEach((s, i) => {
      if (selected.has(i)) {
        addHabit({ name: s.text, emoji: s.emoji, color: HabitColors[i % HabitColors.length] });
      }
    });
    completeOnboarding();
  };

  const handleRestore = async () => {
    if (!backupId.trim()) return;
    setRestoreStatus('loading');
    const raw = await pullBackup(backupId);
    if (raw === null) {
      setRestoreStatus('notFound');
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { habits?: unknown };
      if (!Array.isArray(parsed.habits)) throw new Error('bad shape');
      restoreHabits(parsed.habits as Parameters<typeof restoreHabits>[0]);
      setRestoreStatus('success');
      setTimeout(() => completeOnboarding(), 600);
    } catch {
      setRestoreStatus('error');
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.languageBar}>
        <LanguageSwitcher />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <View style={styles.center}>
            <Text style={styles.mark}>✅</Text>
            <Text style={[styles.title, { color: theme.text }]}>{t.onboardWelcomeTitle}</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>{t.onboardWelcomeTagline}</Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.featureList}>
            {[
              { emoji: '🔥', title: t.onboardFeatureHabitsTitle, desc: t.onboardFeatureHabitsDesc },
              { emoji: '🤖', title: t.onboardFeatureCoachTitle, desc: t.onboardFeatureCoachDesc },
              { emoji: '🏆', title: t.onboardFeatureAchievementsTitle, desc: t.onboardFeatureAchievementsDesc },
            ].map((f) => (
              <View
                key={f.title}
                style={[styles.featureRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <View style={styles.flex}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.getStarted}>
            <Text style={[styles.title, { color: theme.text }]}>{t.onboardGetStartedTitle}</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>{t.onboardGetStartedSubtitle}</Text>

            <View style={styles.wrap}>
              {starters.map((s, i) => (
                <Pressable
                  key={s.text}
                  onPress={() => toggle(i)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected.has(i) ? theme.accent : theme.backgroundSelected,
                      borderColor: selected.has(i) ? theme.accent : 'transparent',
                    },
                  ]}>
                  <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
                  <Text style={{ color: selected.has(i) ? theme.onAccent : theme.text, fontSize: 14, fontWeight: '600' }}>
                    {s.text}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={finishWithSelection} style={[styles.primaryButton, { backgroundColor: theme.text }]}>
              <Text style={[styles.primaryButtonText, { color: theme.background }]}>{t.onboardContinue}</Text>
            </Pressable>

            <Pressable onPress={() => completeOnboarding()}>
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>{t.onboardSkip}</Text>
            </Pressable>

            <Pressable onPress={() => setShowRestore((v) => !v)} style={styles.restoreLinkWrap}>
              <Text style={[styles.restoreLink, { color: theme.accent }]}>{t.onboardRestoreLink}</Text>
            </Pressable>

            {showRestore && (
              <View style={styles.restoreBox}>
                <TextInput
                  value={backupId}
                  onChangeText={(v) => {
                    setBackupId(v);
                    setRestoreStatus('idle');
                  }}
                  placeholder={t.onboardRestorePlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                />
                <Pressable
                  onPress={handleRestore}
                  disabled={!backupId.trim() || restoreStatus === 'loading'}
                  style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: !backupId.trim() ? 0.5 : 1 }]}>
                  <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>{t.onboardRestoreButton}</Text>
                </Pressable>
                {restoreStatus === 'success' && (
                  <Text style={[styles.restoreStatus, { color: theme.accent }]}>{t.onboardRestoreSuccess}</Text>
                )}
                {restoreStatus === 'notFound' && (
                  <Text style={[styles.restoreStatus, { color: theme.textSecondary }]}>{t.onboardRestoreNotFound}</Text>
                )}
                {restoreStatus === 'error' && (
                  <Text style={[styles.restoreStatus, { color: theme.textSecondary }]}>{t.onboardRestoreError}</Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {step < 2 && (
        <View style={styles.footer}>
          <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === step ? theme.text : theme.border }]}
              />
            ))}
          </View>
          <Pressable onPress={() => setStep((s) => s + 1)} style={[styles.primaryButton, { backgroundColor: theme.text }]}>
            <Text style={[styles.primaryButtonText, { color: theme.background }]}>{t.onboardNext}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  languageBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: {
    flexGrow: 1,
    padding: Spacing.five,
    justifyContent: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  center: { alignItems: 'center', gap: Spacing.two },
  mark: { fontSize: 64, marginBottom: Spacing.two },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  tagline: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  featureList: { gap: Spacing.three },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  featureEmoji: { fontSize: 28 },
  featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  getStarted: { gap: Spacing.three },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  primaryButton: { paddingVertical: 16, borderRadius: Radius.pill, alignItems: 'center', marginTop: Spacing.two },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  skipText: { fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  restoreLinkWrap: { marginTop: Spacing.four, alignItems: 'center' },
  restoreLink: { fontSize: 14, fontWeight: '600' },
  restoreBox: { gap: Spacing.two, marginTop: Spacing.two },
  input: { fontSize: 15, paddingHorizontal: Spacing.three, paddingVertical: 12, borderRadius: Radius.sm, borderWidth: 1 },
  restoreStatus: { fontSize: 13, textAlign: 'center' },
  footer: { padding: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
