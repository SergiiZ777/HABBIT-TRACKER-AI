import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t.tabToday, tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: t.tabCoach, tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: t.tabDashboard, tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }}
      />
    </Tabs>
  );
}
