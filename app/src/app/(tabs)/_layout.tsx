import { Redirect, Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Bell from 'phosphor-react-native/src/icons/Bell';
import ChartLine from 'phosphor-react-native/src/icons/ChartLine';
import Gauge from 'phosphor-react-native/src/icons/Gauge';
import Gear from 'phosphor-react-native/src/icons/Gear';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/features/auth/context';
import { useAppearance } from '@/lib/appearance';

export default function TabsLayout() {
  const { token, user, loading } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary.hex,
        tabBarInactiveTintColor: muted,
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color }) => <Gauge size={22} weight="bold" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Bell size={22} weight="bold" color={color} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <ChartLine size={22} weight="bold" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <Gear size={22} weight="bold" color={color} />,
        }}
      />
    </Tabs>
  );
}
