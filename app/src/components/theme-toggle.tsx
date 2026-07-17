import { useColorScheme } from 'nativewind';
import Moon from 'phosphor-react-native/src/icons/Moon';
import Sun from 'phosphor-react-native/src/icons/Sun';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const color = isDark ? '#fafafa' : '#0a0a0a';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-full', className)}
      accessibilityRole="switch"
      accessibilityLabel="Toggle light or dark theme"
      onPress={() => setColorScheme(isDark ? 'light' : 'dark')}>
      {isDark ? (
        <Moon size={16} weight="fill" color={color} />
      ) : (
        <Sun size={16} weight="fill" color={color} />
      )}
    </Button>
  );
}
