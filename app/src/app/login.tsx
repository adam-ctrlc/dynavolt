import { Redirect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Envelope from 'phosphor-react-native/src/icons/Envelope';
import Eye from 'phosphor-react-native/src/icons/Eye';
import EyeSlash from 'phosphor-react-native/src/icons/EyeSlash';
import Lock from 'phosphor-react-native/src/icons/Lock';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconInput } from '@/components/ui/icon-input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import { useAppearance } from '@/lib/appearance';

export default function LoginScreen() {
  const { token, signIn } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const scroller = useRef<ScrollView>(null);

  /**
   * The form is the last thing in the scroll view, so scrolling to the end puts
   * the focused field and the button above the keyboard. The delay lets the
   * keyboard finish animating in, otherwise the scroll targets the old height.
   */
  function liftIntoView() {
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120);
  }

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
      {/*
        Android needs an explicit behavior too. Expo SDK 54 turns on edge-to-edge,
        under which the window no longer resizes for the keyboard, so leaving this
        undefined on Android let the keyboard cover the form.
      */}
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          ref={scroller}
          contentContainerClassName="grow justify-center gap-6 p-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="items-end">
            <ThemeToggle />
          </View>

          <View className="items-center gap-3">
            <Image
              source={require('@/assets/images/phinmacoc.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
              accessibilityLabel="PHINMA Cagayan de Oro College"
            />
            <View className="items-center gap-1">
              <Text className="text-2xl font-bold">Maligayang pagbabalik!</Text>
              <Text variant="muted" className="text-center text-sm">
                DynaVolt is watching your 1 KVA transformer. Sign in to pick up where the
                readings left off.
              </Text>
            </View>
          </View>

          <Card>
            <CardContent className="gap-4 p-5">
              <View className="gap-1.5">
                <Text className="text-sm font-medium">Email</Text>
                <IconInput
                  icon={Envelope}
                  iconColor={primary.hex}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={liftIntoView}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  placeholder="you@example.com"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-medium">Password</Text>
                <IconInput
                  icon={Lock}
                  iconColor={primary.hex}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={liftIntoView}
                  secureTextEntry={!reveal}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  returnKeyType="go"
                  placeholder="Your password"
                  onSubmitEditing={() => canSubmit && void submit()}
                  action={{
                    icon: reveal ? EyeSlash : Eye,
                    label: reveal ? 'Hide password' : 'Show password',
                    onPress: () => setReveal((v) => !v),
                  }}
                />
              </View>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

              <Button disabled={!canSubmit} onPress={() => void submit()}>
                {busy ? <ActivityIndicator color={muted} /> : <Text>Sign in</Text>}
              </Button>
            </CardContent>
          </Card>

          <Text variant="muted" className="text-center text-[10px] uppercase tracking-widest">
            Pro Deo et Humanitate
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
