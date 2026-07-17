import '@/global.css';

import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import { AuthProvider } from '@/features/auth/context';
import { AppearanceProvider } from '@/lib/appearance';
import { NAV_THEME } from '@/lib/theme';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <AppearanceProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </AppearanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
