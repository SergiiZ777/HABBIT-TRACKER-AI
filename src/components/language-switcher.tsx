import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LOCALE_LABELS, SUPPORTED_LOCALES, setLocale, useLocale, useT } from '@/lib/i18n';

export function LanguageSwitcher() {
  const theme = useTheme();
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={t.languageButtonLabel}
        style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={styles.buttonEmoji}>🌐</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.textSecondary }]}>{t.languagePickerTitle}</Text>
            {SUPPORTED_LOCALES.map((code) => (
              <Pressable
                key={code}
                onPress={() => {
                  setLocale(code);
                  setOpen(false);
                }}
                style={[styles.row, code === locale && { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.rowText, { color: theme.text }]}>{LOCALE_LABELS[code]}</Text>
                {code === locale && <Text style={{ color: theme.accent, fontWeight: '800' }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEmoji: { fontSize: 18 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: 280, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.two, gap: 2 },
  sheetTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, padding: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.sm,
  },
  rowText: { fontSize: 16, fontWeight: '600' },
});
