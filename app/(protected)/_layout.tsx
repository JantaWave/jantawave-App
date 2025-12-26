import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();

  // ⏳ Wait until auth is restored from AsyncStorage
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

  // 🚫 Not logged in → go to login
  if (!user) {
    return <Redirect href="/(public)/auth/login" />;
  }

  // ✅ Logged in → allow access
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
