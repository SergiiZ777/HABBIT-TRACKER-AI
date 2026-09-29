import { useRef, useState } from 'react';
import {
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
import { askCoach, type ChatTurn } from '@/lib/coach';
import { useHabits } from '@/lib/habits';
import { computeMotivation } from '@/lib/motivation';

type Message = { id: string; role: 'user' | 'coach'; content: string; seeded?: boolean };

const MARKET_BLURB =
  "Quick look at the market: Habitica gamifies habits with points and levels, Streaks stays deliberately minimal with " +
  'no AI at all, and newer apps like BeeDone or Beyond Time use AI to suggest the best time of day for a habit. ' +
  "Most of them only show you charts, though — very few let you actually ask a coach a question grounded in your " +
  'own data. That’s what this chat is for. Ask me anything about your habits, or how to improve.';

const SUGGESTIONS = ['Which habit should I focus on today?', 'How do I build a better streak?', 'How does this app compare to others?'];

export default function CoachScreen() {
  const theme = useTheme();
  const habits = useHabits();
  const today = new Date();
  const scrollRef = useRef<ScrollView>(null);

  // Lazy initializer: seed the thread once on mount with today's recommendation + the market blurb,
  // without re-seeding (and duplicating messages) whenever habits change later.
  const [messages, setMessages] = useState<Message[]>(() => {
    const motivation = computeMotivation(habits, today);
    return [
      { id: 'seed-1', role: 'coach', seeded: true, content: `${motivation.emoji} ${motivation.headline} — ${motivation.detail}` },
      { id: 'seed-2', role: 'coach', seeded: true, content: MARKET_BLURB },
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    const history: ChatTurn[] = messages
      .filter((m) => !m.seeded)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'coach', content: m.content }));

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }]);
    setInput('');
    setLoading(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    const answer = await askCoach(question, habits, history, today);

    setMessages((prev) => [...prev, { id: `c-${Date.now()}`, role: 'coach', content: answer }]);
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
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>AI RECOMMENDATIONS</Text>
          <Text style={[styles.title, { color: theme.text }]}>Coach</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: theme.accent }
                  : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
              ]}>
              <Text style={[styles.bubbleText, { color: m.role === 'user' ? theme.onAccent : theme.text }]}>{m.content}</Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.loadingBubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Text style={[styles.bubbleText, { color: theme.textSecondary }]}>Coach is thinking…</Text>
            </View>
          )}

          {messages.length <= 2 && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={[styles.suggestionChip, { backgroundColor: theme.backgroundSelected }]}>
                  <Text style={{ color: theme.text, fontSize: 13 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
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
            <Text style={[styles.sendText, { color: theme.onAccent }]}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  bubble: { maxWidth: '85%', paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.md },
  loadingBubble: { borderWidth: 1, alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
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
