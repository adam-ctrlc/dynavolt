import { Redirect, Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Bell from 'phosphor-react-native/src/icons/Bell';
import ChartLine from 'phosphor-react-native/src/icons/ChartLine';
import Gauge from 'phosphor-react-native/src/icons/Gauge';
import Gear from 'phosphor-react-native/src/icons/Gear';
import UserCircle from 'phosphor-react-native/src/icons/UserCircle';
import { ActivityIndicator, View } from 'react-native';

import { TabIcon } from '@/components/tab-icon';
import { useAuth } from '@/features/auth/context';
import { NotificationsProvider, useNotifications } from '@/features/notifications/context';
import { useAppearance } from '@/lib/appearance';

export default function TabsLayout() {
  const { token, user, loading } = useAuth();
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
    <NotificationsProvider watchLogs={isAdmin}>
      <TabsNav isAdmin={isAdmin} />
    </NotificationsProvider>
  );
}

function TabsNav({ isAdmin }: { isAdmin: boolean }) {
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';
  const { activeAlerts, newOverloads } = useNotifications();

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
          tabBarIcon: ({ color }) => <TabIcon icon={Gauge} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <TabIcon icon={Bell} color={color} dot={activeAlerts > 0} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => (
            <TabIcon icon={ChartLine} color={color} dot={newOverloads > 0} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon icon={Gear} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon icon={UserCircle} color={color} />,
        }}
      />
    </Tabs>
  );
}
