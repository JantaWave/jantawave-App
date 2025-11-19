// // Ensure to call inside a component, not globally
//
// export default function Home() {
//   return (
//     <View className="flex-1 items-center justify-center">
//       <Text className="text-4xl font-bold text-blue-500">Tailwind Works 🎉</Text>
//     </View>
//   );
// }

import { useEffect } from 'react';
import { useRouter, SplashScreen } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [token, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
});
