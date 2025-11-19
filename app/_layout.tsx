import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/src/context/AuthContext';
import { ToastProvider } from 'react-native-toast-notifications';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, useColorScheme } from 'react-native';

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View className={`flex-1 ${isDark ? 'bg-[#101c22]' : 'bg-[#f6f7f8]'}`}>
        <ToastProvider
          placement="top"
          duration={5000}
          animationType="slide-in"
          animationDuration={250}
          successColor="green"
          dangerColor="red"
          warningColor="orange"
          normalColor="gray"
          textStyle={{ fontSize: 15 }}
          offset={50}
          offsetTop={40}
          offsetBottom={40}
          swipeEnabled>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right', // Smooth transition
              gestureEnabled: true,
            }}>
            {/* Main App Screens */}
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />

            {/* Auth Screens */}
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />

            {/* Custom Screens */}
            <Stack.Screen name="create-stream" />
            <Stack.Screen name="start-stream" />
            <Stack.Screen name="new-post" />
            <Stack.Screen name="chat" />

            {/* Not Found */}
            <Stack.Screen name="+not-found" />
          </Stack>
        </ToastProvider>
      </View>
    </AuthProvider>
  );
}
