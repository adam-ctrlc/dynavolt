import { useColorScheme } from 'nativewind';
import X from 'phosphor-react-native/src/icons/X';
import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const { colorScheme } = useColorScheme();
  const { height } = useWindowDimensions();
  const fg = colorScheme === 'dark' ? '#fafafa' : '#0a0a0a';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" accessibilityLabel="Close" onPress={onClose} />
        <View
          style={{ maxHeight: height * 0.85 }}
          className="overflow-hidden rounded-t-3xl border border-border bg-card">
          <View className="flex-row items-center justify-between px-5 pb-2 pt-5">
            <Text className="text-lg font-semibold">{title}</Text>
            <Button variant="ghost" size="icon" accessibilityLabel="Close" onPress={onClose}>
              <X size={20} weight="bold" color={fg} />
            </Button>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerClassName="gap-5 px-5 pb-8 pt-1"
            showsVerticalScrollIndicator
            persistentScrollbar>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
