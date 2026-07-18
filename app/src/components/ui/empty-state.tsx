import { useColorScheme } from 'nativewind';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

type PhosphorIcon = React.ComponentType<{
  size?: number;
  color?: string;
  weight?: 'duotone' | 'regular' | 'bold' | 'fill';
}>;

/**
 * A no-data placeholder: a large, soft icon over a title and a line of guidance.
 * Shared so every empty list reads the same.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: PhosphorIcon;
  title: string;
  description: string;
}) {
  const { colorScheme } = useColorScheme();
  // Deliberately faint: the icon is decoration, not a status the eye should chase.
  const iconColor = colorScheme === 'dark' ? '#52525b' : '#d4d4d8';

  return (
    <Card className="py-0">
      <CardContent className="items-center gap-3 p-8">
        <Icon size={72} weight="duotone" color={iconColor} />
        <View className="items-center gap-1">
          <Text className="font-semibold">{title}</Text>
          <Text variant="muted" className="text-center text-sm">
            {description}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}
