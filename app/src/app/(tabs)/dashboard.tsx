import { useColorScheme } from 'nativewind';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import PlugsConnected from 'phosphor-react-native/src/icons/PlugsConnected';
import SignOut from 'phosphor-react-native/src/icons/SignOut';
import Thermometer from 'phosphor-react-native/src/icons/Thermometer';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/ac/metric-card';
import { AcWaveform } from '@/components/ac/waveform';
import { AppearanceModal } from '@/components/appearance-modal';
import { InfoModal } from '@/components/info-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as readings from '@/features/readings/api';
import { usePoll } from '@/hooks/use-poll';
import { useAppearance } from '@/lib/appearance';

const HEARTBEAT_MS = 1000;

export default function DashboardScreen() {
  const { token, user, signOut } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const ac = primary.hex;
  const amber = isDark ? '#fbbf24' : '#f59e0b';
  const danger = isDark ? '#f87171' : '#dc2626';
  const fg = isDark ? '#fafafa' : '#0a0a0a';

  const [showAppearance, setShowAppearance] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const fetcher = useCallback(
    (signal: AbortSignal) => readings.latest(token ?? '', signal),
    [token]
  );
  const { data, error } = usePoll(fetcher, HEARTBEAT_MS, Boolean(token));

  const overload = data?.status === 'overload';
  const hot = data?.overTemperature ?? false;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Lightning size={22} weight="fill" color={ac} />
            <View>
              <Text className="text-lg font-bold">Surveillance</Text>
              <Text variant="muted" className="text-xs">
                1 KVA Transformer
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Sign out"
              onPress={() => void signOut()}>
              <SignOut size={20} weight="bold" color={fg} />
            </Button>
          </View>
        </View>

        <Card className={overload ? 'border-destructive' : undefined}>
          <CardHeader className="gap-2 pb-0">
            <View className="flex-row items-center justify-between">
              <CardDescription>Status</CardDescription>
              <Badge variant={overload ? 'destructive' : 'default'}>
                <Text>{overload ? 'OVERLOAD' : 'NORMAL'}</Text>
              </Badge>
            </View>
            <View className="flex-row items-end gap-2">
              <Text
                className="text-5xl font-bold leading-none"
                style={{ color: overload ? danger : ac }}>
                {data ? data.apparentPowerVa.toFixed(0) : '--'}
              </Text>
              <Text variant="muted" className="pb-1 text-lg">
                VA
              </Text>
              <Text variant="muted" className="ml-auto pb-1 text-sm">
                {data ? `${data.loadPercent.toFixed(0)}% of ${data.loadThresholdVa} VA` : ''}
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pb-0 pt-3" style={{ height: 150 }}>
            <AcWaveform
              energized={Boolean(data)}
              voltageColor={overload ? danger : ac}
              currentColor={amber}
            />
          </CardContent>
        </Card>

        <View className="flex-row gap-3">
          <MetricCard
            className="flex-1"
            icon={PlugsConnected}
            label="Current"
            value={data ? data.currentA.toFixed(2) : '--'}
            unit="A"
            iconColor={ac}
          />
          <MetricCard
            className="flex-1"
            icon={Lightning}
            label="Voltage"
            value={data ? data.voltageV.toFixed(1) : '--'}
            unit="V"
            iconColor={ac}
          />
          <MetricCard
            className="flex-1"
            icon={Thermometer}
            label="Temp"
            value={data ? data.temperatureC.toFixed(1) : '--'}
            unit="C"
            iconColor={hot ? danger : ac}
          />
        </View>

        {hot ? (
          <Card className="border-destructive py-0">
            <CardContent className="p-3">
              <Text className="text-destructive text-sm font-semibold">
                Temperature above {data?.tempThresholdC} C
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="py-0">
            <CardContent className="gap-1 p-3">
              <Text className="text-destructive text-sm font-semibold">Cannot reach the API</Text>
              <Text variant="muted" className="text-xs">
                {error.message}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        <Text variant="muted" className="text-center text-xs">
          Signed in as {user?.email} ({user?.role})
        </Text>
      </ScrollView>

      <AppearanceModal visible={showAppearance} onClose={() => setShowAppearance(false)} />
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </SafeAreaView>
  );
}
