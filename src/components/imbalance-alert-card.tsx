import { StyleSheet, Text, View } from 'react-native';

import type { ImbalanceAlert } from '@/lib/life-balance';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, Radius } from '@/constants/theme';

type Props = {
  alert: ImbalanceAlert;
};

export function ImbalanceAlertCard({ alert }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Text style={styles.emoji}>{alert.emoji}</Text>
      <View style={styles.content}>
        <Text style={[styles.headline, { color: theme.text }]}>{alert.headline}</Text>
        <Text style={[styles.detail, { color: theme.textSecondary }]}>{alert.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: 12,
  },
  emoji: {
    fontSize: 24,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
});
