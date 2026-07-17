import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type MetricCardProps = {
  icon: ComponentType<IconProps>;
  label: string;
  value: string;
  unit: string;
  iconColor: string;
  className?: string;
};

export function MetricCard({
  icon: IconComponent,
  label,
  value,
  unit,
  iconColor,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('py-0', className)}>
      <CardContent className="items-center gap-1 p-2.5">
        <View className="flex-row items-center gap-1">
          <IconComponent size={12} color={iconColor} weight="bold" />
          <Text variant="muted" className="text-[10px] uppercase tracking-wide">
            {label}
          </Text>
        </View>
        <View className="flex-row items-baseline gap-0.5">
          <Text className="text-lg font-bold leading-none">{value}</Text>
          <Text variant="muted" className="text-[10px]">
            {unit}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}
