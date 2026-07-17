import { Redirect, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import CaretLeft from 'phosphor-react-native/src/icons/CaretLeft';
import Check from 'phosphor-react-native/src/icons/Check';
import Envelope from 'phosphor-react-native/src/icons/Envelope';
import Eye from 'phosphor-react-native/src/icons/Eye';
import EyeSlash from 'phosphor-react-native/src/icons/EyeSlash';
import IdentificationCard from 'phosphor-react-native/src/icons/IdentificationCard';
import Lock from 'phosphor-react-native/src/icons/Lock';
import Trash from 'phosphor-react-native/src/icons/Trash';
import UserPlus from 'phosphor-react-native/src/icons/UserPlus';
import Users from 'phosphor-react-native/src/icons/Users';
import X from 'phosphor-react-native/src/icons/X';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconInput } from '@/components/ui/icon-input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import type { Role } from '@/features/auth/types';
import * as usersApi from '@/features/users/api';
import type { ManagedUser } from '@/features/users/types';
import { useAppearance } from '@/lib/appearance';
import { formatDateTime } from '@/lib/datetime';

/** Matches `--primary-foreground`, which the appearance provider pins to white. */
const ON_PRIMARY = '#ffffff';
const MIN_PASSWORD = 8;

const ROLES: { label: string; value: Role }[] = [
  { label: 'User', value: 'user' },
  { label: 'Admin', value: 'admin' },
];

type Draft = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
};

