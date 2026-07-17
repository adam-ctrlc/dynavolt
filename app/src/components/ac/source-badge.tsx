import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

/** Where a reading came from. `hardware` means a real sensor pushed it. */
export function SourceBadge({ source }: { source: string }) {
  switch (source) {
    case 'hardware':
      return (
        <Badge variant="default">
          <Text className="text-[10px]">SENSOR</Text>
        </Badge>
      );
    case 'simulator':
      return (
        <Badge variant="secondary">
          <Text className="text-[10px]">SIMULATED</Text>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <Text className="text-[10px]">{source.toUpperCase()}</Text>
        </Badge>
      );
  }
}
