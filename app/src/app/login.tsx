import { Redirect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import type { Role } from '@/features/auth/types';
import { useAppearance } from '@/lib/appearance';
import { cn } from '@/lib/utils';

const DEMO = {
  admin: { email: 'admin@dynavolt.local', password: 'admin1234' },
  user: { email: 'user@dynavolt.local', password: 'user1234' },
} satisfies Record<Role, { email: string; password: string }>;

export default function LoginScreen() {
  const { token, signIn } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const ac = primary.hex;
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';

  const [role, setRole] = useState<Role>('admin');
  const [email, setEmail] = useState(DEMO.admin.email);
  const [password, setPassword] = useState(DEMO.admin.password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) {
    return <Redirect href="/dashboard" />;
  }

  function pickRole(next: Role) {
    setRole(next);
    setEmail(DEMO[next].email);
    setPassword(DEMO[next].password);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="grow justify-center gap-6 p-6">
          <View className="items-end">
            <ThemeToggle />
          </View>

          <View className="items-center gap-2">
            <View
              className="h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${ac}22` }}>
              <Lightning size={34} weight="fill" color={ac} />
            </View>
            <Text className="text-2xl font-bold">DynaVolt</Text>
            <Text variant="muted" className="text-center text-sm">
              Transformer Alert Management System
            </Text>
            <Text variant="muted" className="text-center text-xs">
              PHINMA-COC
            </Text>
          </View>

          <Card>
            <CardContent className="gap-4 p-5">
              <View className="gap-2">
                <Text variant="muted" className="text-xs uppercase tracking-wide">
                  Sign in as
                </Text>
                <View className="border-border flex-row rounded-lg border p-1">
                  {(['admin', 'user'] as const).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={role === option ? 'default' : 'ghost'}
                      className="flex-1"
                      onPress={() => pickRole(option)}>
                      <Text className={cn(role === option ? '' : 'text-foreground')}>
                        {option === 'admin' ? 'Admin' : 'User'}
                      </Text>
                    </Button>
                  ))}
                </View>
                <Text variant="muted" className="text-xs">
                  {role === 'admin'
                    ? 'Maintenance engineer: full dashboard, thresholds, users, logs.'
                    : 'Power utility personnel: monitoring, alerts and logs.'}
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-medium">Email</Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-medium">Password</Text>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Your password"
                />
              </View>

              {error ? (
                <Text className="text-destructive text-sm">{error}</Text>
              ) : null}

              <Button onPress={() => void submit()} disabled={busy}>
                {busy ? <ActivityIndicator color={muted} /> : <Text>Sign in</Text>}
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
