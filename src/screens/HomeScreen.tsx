import React from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { Search, Bell, Repeat2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext'; // ✅ Hook
import LeaderHome from './LeaderHome';
import AudienceHome from './AudienceHome';
import { capitalize, getInitials } from '../utils/getInitials';

export default function Home() {
  const { user, isLoading, activeRole, setActiveRole, isLeaderMode } = useAuth();
  const router = useRouter();
  const { colors } = useAppTheme(); // ✅ Use Theme Hook

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return null;

  // Check if user can be a leader
  const isStreamer = user.role === 'leader';

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border-light bg-surface-light px-5 py-3 dark:border-border-dark dark:bg-surface-dark">
        {/* Avatar & name */}
        <View className="flex-row items-center gap-3">
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="h-10 w-10 rounded-full" />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Text className="text-lg font-bold text-white">
                {getInitials(user?.first_name, user?.last_name)}
              </Text>
            </View>
          )}

          <View>
            <Text className="text-xl font-bold text-primary">
              {`${capitalize(user?.first_name)} ${capitalize(user?.last_name)}`}
            </Text>

            {isStreamer && (
              <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {isLeaderMode() ? 'Host Mode' : 'Viewer Mode'}
              </Text>
            )}
          </View>
        </View>

        {/* Icons */}
        <View className="flex-row items-center gap-4">
          {/* Search (only visible in Audience mode) */}
          {!isLeaderMode() && (
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Search size={26} color={colors.text} />
            </TouchableOpacity>
          )}

          {/* Notifications */}
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Bell size={26} color={colors.text} />
          </TouchableOpacity>

          {/* Role switch (for leader accounts only) */}
          {isStreamer && (
            <TouchableOpacity
              onPress={() => setActiveRole(isLeaderMode() ? 'user' : 'leader')}
              className="rounded-full bg-primary p-2">
              <Repeat2 size={22} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Screen Switching */}
      <View className="h-full w-full">
        {isStreamer && isLeaderMode() ? <LeaderHome /> : <AudienceHome />}
      </View>
    </SafeAreaView>
  );
}
