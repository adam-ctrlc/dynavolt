import { useColorScheme } from 'nativewind';
import type { IconProps } from 'phosphor-react-native';
import Gauge from 'phosphor-react-native/src/icons/Gauge';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import Palette from 'phosphor-react-native/src/icons/Palette';
import PlugsConnected from 'phosphor-react-native/src/icons/PlugsConnected';
import Power from 'phosphor-react-native/src/icons/Power';
import Pulse from 'phosphor-react-native/src/icons/Pulse';
import Sun from 'phosphor-react-native/src/icons/Sun';
import WaveSine from 'phosphor-react-native/src/icons/WaveSine';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Formula } from '@/components/formula';
import { Text } from '@/components/ui/text';
import type { FormulaName } from '@/lib/katex-assets';
import { useAppearance } from '@/lib/appearance';

function IconItem({
  icon: Icon,
  color,
  title,
  unit,
  unitColor,
  children,
}: {
  icon: ComponentType<IconProps>;
  color: string;
  title: string;
  unit?: FormulaName;
  unitColor?: string;
  children: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="bg-accent mt-0.5 h-8 w-8 items-center justify-center rounded-lg">
        <Icon size={18} weight="bold" color={color} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-semibold">{title}</Text>
          {unit && unitColor ? (
            <Formula name={unit} color={unitColor} fontSize={15} width={84} />
          ) : null}
        </View>
        <Text variant="muted" className="text-sm leading-5">
          {children}
        </Text>
      </View>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="muted" className="text-xs uppercase tracking-wide">
      {children}
    </Text>
  );
}

export function InfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { primary } = useAppearance();
  const ac = primary.hex;
  const amber = isDark ? '#fbbf24' : '#f59e0b';
  const fg = isDark ? '#fafafa' : '#0a0a0a';
  const muted = isDark ? '#a1a1aa' : '#71717a';

  return (
    <BottomSheet visible={visible} title="How it works" onClose={onClose}>
      <Text variant="muted" className="text-sm leading-5">
        DynaVolt simulates a single-phase AC supply feeding a load and shows live, meter-style
        readings. The numbers drift slightly over time, like a real instrument.
      </Text>

      <View className="gap-3">
        <SectionTitle>Readings</SectionTitle>
        <IconItem icon={Lightning} color={ac} title="Voltage" unit="unitV" unitColor={fg}>
          Root-mean-square line voltage. Nominal 230 V.
        </IconItem>
        <View className="gap-1.5 pl-11">
          <Text className="font-semibold">RMS (root mean square)</Text>
          <Text variant="muted" className="text-sm leading-5">
            The effective value of an AC signal: the equivalent steady (DC) value that delivers the
            same power.
          </Text>
          <Formula name="rms" color={fg} mutedColor={muted} />
          <Text variant="muted" className="text-sm leading-5">
            So 230 V RMS peaks at about 325 V.
          </Text>
        </View>
        <IconItem icon={PlugsConnected} color={ac} title="Current" unit="unitA" unitColor={fg}>
          Current the load draws. Near zero when the load is off.
        </IconItem>
        <IconItem icon={Gauge} color={ac} title="Power" unit="unitW" unitColor={fg}>
          Real power delivered to the load.
        </IconItem>
        <View className="gap-1.5 pl-11">
          <Formula name="power" color={fg} mutedColor={muted} />
          <Text variant="muted" className="text-sm leading-5">
            The power factor is the cosine of the phase angle between the voltage and current waves
            (about 0.95 here).
          </Text>
        </View>
        <IconItem icon={WaveSine} color={ac} title="Frequency" unit="unitHz" unitColor={fg}>
          AC cycles per second. Nominal 50 Hz.
        </IconItem>
      </View>

      <View className="gap-3">
        <SectionTitle>Waveform</SectionTitle>
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ac }} />
          <Text className="text-sm">Voltage</Text>
          <View className="ml-3 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: amber }} />
          <Text className="text-sm">Current</Text>
        </View>
        <Text variant="muted" className="text-sm leading-5">
          Each sine wave alternates above and below the center (zero) line. That back-and-forth is
          what "alternating current" means. The current wave lags the voltage wave because of the
          load's power factor. When the load is switched off, the wave flattens to a line.
        </Text>
      </View>

      <View className="gap-3">
        <SectionTitle>Controls</SectionTitle>
        <IconItem icon={Power} color={ac} title="Load switch">
          Connects or disconnects the load. Off flatlines the wave and drops current to zero.
        </IconItem>
        <IconItem icon={Pulse} color={ac} title="Animation (pulse icon)">
          Pause or resume the waveform animation.
        </IconItem>
        <IconItem icon={Palette} color={fg} title="Appearance (palette icon)">
          Change the AC color, background and accent, or pick a preset.
        </IconItem>
        <IconItem icon={Sun} color={fg} title="Theme (sun / moon icon)">
          Switch between light and dark theme.
        </IconItem>
      </View>
    </BottomSheet>
  );
}
