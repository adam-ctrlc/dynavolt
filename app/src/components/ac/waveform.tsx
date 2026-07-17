import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

function buildSinePath(
  totalWidth: number,
  height: number,
  totalPeriods: number,
  ampRatio: number,
  phase: number
) {
  const midY = height / 2;
  const amp = (height / 2) * ampRatio;
  const steps = 180;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (totalWidth * i) / steps;
    const y = midY - amp * Math.sin((2 * Math.PI * totalPeriods * i) / steps + phase);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d;
}

type AcWaveformProps = {
  energized: boolean;
  animated?: boolean;
  voltageColor?: string;
  currentColor?: string;
  gridColor?: string;
  periodsPerScreen?: number;
  scrollMs?: number;
};

export function AcWaveform({
  energized,
  animated = true,
  voltageColor = '#16a34a',
  currentColor = '#f59e0b',
  gridColor = 'rgba(148, 163, 184, 0.25)',
  periodsPerScreen = 3,
  scrollMs = 1400,
}: AcWaveformProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const translateX = useSharedValue(0);
  const scaleY = useSharedValue(0.04);

  useEffect(() => {
    cancelAnimation(translateX);
    if (!animated || width <= 0) {
      translateX.value = 0;
      return;
    }
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-width, {
        duration: scrollMs,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.Never
    );
  }, [animated, width, scrollMs, translateX]);

  useEffect(() => {
    scaleY.value = withTiming(energized ? 1 : 0.04, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    });
  }, [energized, scaleY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scaleY: scaleY.value }],
  }));

  const totalWidth = width * 2;
  const totalPeriods = periodsPerScreen * 2;
  // Voltage leads, current lags by the power-factor angle (inductive load).
  const voltagePath = useMemo(
    () => (width > 0 && height > 0 ? buildSinePath(totalWidth, height, totalPeriods, 0.82, 0) : ''),
    [totalWidth, height, totalPeriods, width]
  );
  const currentPath = useMemo(
    () => (width > 0 && height > 0 ? buildSinePath(totalWidth, height, totalPeriods, 0.58, 0.6) : ''),
    [totalWidth, height, totalPeriods, width]
  );

  return (
    <View
      className="w-full flex-1 overflow-hidden"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {width > 0 && height > 0 ? (
        <>
          <Svg
            width={width}
            height={height}
            style={{ position: 'absolute', left: 0, top: 0 }}>
            <Line x1={0} y1={height * 0.15} x2={width} y2={height * 0.15} stroke={gridColor} strokeWidth={1} />
            <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={gridColor} strokeWidth={1.5} />
            <Line x1={0} y1={height * 0.85} x2={width} y2={height * 0.85} stroke={gridColor} strokeWidth={1} />
          </Svg>
          <Animated.View style={[{ width: totalWidth, height }, animatedStyle]}>
            <Svg width={totalWidth} height={height}>
              <Path
                d={currentPath}
                fill="none"
                stroke={currentColor}
                strokeOpacity={0.16}
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={currentPath}
                fill="none"
                stroke={currentColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={voltagePath}
                fill="none"
                stroke={voltageColor}
                strokeOpacity={0.18}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={voltagePath}
                fill="none"
                stroke={voltageColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
