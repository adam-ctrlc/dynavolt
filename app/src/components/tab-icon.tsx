import { View } from 'react-native';

type PhosphorIcon = React.ComponentType<{ size?: number; color?: string; weight?: 'bold' }>;

/** Tab icon with an optional unread dot pinned to its top-right corner. */
export function TabIcon({
  icon: Icon,
  color,
  dot = false,
}: {
  icon: PhosphorIcon;
  color: string;
  dot?: boolean;
}) {
  return (
    <View>
      <Icon size={22} weight="bold" color={color} />
      {dot ? (
        <View
          accessibilityLabel="Has new activity"
          className="border-background absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2"
          style={{ backgroundColor: '#ef4444' }}
        />
      ) : null}
    </View>
  );
}