const EMPTY: Draft = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'user',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-medium">{label}</Text>
        {hint ? (
          <Text variant="muted" className="text-[10px]">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function UsersScreen() {
  const { token, user } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const danger = isDark ? '#f87171' : '#dc2626';
  const fg = isDark ? '#fafafa' : '#0a0a0a';

  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await usersApi.list(token ?? ''));
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function cancel() {
    setDraft(EMPTY);
    setAdding(false);
    setReveal(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await usersApi.create(token ?? '', {
        email: draft.email.trim(),
        password: draft.password,
        role: draft.role,
        firstName: draft.firstName.trim(),
        middleName: draft.middleName.trim() || null,
        lastName: draft.lastName.trim(),
      });
      cancel();
      setStatus(`Account created for ${draft.email.trim()}`);
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** Deleting an account cannot be undone, so it asks first and names the person. */
  function confirmRemove(target: ManagedUser) {
    Alert.alert(
      'Delete account?',
      `${target.fullName || target.email} will lose access immediately. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void remove(target),
        },
      ]
    );
  }

  async function remove(target: ManagedUser) {
    setError(null);
    setStatus(null);
    try {
      await usersApi.remove(token ?? '', target.id);
      setStatus(`Deleted ${target.fullName || target.email}`);
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  const canSave =
    draft.firstName.trim().length > 0 &&
    draft.lastName.trim().length > 0 &&
    draft.email.trim().includes('@') &&
    draft.password.length >= MIN_PASSWORD &&
    !busy;

  // This screen sits outside the tabs group, so it cannot rely on that layout's
  // guard. The API enforces this too; the redirect just avoids a wall of 403s.
  if (!token) return <Redirect href="/login" />;
  if (user && user.role !== 'admin') return <Redirect href="/dashboard" />;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2 rounded-full"
            accessibilityLabel="Back to settings"
            onPress={() => router.back()}>
            <CaretLeft size={18} weight="bold" color={fg} />
          </Button>
          <Users size={22} weight="fill" color={primary.hex} />
          <Text className="text-lg font-bold">User Management</Text>
        </View>

        <Card className="gap-0 py-0">
          <CardHeader className="border-border flex-row items-center justify-between border-b p-4">
            <View className="flex-1 gap-0.5">
              <CardTitle className="text-base">Add an account</CardTitle>
              <Text variant="muted" className="text-xs">
                The role decides what they can reach.
              </Text>
            </View>
            {adding ? null : (
              <Button variant="outline" size="sm" onPress={() => setAdding(true)}>
                <UserPlus size={14} weight="bold" color={primary.hex} />
                <Text>New</Text>
              </Button>
            )}
          </CardHeader>

          {adding ? (
            <CardContent className="gap-4 p-4">
              <Field label="First name">
                <IconInput
                  icon={IdentificationCard}
                  iconColor={primary.hex}
                  value={draft.firstName}
                  onChangeText={(firstName) => setDraft((p) => ({ ...p, firstName }))}
                  placeholder="Maria"
                />
              </Field>

              <Field label="Middle name" hint="Optional">
                <IconInput
                  icon={IdentificationCard}
                  iconColor={primary.hex}
                  value={draft.middleName}
                  onChangeText={(middleName) => setDraft((p) => ({ ...p, middleName }))}
                  placeholder="Luisa"
                />
              </Field>

              <Field label="Last name">
                <IconInput
                  icon={IdentificationCard}
                  iconColor={primary.hex}
                  value={draft.lastName}
                  onChangeText={(lastName) => setDraft((p) => ({ ...p, lastName }))}
                  placeholder="Santos"
                />
              </Field>

              <Field label="Email">
                <IconInput
                  icon={Envelope}
                  iconColor={primary.hex}
                  value={draft.email}
                  onChangeText={(email) => setDraft((p) => ({ ...p, email }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="them@example.com"
                />
              </Field>

              <Field label="Password" hint={`${MIN_PASSWORD} characters or more`}>
                <IconInput
                  icon={Lock}
                  iconColor={primary.hex}
                  value={draft.password}
                  onChangeText={(password) => setDraft((p) => ({ ...p, password }))}
                  secureTextEntry={!reveal}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Their first password"
                  action={{
                    icon: reveal ? EyeSlash : Eye,
                    label: reveal ? 'Hide password' : 'Show password',
                    onPress: () => setReveal((v) => !v),
                  }}
                />
              </Field>

              <Field label="Role">
                <Segmented
                  options={ROLES}
                  value={draft.role}
                  onChange={(role) => setDraft((p) => ({ ...p, role }))}
                  activeColor={primary.hex}
                  inactiveColor={muted}
                  className="self-start"
                />
              </Field>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

              <View className="flex-row gap-2">
                <Button variant="outline" className="flex-1" disabled={busy} onPress={cancel}>
                  <X size={14} weight="bold" color={danger} />
                  <Text>Cancel</Text>
                </Button>
                <Button className="flex-1" disabled={!canSave} onPress={() => void save()}>
                  <Check size={14} weight="bold" color={ON_PRIMARY} />
                  <Text numberOfLines={1}>{busy ? 'Saving...' : 'Create'}</Text>
                </Button>
              </View>
            </CardContent>
          ) : null}
        </Card>

        {error && !adding ? <Text className="text-destructive text-sm">{error}</Text> : null}
        {status ? <Text className="text-primary text-sm">{status}</Text> : null}

        {loading ? (
          <Skeleton className="h-3 w-24" />
        ) : (
          <Text variant="muted" className="text-xs">
            {rows.length} account{rows.length === 1 ? '' : 's'}
          </Text>
        )}

        {loading
          ? [0, 1, 2].map((row) => (
              <Card key={row} className="py-0">
                <CardContent className="gap-2 p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </CardContent>
              </Card>
            ))
          : rows.map((row) => {
              const isSelf = row.id === user?.id;
              const isAdmin = row.role === 'admin';

              return (
                <Card key={row.id} className="py-0">
                  <CardContent className="gap-2 p-4">
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1 gap-0.5">
                        <Text className="font-semibold leading-tight">
                          {row.fullName || row.email}
                        </Text>
                        <Text variant="muted" className="text-xs">
                          {row.email}
                        </Text>
                      </View>
                      <Badge variant={isAdmin ? 'default' : 'secondary'}>
                        <Text>{isAdmin ? 'ADMIN' : 'USER'}</Text>
                      </Badge>
                    </View>

                    <Text variant="muted" className="text-[10px]">
                      Added {formatDateTime(row.createdAt)}
                    </Text>

                    {/* The API refuses this anyway; disabling it says so before the tap. */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSelf}
                      onPress={() => confirmRemove(row)}>
                      <Trash size={14} weight="bold" color={isSelf ? muted : danger} />
                      <Text style={{ color: isSelf ? muted : danger }}>
                        {isSelf ? 'This is you' : 'Delete account'}
                      </Text>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
      </ScrollView>
    </SafeAreaView>
  );
}
