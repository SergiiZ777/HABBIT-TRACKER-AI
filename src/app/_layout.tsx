import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { useT } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const t = useT();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <AnimatedSplashOverlay />
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
    </ThemeProvider>
  );
}
