import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/features/auth/context';

export default function Index() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={token ? '/dashboard' : '/login'} />;
}
