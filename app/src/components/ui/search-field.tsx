import { useColorScheme } from 'nativewind';
import MagnifyingGlass from 'phosphor-react-native/src/icons/MagnifyingGlass';
import X from 'phosphor-react-native/src/icons/X';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/utils';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * The wrapper owns the fill and the border; the TextInput is transparent and
 * borderless. Letting both paint a background is what made the icon well and the
 * text area render as two different colours.
 */
export function SearchField({ value, onChangeText, placeholder, className }: SearchFieldProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const muted = isDark ? '#a1a1aa' : '#71717a';

  return (
    <View
      className={cn(
        'border-input bg-muted/40 dark:bg-input/30 h-11 flex-row items-center gap-2 rounded-md border px-3',
        className
      )}>
      <MagnifyingGlass size={18} color={muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        className="text-foreground h-full flex-1 border-0 bg-transparent p-0 text-base leading-5"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => onChangeText('')}>
          <X size={16} weight="bold" color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
