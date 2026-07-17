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
}: SegmentedProps<T>) {
  return (
    <View
      className={cn(
        'border-border bg-muted/40 dark:bg-input/30 flex-row items-center rounded-full border p-0.5',
        className
      )}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        const color = selected ? activeColor : inactiveColor;

        return (
          <Button
            key={option.label}
            variant="ghost"
            size="sm"
            className={cn('h-8 gap-1.5 rounded-full px-3', selected && 'bg-background shadow-sm shadow-black/5')}
            onPress={() => onChange(option.value)}>
            {Icon ? <Icon size={13} weight="bold" color={color} /> : null}
            <Text className="text-xs font-medium" style={{ color }}>
              {option.label}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}
