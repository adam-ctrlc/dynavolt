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
import { useAppearance } from '@/lib/appearance';

export default function LoginScreen() {
  const { token, signIn } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const ac = primary.hex;
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) {
    return <Redirect href="/dashboard" />;
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

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

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
              <View className="gap-1">
                <Text className="font-semibold">Sign in</Text>
                <Text variant="muted" className="text-sm">
                  Your access level is set by your account.
                </Text>
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-medium">Email</Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
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
                  autoComplete="password"
                  placeholder="Your password"
                  onSubmitEditing={() => canSubmit && void submit()}
                />
              </View>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

              <Button disabled={!canSubmit} onPress={() => void submit()}>
                {busy ? <ActivityIndicator color={muted} /> : <Text>Sign in</Text>}
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
