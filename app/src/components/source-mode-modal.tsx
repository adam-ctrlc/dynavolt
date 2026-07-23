import Check from 'phosphor-react-native/src/icons/Check';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import * as deviceApi from '@/features/device/api';
import { usePoll } from '@/hooks/use-poll';
import { useAppearance } from '@/lib/appearance';

const STATUS_MS = 2000;
const SYNCED_HOLD_MS = 1200;

type SourceModeModalProps = {
  visible: boolean;
  token: string | null;
  onSynced: () => void;
  onCancel: () => void;
};

export function SourceModeModal({ visible, token, onSynced, onCancel }: SourceModeModalProps) {
  const { primary } = useAppearance();
  const [synced, setSynced] = useState(false);

  const fetcher = useCallback(
    (signal: AbortSignal) => deviceApi.status(token ?? '', signal),
    [token]
  );
  // Stop polling the moment the board syncs so the success state holds steady.
  const { data } = usePoll(fetcher, STATUS_MS, visible && !synced);

  useEffect(() => {
    if (!visible) setSynced(false);
  }, [visible]);

  useEffect(() => {
    if (visible && data?.connected) setSynced(true);
  }, [visible, data?.connected]);

  useEffect(() => {
    if (!synced) return;
    const id = setTimeout(onSynced, SYNCED_HOLD_MS);
    return () => clearTimeout(id);
  }, [synced, onSynced]);

  return (
    <BottomSheet
      visible={visible}
      title={synced ? 'ESP32 connected' : 'Waiting for ESP32'}
      onClose={onCancel}>
      {synced ? (
        <View className="items-center gap-4 py-6">
          <Badge>
            <Check size={12} weight="bold" color="#ffffff" />
            <Text>Synced</Text>
          </Badge>
          <Text className="text-sm font-medium">ESP32 connected</Text>
        </View>
      ) : (
        <View className="items-center gap-5 py-6">
          <ActivityIndicator size="large" color={primary.hex} />
          <Text variant="muted" className="text-center text-sm">
            Now on ESP32 mode. The dashboard shows no data until the board reports. You can close
            this and keep waiting.
          </Text>
          <Button variant="outline" className="w-full" onPress={onCancel}>
            <Text>Close</Text>
          </Button>
        </View>
      )}
    </BottomSheet>
  );
}
