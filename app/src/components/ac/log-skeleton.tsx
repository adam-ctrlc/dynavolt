import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ROWS = [0, 1, 2, 3, 4, 5];

/** Mirrors the real log row so the list does not jump when data lands. */
function LogRowSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="gap-2 p-3">
        <View className="flex-row items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-16" />
        </View>
        <View className="flex-row gap-4">
          <View className="gap-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-14" />
          </View>
          <View className="gap-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-14" />
          </View>
          <View className="gap-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3 w-14" />
          </View>
        </View>
        <Skeleton className="h-2 w-40" />
      </CardContent>
    </Card>
  );
}

export function LogListSkeleton() {
  return (
    <View className="gap-3">
      {ROWS.map((row) => (
        <LogRowSkeleton key={row} />
      ))}
    </View>
  );
}
