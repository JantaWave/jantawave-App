import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

export default function LeaderLayout() {
  const { user, activeRole } = useAuth();

  if (!user || activeRole !== 'leader') {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
