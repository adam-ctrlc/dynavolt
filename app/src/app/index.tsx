import { useColorScheme } from 'nativewind';
import Gauge from 'phosphor-react-native/src/icons/Gauge';
import Info from 'phosphor-react-native/src/icons/Info';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import LightningSlash from 'phosphor-react-native/src/icons/LightningSlash';
import Palette from 'phosphor-react-native/src/icons/Palette';
import PlugsConnected from 'phosphor-react-native/src/icons/PlugsConnected';
import Power from 'phosphor-react-native/src/icons/Power';
import Pulse from 'phosphor-react-native/src/icons/Pulse';
import WaveSine from 'phosphor-react-native/src/icons/WaveSine';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppearanceModal } from '@/components/appearance-modal';
import { InfoModal } from '@/components/info-modal';
import { MetricCard } from '@/components/ac/metric-card';
import { AcWaveform } from '@/components/ac/waveform';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useAppearance } from '@/lib/appearance';
import { useAcSimulation } from '@/hooks/use-ac-simulation';

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { primary } = useAppearance();
  const ac = primary.hex;
  const amber = isDark ? '#fbbf24' : '#f59e0b';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const fg = isDark ? '#fafafa' : '#0a0a0a';

  const [load, setLoad] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const reading = useAcSimulation(load);

  const power = reading.power;
  const powerValue = power >= 1000 ? (power / 1000).toFixed(2) : power.toFixed(0);
  const powerUnit = power >= 1000 ? 'kW' : 'W';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Lightning size={24} weight="fill" color={ac} />
            <Text className="text-xl font-bold">DynaVolt</Text>
          </View>
          <View className="flex-row items-center">
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="How it works"
              onPress={() => setShowInfo(true)}>
              <Info size={20} weight="bold" color={fg} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Appearance"
              onPress={() => setShowAppearance(true)}>
              <Palette size={20} weight="bold" color={fg} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              accessibilityRole="switch"
              accessibilityLabel="Toggle waveform animation"
              onPress={() => setAnimate((value) => !value)}>
              <Pulse size={20} weight="bold" color={animate ? ac : muted} />
            </Button>
            <ThemeToggle />
          </View>
        </View>

        <Card className="flex-1 gap-2 py-4">
          <CardHeader className="gap-1.5 pb-0">
            <View className="flex-row items-center justify-between">
              <CardDescription>Line voltage (RMS)</CardDescription>
              <Badge variant={load ? 'default' : 'secondary'}>
                <Text>{load ? 'Energized' : 'Off'}</Text>
              </Badge>
            </View>
            <View className="flex-row items-end gap-2">
              <Text className="text-primary text-5xl font-bold leading-none">
                {reading.voltageRms.toFixed(0)}
              </Text>
              <Text variant="muted" className="pb-1 text-lg">
                V
              </Text>
              <Text variant="muted" className="ml-auto pb-1 text-sm">
                {reading.frequency.toFixed(1)} Hz
              </Text>
            </View>
          </CardHeader>
          <CardContent className="flex-1 gap-2 pb-0">
            <AcWaveform
              energized={load}
              animated={animate}
              voltageColor={ac}
              currentColor={amber}
            />
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ac }} />
                <Text variant="muted" className="text-xs">
                  Voltage
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: amber }} />
                <Text variant="muted" className="text-xs">
                  Current
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <View className="flex-row gap-2">
          <MetricCard className="flex-1" icon={Lightning} label="Volt" value={reading.voltageRms.toFixed(0)} unit="V" iconColor={ac} />
          <MetricCard className="flex-1" icon={PlugsConnected} label="Amp" value={reading.currentRms.toFixed(1)} unit="A" iconColor={ac} />
          <MetricCard className="flex-1" icon={Gauge} label="Power" value={powerValue} unit={powerUnit} iconColor={ac} />
          <MetricCard className="flex-1" icon={WaveSine} label="Freq" value={reading.frequency.toFixed(1)} unit="Hz" iconColor={ac} />
        </View>

        <Card className="py-0">
          <CardContent className="flex-row items-center justify-between p-3">
            <View className="flex-row items-center gap-3">
              {load ? (
                <Power size={20} weight="bold" color={ac} />
              ) : (
                <LightningSlash size={20} weight="bold" color={muted} />
              )}
              <View>
                <Text className="font-semibold">Load</Text>
                <Text variant="muted" className="text-xs">
                  {load ? 'Delivering power' : 'Disconnected'}
                </Text>
              </View>
            </View>
            <Switch checked={load} onCheckedChange={setLoad} />
          </CardContent>
        </Card>
      </View>

      <AppearanceModal visible={showAppearance} onClose={() => setShowAppearance(false)} />
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </SafeAreaView>
  );
}
