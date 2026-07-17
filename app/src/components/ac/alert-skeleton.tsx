import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ROWS = [0, 1, 2, 3];

/** Mirrors the real alert card so the list does not jump when data lands. */
function AlertCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="gap-2 p-4">
        <View className="flex-row items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <View className="flex-1 gap-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </View>
          <Skeleton className="h-5 w-16 rounded-full" />
        </View>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-9 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function AlertListSkeleton() {
  return (
    <View className="gap-3">
      {ROWS.map((row) => (
        <AlertCardSkeleton key={row} />
      ))}
    </View>
  );
}
