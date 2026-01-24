import 'react-native-webrtc';
import '../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import '@/src/notifications/notificationHandler';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ToastProvider } from 'react-native-toast-notifications';

// 1. Rename Navigation Provider to avoid conflict
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';

// 2. Import your Custom Context
import { AuthProvider } from '@/src/context/AuthContext';
import { ThemeProvider, useAppTheme } from '@/src/context/ThemeContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Inner Component: Consumes Custom Theme & Provides Navigation Theme
// ---------------------------------------------------------------------------
function AppLayout() {
  // Now we can use the hook because we are inside the Custom ThemeProvider
  const { isDark, colors } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response.notification.request.content.data;

      // ✅ open screens based on payload
      if (data?.type === 'POST') {
        router.push(`/(protected)/post/${data.postId}`);
      }

      if (data?.type === 'STREAM') {
        router.push(`/(protected)/stream/${data.streamId}`);
      }

      if (data?.type === 'COMMENT') {
        router.push(`/(protected)/post/${data.postId}?commentId=${data.commentId}`);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    // Pass the correct React Navigation theme based on your custom context
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {/* <StatusBar */}
      {/*   style={isDark ? 'light' : 'dark'} */}
      {/*   hidden={true} */}
      {/*   // backgroundColor={colors.background} */}
      {/* /> */}

      {/* Use theme colors for the main background to avoid white flashes */}
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ToastProvider
          placement="top"
          duration={5000}
          animationType="slide-in"
          successColor={colors.success || 'green'} // Use theme colors if available
          dangerColor={colors.danger || 'red'}
          warningColor={colors.warning || 'orange'}
          normalColor="gray"
          textStyle={{ fontSize: 15 }}
          offset={50}
          offsetTop={40}
          offsetBottom={40}
          swipeEnabled>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              // Ensure stack background matches theme
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(public)" />
            <Stack.Screen name="(protected)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ToastProvider>
      </View>
    </NavThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Root Component: Sets up Providers
// ---------------------------------------------------------------------------
export default function RootLayout() {
  useFrameworkReady();

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
      {/* Wrap everything in your Custom Theme Provider first */}
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
