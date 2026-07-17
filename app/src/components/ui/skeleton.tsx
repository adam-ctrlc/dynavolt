import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

const PULSE_MS = 900;

/**
 * Pulses via Reanimated rather than the `animate-pulse` class: with reduce motion
 * enabled at the OS level the class renders a static block, so the override keeps
 * the skeleton readable as a loading state.
 */
function Skeleton({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: PULSE_MS,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View className={cn('bg-accent rounded-md', className)} style={style} {...props} />;
}

export { Skeleton };
