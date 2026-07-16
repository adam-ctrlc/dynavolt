import { useColorScheme } from 'nativewind';
import Moon from 'phosphor-react-native/src/icons/Moon';
import Sun from 'phosphor-react-native/src/icons/Sun';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const color = isDark ? '#fafafa' : '#0a0a0a';

  return (
    <Button
      variant="ghost"
      size="icon"
      accessibilityRole="switch"
      accessibilityLabel="Toggle light or dark theme"
      onPress={() => setColorScheme(isDark ? 'light' : 'dark')}>
      {isDark ? (
        <Moon size={20} weight="fill" color={color} />
      ) : (
        <Sun size={20} weight="fill" color={color} />
      )}
    </Button>
  );
}
