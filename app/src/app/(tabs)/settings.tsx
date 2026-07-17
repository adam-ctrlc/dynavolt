import Gear from 'phosphor-react-native/src/icons/Gear';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as settingsApi from '@/features/settings/api';
import { useAppearance } from '@/lib/appearance';

export default function SettingsScreen() {
  const { token } = useAuth();
  const { primary } = useAppearance();

  const [load, setLoad] = useState('');
  const [temp, setTemp] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const current = await settingsApi.read(token ?? '');
      setLoad(String(current.loadThresholdVa));
      setTemp(String(current.tempThresholdC));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await settingsApi.update(token ?? '', Number(load), Number(temp));
      setLoad(String(saved.loadThresholdVa));
      setTemp(String(saved.tempThresholdC));
      setStatus('Thresholds updated');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row items-center gap-2">
          <Gear size={22} weight="fill" color={primary.hex} />
          <Text className="text-lg font-bold">System Settings</Text>
        </View>

        <Card>
          <CardContent className="gap-4 p-5">
            <View className="gap-1">
              <Text className="font-semibold">Alarm thresholds</Text>
              <Text variant="muted" className="text-sm">
                Alerts are raised when a reading reaches these values.
              </Text>
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium">Load threshold (VA)</Text>
              <Input value={load} onChangeText={setLoad} keyboardType="numeric" placeholder="900" />
            </View>

            <View className="gap-1.5">
              <Text className="text-sm font-medium">Temperature threshold (C)</Text>
              <Input value={temp} onChangeText={setTemp} keyboardType="numeric" placeholder="40" />
            </View>

            {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
            {status ? <Text className="text-primary text-sm">{status}</Text> : null}

            <Button disabled={busy} onPress={() => void save()}>
              <Text>{busy ? 'Saving...' : 'Save thresholds'}</Text>
            </Button>
          </CardContent>
        </Card>

        <Text variant="muted" className="text-center text-xs">
          Defaults: 900 VA and 40 C
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
