import { useColorScheme } from 'nativewind';
import Bell from 'phosphor-react-native/src/icons/Bell';
import Lightning from 'phosphor-react-native/src/icons/Lightning';
import SignIn from 'phosphor-react-native/src/icons/SignIn';
import Users from 'phosphor-react-native/src/icons/Users';
import { Image, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Text } from '@/components/ui/text';
import { useAppearance } from '@/lib/appearance';

type PhosphorIcon = typeof Lightning;

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: PhosphorIcon;
  title: string;
  color: string;
  children: string;
}) {
  return (
    <View className="flex-row gap-3">
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}1f` }}>
        <Icon size={16} weight="bold" color={color} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-semibold">{title}</Text>
        <Text variant="muted" className="text-sm leading-5">
          {children}
        </Text>
      </View>
    </View>
  );
}

/**
 * The plain-language introduction shown before sign-in. The technical guide,
 * with the formulas, lives in InfoModal on the dashboard.
 */
export function AboutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const ac = primary.hex;
  const danger = colorScheme === 'dark' ? '#f87171' : '#dc2626';

  return (
    <BottomSheet visible={visible} title="About DynaVolt" onClose={onClose}>
      <Section icon={Lightning} title="What this app is for" color={ac}>
        It watches a 1 KVA distribution transformer and shows its voltage, current, temperature
        and load as they happen, so problems are noticed before something fails.
      </Section>

      <Section icon={Bell} title="Why it matters" color={danger}>
        An overloaded or overheating transformer can fail without warning. DynaVolt raises an
        alert the moment load reaches 900 VA or temperature reaches 40 °C, and records who
        responded and how quickly.
      </Section>

      <Section icon={Users} title="Who uses it" color={ac}>
        Maintenance engineers get everything, including thresholds, logs and accounts. Power
        utility personnel get live monitoring and alerts.
      </Section>

      <Section icon={SignIn} title="How to sign in" color={ac}>
        Ask the admin to create an account for you.
      </Section>

      {/* The footer is provenance, not another section, so it sits below a rule.
          The seal anchors it and the address breaks on its natural lines rather
          than wrapping as one long string. */}
      <View className="border-border gap-3 border-t pt-4">
        <View className="flex-row items-center gap-3">
          <Image
            source={require('@/assets/images/phinmacoc.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
            accessibilityLabel="PHINMA Cagayan de Oro College"
          />
          <View className="flex-1 gap-0.5">
            <Text className="text-xs font-semibold leading-4">
              PHINMA Cagayan de Oro College
            </Text>
            <Text variant="muted" className="text-[10px] leading-[13px]">
              Carmen Campus, Max Suniel Street
            </Text>
            <Text variant="muted" className="text-[10px] leading-[13px]">
              Cagayan de Oro City, 9000, Misamis Oriental
            </Text>
          </View>
        </View>

        <Text variant="muted" className="text-center text-[9px] uppercase tracking-widest">
          Electrical Engineering Thesis Project
        </Text>
      </View>
    </BottomSheet>
  );
}
