import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  useColorScheme,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Search, Bell, Repeat2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import LeaderHome from './LeaderHome';
import AudienceHome from './AudienceHome';
import { capitalize, getInitials } from '../utils/getInitials';

export default function Home() {
  const { user, isLoading, activeRole, setActiveRole, isLeaderMode } = useAuth();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!user) return null;

  // Check if user can be a leader
  const isStreamer = user.role === 'leader';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-[#252525]">
        {/* Avatar & name */}
        <View className="flex-row items-center gap-3">
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="h-10 w-10 rounded-full" />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-500">
              <Text className="text-lg font-bold text-white">
                {getInitials(user?.first_name, user?.last_name)}
              </Text>
            </View>
          )}

          <View>
            <Text className="text-xl font-bold text-blue-500">
              {`${capitalize(user?.first_name)} ${capitalize(user?.last_name)}`}
            </Text>

            {isStreamer && (
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {isLeaderMode() ? 'Leader Mode' : 'Audience Mode'}
              </Text>
            )}
          </View>
        </View>

        {/* Icons */}
        <View className="flex-row items-center gap-4">
          {/* Search (only visible in Audience mode) */}
          {!isLeaderMode() && (
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Search size={26} color={isDark ? '#e5e5e5' : '#374151'} />
            </TouchableOpacity>
          )}

          {/* Notifications */}
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Bell size={26} color={isDark ? '#e5e5e5' : '#374151'} />
          </TouchableOpacity>

          {/* Role switch (for leader accounts only) */}
          {isStreamer && (
            <TouchableOpacity
              onPress={() => setActiveRole(isLeaderMode() ? 'user' : 'leader')}
              className="rounded-full bg-blue-500/90 p-2 dark:bg-blue-600">
              <Repeat2 size={22} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Screen Switching */}
      {isStreamer && isLeaderMode() ? <LeaderHome /> : <AudienceHome />}
    </SafeAreaView>
  );
}
