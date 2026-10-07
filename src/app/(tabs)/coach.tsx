import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { askCoach, type CoachResponse } from '@/lib/coach';
import { detectCoachInsights, type CoachAction, type CoachInsight } from '@/lib/coach-insights';
import { applyHabitChange, isChangeApplied } from '@/lib/habit-actions';
import { computeHabitHealth } from '@/lib/habit-health';
import { useHabits } from '@/lib/habits';
import { useLocale, useLocaleTag, useT } from '@/lib/i18n';
import { logRecommendation, markApplied } from '@/lib/recommendation-log';

type Message = { id: string; role: 'user' | 'coach'; content: string; action?: CoachAction };

export default function CoachScreen() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const localeTag = useLocaleTag();
  const habits = useHabits();
  const today = new Date();
  const scrollRef = useRef<ScrollView>(null);

  const proactiveInsights = useMemo(
    () => detectCoachInsights(habits, t, localeTag, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when habits list updates
    [habits, localeTag]
  );

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome-1',
      role: 'coach',
      content:
        "👋 I'm your AI Coach. Unlike basic trackers that just log misses, I look for patterns in your behavior and adapt your system when life gets busy. Ask me anything, or review the proactive insights below!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);

  const suggestions = [
    t.coachSuggestion1,
    t.coachSuggestion2,
    t.coachSuggestion3,
    t.coachSuggestion4,
    t.coachSuggestion5,
  ];

  const handleApplyAction = async (action: CoachAction, actionId: string) => {
    const habit = habits.find((h) => h.id === action.habitId);
    if (!habit) return;
    setApplyingActionId(actionId);
    const health = computeHabitHealth(habit, t, today);
    const entryId = logRecommendation({
      source: 'coachInsight',
      type: 'coachAction',
      habitId: action.habitId,
      habitName: habit.name,
      headline: action.buttonLabel,
      change: action.change,
      preScore: health.score,
    });
    await applyHabitChange(action.habitId, action.change, t);
    markApplied(entryId);
    setApplyingActionId(null);
    Alert.alert(t.coachActionApplied, `${habit.emoji} ${habit.name} system updated!`);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    const res: CoachResponse = await askCoach(question, habits, locale, t, today);

    setMessages((prev) => [...prev, { id: `c-${Date.now()}`, role: 'coach', content: res.text, action: res.action }]);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{t.aiRecommendations}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{t.coachTitle}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          
          {/* Proactive Insights Section */}
          {proactiveInsights.length > 0 && (
            <View style={styles.insightsSection}>
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                ⚡ {t.coachInsightsHeader}
              </Text>
              {proactiveInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  theme={theme}
                  t={t}
                  habits={habits}
                  loading={applyingActionId === insight.id}
                  onApply={() => insight.action && handleApplyAction(insight.action, insight.id)}
                />
              ))}
            </View>
          )}

          {/* Messages */}
          {messages.map((m) => {
            const habit = m.action ? habits.find((h) => h.id === m.action!.habitId) : null;
            const applied = habit && m.action ? isChangeApplied(habit, m.action.change) : false;

            return (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === 'user'
                    ? { alignSelf: 'flex-end', backgroundColor: theme.accent }
                    : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                ]}>
                <Text style={[styles.bubbleText, { color: m.role === 'user' ? theme.onAccent : theme.text }]}>
                  {m.content}
                </Text>

                {m.action && habit && (
                  <Pressable
                    onPress={() => handleApplyAction(m.action!, m.id)}
                    disabled={applied || applyingActionId === m.id}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: applied ? theme.backgroundSelected : theme.accent },
                    ]}>
                    {applyingActionId === m.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: applied ? theme.textSecondary : '#fff' }]}>
                        {applied ? t.coachActionApplied : m.action.buttonLabel}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={[styles.bubble, styles.loadingBubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.bubbleText, { color: theme.textSecondary }]}>{t.coachThinking}</Text>
            </View>
          )}

          {messages.length <= 2 && (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={[styles.suggestionChip, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t.coachPlaceholder}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            multiline
            maxLength={500}
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            style={[styles.sendButton, { backgroundColor: theme.accent, opacity: !input.trim() || loading ? 0.4 : 1 }]}>
            <Text style={[styles.sendText, { color: theme.onAccent }]}>{t.coachSend}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InsightCard({
  insight,
  theme,
  t,
  habits,
  loading,
  onApply,
}: {
  insight: CoachInsight;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useT>;
  habits: ReturnType<typeof useHabits>;
  loading: boolean;
  onApply: () => void;
}) {
  const habit = insight.action ? habits.find((h) => h.id === insight.action!.habitId) : null;
  const applied = habit && insight.action ? isChangeApplied(habit, insight.action.change) : false;

  return (
    <View style={[styles.insightCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.insightHeader}>
        <Text style={{ fontSize: 20 }}>{insight.emoji}</Text>
        <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
      </View>

      <Text style={[styles.insightDesc, { color: theme.textSecondary }]}>{insight.description}</Text>

      {insight.action && (
        <Pressable
          onPress={onApply}
          disabled={applied || loading}
          style={[styles.actionBtn, { backgroundColor: applied ? theme.backgroundSelected : theme.accent }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.actionBtnText, { color: applied ? theme.textSecondary : '#fff' }]}>
              {applied ? t.coachActionApplied : insight.action.buttonLabel}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  eyebrow: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  messages: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  insightsSection: { gap: Spacing.two, marginBottom: Spacing.two },
  sectionHeader: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  insightCard: { padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, gap: 6 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  insightTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  insightDesc: { fontSize: 14, lineHeight: 20 },

  bubble: { maxWidth: '85%', paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.md, gap: 8 },
  loadingBubble: { borderWidth: 1, alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15, lineHeight: 21 },

  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.pill, alignSelf: 'flex-start', marginTop: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  suggestions: { gap: Spacing.two, marginTop: Spacing.two },
  suggestionChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, alignSelf: 'flex-start' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 8 },
  sendButton: { paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.pill },
  sendText: { fontSize: 14, fontWeight: '700' },
});
