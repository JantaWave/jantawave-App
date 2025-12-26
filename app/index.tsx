import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function Index() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ✅ Redirect based on auth state
  return user ? <Redirect href="/(protected)/(tabs)" /> : <Redirect href="/(public)/auth/login" />;
}
