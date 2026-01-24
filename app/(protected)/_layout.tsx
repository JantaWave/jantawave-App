import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { useEffect } from 'react';
import axiosClient from '@/src/api/axiosClient';
import { registerForPushNotificationsAsync } from '@/src/notifications/registerForPush';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_KEYS } from '@/src/constants/storage';

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const expoPushToken = await registerForPushNotificationsAsync();

        if (!expoPushToken) {
          console.log('❌ expoPushToken is null');
          return;
        }
        await AsyncStorage.setItem(APP_KEYS.EXPO_PUSH_TOKENS, expoPushToken);
        console.log('✅ Expo Push Token:', expoPushToken);

        await axiosClient.post('/api/v1/push/register', {
          expoPushToken,
        });
      } catch (err) {
        console.log('❌ Push token register failed:', err);
      }
    })();
  }, [user?.id]);

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
