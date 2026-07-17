import { useColorScheme } from 'nativewind';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { LiveReading } from '@/features/readings/types';

type PowerPanelProps = {
  data: LiveReading | null;
  accent: string;
};

function Stat({
  label,
  value,
  unit,
  hint,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  hint?: string;
  color?: string;
}) {
  return (
    <View className="min-w-[30%] flex-1 gap-0.5">
      <Text variant="muted" className="text-[10px] uppercase tracking-wide">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-base font-bold leading-none" style={color ? { color } : undefined}>
          {value}
        </Text>
        <Text variant="muted" className="text-[10px]">
          {unit}
        </Text>
      </View>
      {hint ? (
        <Text variant="muted" className="text-[9px]">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Formats a measured value, or "--" when the board did not report it. */
function reading(value: number | null | undefined, digits: number): string {
  return value === null || value === undefined ? '--' : value.toFixed(digits);
}

/**
 * The metering side of the reading: real and reactive power, power factor,
 * frequency and energy. All measured by the PZEM, not derived from VA.
 */
export function PowerPanel({ data, accent }: PowerPanelProps) {
  const { colorScheme } = useColorScheme();
  const danger = colorScheme === 'dark' ? '#f87171' : '#dc2626';

  const headroom = data?.headroomVa ?? null;
  const tight = headroom !== null && headroom <= 0;
  const pf = data?.powerFactor ?? null;
  // Below ~0.85 a load study starts flagging poor power factor.
  const poorPf = pf !== null && pf < 0.85;

  return (
    <Card className="py-0">
      <CardContent className="gap-3 p-4">
        <View className="flex-row flex-wrap gap-x-4 gap-y-3">
          <Stat
            label="Real power"
            value={reading(data?.powerW, 0)}
            unit="W"
            hint="Actually consumed"
            color={accent}
          />
          <Stat
            label="Reactive"
            value={reading(data?.reactivePowerVar, 0)}
            unit="VAR"
            hint="Circulating"
          />
          <Stat
            label="Power factor"
            value={pf === null ? '--' : pf.toFixed(2)}
            unit=""
            hint={poorPf ? 'Poor' : 'Healthy'}
            color={poorPf ? danger : undefined}
          />
          <Stat label="Frequency" value={reading(data?.frequencyHz, 2)} unit="Hz" hint="Grid" />
          <Stat label="Energy" value={reading(data?.energyKwh, 1)} unit="kWh" hint="Meter total" />
          <Stat
            label="Headroom"
            value={headroom === null ? '--' : Math.abs(headroom).toFixed(0)}
            unit="VA"
            hint={tight ? 'Over limit' : 'Before limit'}
            color={tight ? danger : undefined}
          />
        </View>
      </CardContent>
    </Card>
  );
}
