import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { Colors } from '@/constants/theme';
import '@/lib/backup'; // side-effect: registers auto-backup-on-change once at startup
import '@/lib/daily-nudge'; // side-effect: (re)arms the daily nudge on habits/locale change once at startup
import '@/lib/smart-reminder'; // side-effect: (re)arms smart reminders on habits/mood/locale change
import '@/lib/weekly-recap'; // side-effect: re-syncs the weekly recap push registration once at startup
import { useT } from '@/lib/i18n';
import { useNotificationNavigation } from '@/lib/notification-router';
import { registerNotificationCategories } from '@/lib/notifications';
import { useOnboardingCompleted } from '@/lib/onboarding-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const t = useT();
  const onboardingCompleted = useOnboardingCompleted();

  useNotificationNavigation();
  useEffect(() => {
    void registerNotificationCategories(t);
  }, [t]);

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <AnimatedSplashOverlay />
      {onboardingCompleted ? (
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="new-habit"
            options={{
              title: t.screenNewHabit,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="weekly-review"
            options={{
              title: t.weeklyReviewTitle,
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="monthly-review"
            options={{
              title: t.monthlyReviewTitle,
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="yearly-review"
            options={{
              title: t.yearlyReviewTitle,
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen
            name="edit-habit"
            options={{
              title: t.screenEditHabit,
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack>
      ) : (
        <OnboardingFlow />
      )}
    </ThemeProvider>
  );
}
