import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * A yes/no confirmation on the same bottom sheet the rest of the app uses, so it
 * matches About/Info/Appearance rather than dropping to a native alert. The Button
 * variants colour their own labels, so the text is left to inherit.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <Text variant="muted" className="text-sm leading-5">
        {message}
      </Text>

      <View className="flex-row gap-2">
        <Button variant="outline" className="flex-1" disabled={busy} onPress={onClose}>
          <Text>{cancelLabel}</Text>
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          className="flex-1"
          disabled={busy}
          onPress={onConfirm}>
          <Text>{busy ? 'Working...' : confirmLabel}</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
