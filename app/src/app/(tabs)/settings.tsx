import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import Check from 'phosphor-react-native/src/icons/Check';
import Gear from 'phosphor-react-native/src/icons/Gear';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import PencilSimple from 'phosphor-react-native/src/icons/PencilSimple';
import Thermometer from 'phosphor-react-native/src/icons/Thermometer';
import Users from 'phosphor-react-native/src/icons/Users';
import X from 'phosphor-react-native/src/icons/X';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeviceCard } from '@/components/ac/device-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconInput } from '@/components/ui/icon-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as settingsApi from '@/features/settings/api';
import { useAppearance } from '@/lib/appearance';

type Thresholds = { load: string; temp: string };

const EMPTY: Thresholds = { load: '', temp: '' };

/** Matches `--primary-foreground`, which the appearance provider pins to white. */
const ON_PRIMARY = '#ffffff';

/** The degree sign is part of the unit symbol, so it is written out rather than dropped. */
const DEGREE_C = '°C';

export default function SettingsScreen() {
  const { token } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';

  const [saved, setSaved] = useState<Thresholds>(EMPTY);
  const [draft, setDraft] = useState<Thresholds>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await settingsApi.read(token ?? '');
      const next = {
        load: String(current.loadThresholdVa),
        temp: String(current.tempThresholdC),
      };
      setSaved(next);
      setDraft(next);
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

  function startEditing() {
    setStatus(null);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
    setError(null);
    setStatus(null);
  }

  async function save() {
    const load = Number(draft.load);
    const temp = Number(draft.temp);

    if (!Number.isFinite(load) || load <= 0 || !Number.isFinite(temp) || temp <= 0) {
      setError('Enter a positive number for both thresholds');
      return;
    }

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await settingsApi.update(token ?? '', load, temp);
      const next = {
        load: String(result.loadThresholdVa),
        temp: String(result.tempThresholdC),
      };
      setSaved(next);
      setDraft(next);
      setEditing(false);
      setStatus('Thresholds updated');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const dirty = draft.load !== saved.load || draft.temp !== saved.temp;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row items-center gap-2">
          <Gear size={22} weight="fill" color={primary.hex} />
          <Text className="text-lg font-bold">System Settings</Text>
        </View>

        <Card className="gap-0 py-0">
          <CardHeader className="border-border flex-row items-center justify-between border-b p-4">
            <View className="flex-1 gap-0.5">
              <CardTitle className="text-base">Alarm thresholds</CardTitle>
              <Text variant="muted" className="text-xs">
                Alerts are raised when a reading reaches these values.
              </Text>
            </View>
            {editing || loading ? null : (
              <Button variant="outline" size="sm" onPress={startEditing}>
                <PencilSimple size={14} weight="bold" color={primary.hex} />
                <Text>Edit</Text>
              </Button>
            )}
          </CardHeader>

          <CardContent className="gap-4 p-4">
            <View className="gap-1.5">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-sm font-medium">Load threshold</Text>
                <Text variant="muted" className="text-[10px]">
                  Default 900 VA
                </Text>
              </View>
              {loading ? (
                <Skeleton className="h-11 w-full rounded-md" />
              ) : (
                <IconInput
                  icon={Lightning}
                  iconColor={primary.hex}
                  unit="VA"
                  value={draft.load}
                  onChangeText={(load) => setDraft((prev) => ({ ...prev, load }))}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="900"
                />
              )}
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-sm font-medium">Temperature threshold</Text>
                <Text variant="muted" className="text-[10px]">
                  Default 40 {DEGREE_C}
                </Text>
              </View>
              {loading ? (
                <Skeleton className="h-11 w-full rounded-md" />
              ) : (
                <IconInput
                  icon={Thermometer}
                  iconColor={primary.hex}
                  unit={DEGREE_C}
                  value={draft.temp}
                  onChangeText={(temp) => setDraft((prev) => ({ ...prev, temp }))}
                  editable={editing}
                  keyboardType="numeric"
                  placeholder="40"
                />
              )}
            </View>

            {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
            {status ? <Text className="text-primary text-sm">{status}</Text> : null}

            {editing ? (
              <View className="flex-row gap-2">
                <Button variant="outline" className="flex-1" disabled={busy} onPress={cancel}>
                  <X size={14} weight="bold" color={muted} />
                  <Text>Cancel</Text>
                </Button>
                <Button className="flex-1" disabled={busy || !dirty} onPress={() => void save()}>
                  <Check size={14} weight="bold" color={ON_PRIMARY} />
                  <Text>{busy ? 'Saving...' : 'Save changes'}</Text>
                </Button>
              </View>
            ) : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-border border-b p-4">
            <CardTitle className="text-base">User Management</CardTitle>
            <Text variant="muted" className="text-xs">
              Create accounts for engineers and utility personnel, or revoke access.
            </Text>
          </CardHeader>
          <CardContent className="p-4">
            <Button variant="outline" onPress={() => router.push('/users')}>
              <Users size={16} weight="bold" color={primary.hex} />
              <Text>Manage accounts</Text>
            </Button>
          </CardContent>
        </Card>

        <DeviceCard />
      </ScrollView>
    </SafeAreaView>
  );
}
