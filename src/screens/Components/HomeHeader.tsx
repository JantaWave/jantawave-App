import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Repeat2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { capitalize, getInitials } from '../../utils/getInitials';

export default function HomeHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setActiveRole, isLeaderMode } = useAuth();
  const { colors } = useAppTheme();

  if (!user) return null;

  const isStreamer = user.role === 'leader';

  return (
    <View
      className="border-b border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
      style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center justify-between px-5 pb-4">
        {/* LEFT: Avatar + Name */}
        <View className="flex-row items-center gap-3">
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="h-10 w-10 rounded-full" />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Text className="text-lg font-bold text-white">
                {getInitials(user.first_name, user.last_name)}
              </Text>
            </View>
          )}

          <View>
            <Text className="text-lg font-bold text-primary">
              {capitalize(user.first_name)} {capitalize(user.last_name)}
            </Text>

            {isStreamer && (
              <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {isLeaderMode() ? 'Host Mode' : 'Viewer Mode'}
              </Text>
            )}
          </View>
        </View>

        {/* RIGHT: Actions */}
        <View className="flex-row items-center gap-4">
          {!isLeaderMode() && (
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Search size={26} color={colors.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Bell size={26} color={colors.text} />
          </TouchableOpacity>

          {isStreamer && (
            <TouchableOpacity
              onPress={() => setActiveRole(isLeaderMode() ? 'user' : 'leader')}
              className="rounded-full bg-primary p-2">
              <Repeat2 size={22} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
