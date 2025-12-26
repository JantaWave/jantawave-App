import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function PublicLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  // ✅ Already logged in → send to app
  if (user) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
