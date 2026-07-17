import { useColorScheme } from 'nativewind';
import CaretLeft from 'phosphor-react-native/src/icons/CaretLeft';
import CaretRight from 'phosphor-react-native/src/icons/CaretRight';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { pageCount, pageIndex, pageRange } from '@/lib/pagination';

type PagerProps = {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  noun?: string;
};

export function Pager({ total, limit, offset, onOffsetChange, noun = 'record' }: PagerProps) {
  const { colorScheme } = useColorScheme();
  const muted = colorScheme === 'dark' ? '#a1a1aa' : '#71717a';

  const pages = pageCount(total, limit);
  const current = pageIndex(offset, limit);
  const { from, to } = pageRange(offset, limit, total);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  if (total === 0) return null;

  return (
    <View className="gap-2 pt-1">
      <Text variant="muted" className="text-center text-xs">
        {from}-{to} of {total} {noun}
        {total === 1 ? '' : 's'}
      </Text>
      <View className="flex-row items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onPress={() => onOffsetChange(Math.max(0, offset - limit))}>
          <CaretLeft size={14} weight="bold" color={muted} />
          <Text>Previous</Text>
        </Button>
        <Text variant="muted" className="text-xs">
          Page {current + 1} of {pages}
        </Text>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onPress={() => onOffsetChange(offset + limit)}>
          <Text>Next</Text>
          <CaretRight size={14} weight="bold" color={muted} />
        </Button>
      </View>
    </View>
  );
}
