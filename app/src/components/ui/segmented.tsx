import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type SegmentedOption<T> = {
  label: string;
  value: T;
  icon?: React.ComponentType<{ size?: number; color?: string; weight?: 'bold' }>;
};

type SegmentedProps<T> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor: string;
  inactiveColor: string;
  className?: string;
  /** Stretch each segment to share the width equally, rather than hugging its label. */
  fill?: boolean;
  /**
   * 'subtle' (default) raises the selected chip on the card colour: right for a
   * filter beside content. 'solid' fills it with the accent colour, for when the
   * choice is the point of the screen and needs to be unmistakable.
   */
  variant?: 'subtle' | 'solid';
};

/**
 * Shows every state at once, so a two-state filter reads as a setting rather than
 * a button whose label has to be decoded.
 *
 * Built on Button rather than a bare Pressable: the hand-rolled version threw a
 * navigation-context error on press in this tree.
 */
export function Segmented<T extends string | number | boolean | null>({
  options,
  value,
  onChange,
  activeColor,
  inactiveColor,
  className,
  fill = false,
  variant = 'subtle',
}: SegmentedProps<T>) {
  const solid = variant === 'solid';

  return (
    <View
      className={cn(
        'border-border bg-muted/40 dark:bg-input/30 flex-row items-center rounded-full border p-0.5',
        className
      )}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        // Solid paints its own fill, so its selected label goes white for contrast.
        const color = selected ? (solid ? '#ffffff' : activeColor) : inactiveColor;

        return (
          <Button
            key={option.label}
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 gap-1.5 rounded-full px-3',
              fill && 'flex-1',
              selected && !solid && 'bg-background shadow-sm shadow-black/5'
            )}
            style={selected && solid ? { backgroundColor: activeColor } : undefined}
            onPress={() => onChange(option.value)}>
            {Icon ? <Icon size={13} weight="bold" color={color} /> : null}
            <Text className="text-xs font-semibold" style={{ color }}>
              {option.label}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}
