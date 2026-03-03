import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';

export default function IndexScreen() {
  const { session, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2f7f65" />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)/distance' : '/login'} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9ece5',
  },
});
