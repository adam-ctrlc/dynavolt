import { useColorScheme } from 'nativewind';
import Bell from 'phosphor-react-native/src/icons/Bell';
import Thermometer from 'phosphor-react-native/src/icons/Thermometer';
import Warning from 'phosphor-react-native/src/icons/Warning';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import * as alertsApi from '@/features/alerts/api';
import type { Alert } from '@/features/alerts/types';
import { useAuth } from '@/features/auth/context';
import { usePoll } from '@/hooks/use-poll';
import { useAppearance } from '@/lib/appearance';

const POLL_MS = 2000;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function AlertsScreen() {
  const { token } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const danger = isDark ? '#f87171' : '#dc2626';
  const muted = isDark ? '#a1a1aa' : '#71717a';

  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetcher = useCallback(
    (signal: AbortSignal) => alertsApi.list(token ?? '', !showAll, signal),
    [token, showAll, nonce]
  );
  const { data, error } = usePoll<Alert[]>(fetcher, POLL_MS, Boolean(token));

  async function acknowledge(id: number) {
    setBusy(id);
    try {
      await alertsApi.acknowledge(token ?? '', id);
      setNonce((n) => n + 1);
    } finally {
      setBusy(null);
    }
  }

  const list = data ?? [];

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Bell size={22} weight="fill" color={primary.hex} />
            <Text className="text-lg font-bold">Alerts</Text>
          </View>
          <Button variant="outline" size="sm" onPress={() => setShowAll((v) => !v)}>
            <Text>{showAll ? 'Active only' : 'Show all'}</Text>
          </Button>
        </View>

        {error ? (
          <Text className="text-destructive text-sm">{error.message}</Text>
        ) : null}

        {list.length === 0 ? (
          <Card className="py-0">
            <CardContent className="items-center gap-1 p-6">
              <Text className="font-semibold">No {showAll ? '' : 'active '}alerts</Text>
              <Text variant="muted" className="text-center text-sm">
                Conditions are within the configured thresholds.
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {list.map((alert) => {
          const open = alert.acknowledgedAt === null;
          return (
            <Card key={alert.id} className={open ? 'border-destructive py-0' : 'py-0'}>
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-center gap-2">
                  {alert.kind === 'temperature' ? (
                    <Thermometer size={18} weight="bold" color={open ? danger : muted} />
                  ) : (
                    <Warning size={18} weight="bold" color={open ? danger : muted} />
                  )}
                  <Text className="font-semibold capitalize">{alert.kind}</Text>
                  <View className="ml-auto">
                    <Badge variant={open ? 'destructive' : 'secondary'}>
                      <Text>{open ? 'ACTIVE' : 'ACKNOWLEDGED'}</Text>
                    </Badge>
                  </View>
                </View>

                <Text variant="muted" className="text-sm">
                  {alert.message} (threshold {alert.threshold})
                </Text>
                <Text variant="muted" className="text-xs">
                  Raised {formatWhen(alert.createdAt)}
                </Text>

                {open ? (
                  <Button size="sm" disabled={busy === alert.id} onPress={() => void acknowledge(alert.id)}>
                    <Text>{busy === alert.id ? 'Acknowledging...' : 'Acknowledge alert'}</Text>
                  </Button>
                ) : (
                  <Text variant="muted" className="text-xs">
                    Response time:{' '}
                    {alert.responseMs === null ? '--' : `${(alert.responseMs / 1000).toFixed(1)}s`}
                  </Text>
                )}
              </CardContent>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
