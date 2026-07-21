import type { IconProps } from 'phosphor-react-native';
import type { ComponentType } from 'react';
import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { isPlaceholder } from '@/lib/reading-format';
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
      {/* Horizontal padding is tight on purpose: four cards share the row, so the
          value needs the width more than the card needs the breathing room. */}
      <CardContent className="items-center gap-1 px-1 py-2.5">
        <View className="flex-row items-center gap-1">
          <IconComponent size={12} color={iconColor} weight="bold" />
          <Text variant="muted" className="text-[10px] uppercase tracking-wide">
            {label}
          </Text>
        </View>
        <View className="flex-row items-baseline gap-0.5">
          {isPlaceholder(value) ? (
            <Text variant="muted" className="text-lg font-bold leading-none">
              {value}
            </Text>
          ) : (
            <>
              <Text className="text-lg font-bold leading-none">{value}</Text>
              <Text variant="muted" className="text-[10px]">
                {unit}
              </Text>
            </>
          )}
        </View>
      </CardContent>
    </Card>
  );
}
