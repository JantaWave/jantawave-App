import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
} from 'react-native';
import { useToast } from 'react-native-toast-notifications';

import {
  getUserFollowers,
  getUserFollowings,
  unfollowUser,
  removeFollower,
} from '../api/community';

/* -------- TYPES -------- */
interface CommunityUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  role?: string;
}

type TabType = 'followers' | 'following';

export default function LeaderCommunityScreen() {
  const Toast = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [followers, setFollowers] = useState<CommunityUser[]>([]);
  const [followings, setFollowings] = useState<CommunityUser[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('followers');

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [followersData, followingsData] = await Promise.all([
        getUserFollowers(),
        getUserFollowings(),
      ]);

      setFollowers(followersData || []);
      setFollowings(followingsData || []);
    } catch {
      Toast.show('Failed to load community data', { type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* ---------------- ACTION HANDLER ---------------- */
  const handleAction = async (user: CommunityUser) => {
    try {
      if (activeTab === 'followers') {
        Alert.alert('Remove follower', `Remove ${user.first_name} from your followers?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeFollower(user.id);
              setFollowers((prev) => prev.filter((u) => u.id !== user.id));
              Toast.show('Follower removed', { type: 'success' });
            },
          },
        ]);
      } else {
        await unfollowUser(user.id);
        setFollowings((prev) => prev.filter((u) => u.id !== user.id));
        Toast.show('Unfollowed successfully', { type: 'success' });
      }
    } catch {
      Toast.show('Action failed', { type: 'danger' });
    }
  };

  /* ---------------- USER AVATAR ---------------- */
  const UserAvatar = ({ user }: { user: CommunityUser }) => {
    if (user.avatar_url) {
      return <Image source={{ uri: user.avatar_url }} className="h-12 w-12 rounded-full" />;
    }

    const initial = user.first_name?.charAt(0)?.toUpperCase() || '?';

    return (
      <View className="h-12 w-12 items-center justify-center rounded-full bg-[#2196F3]">
        <Text className="text-lg font-bold text-white">{initial}</Text>
      </View>
    );
  };

  /* ---------------- USER ROW ---------------- */
  const renderUserRow = ({ item }: { item: CommunityUser }) => (
    <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <View className="flex-1 flex-row items-center">
        <UserAvatar user={item} />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-black dark:text-white">
            {item.first_name} {item.last_name}
          </Text>
          {item.role && (
            <Text className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{item.role}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => handleAction(item)}
        className={`rounded-lg px-5 py-2 ${
          activeTab === 'followers' ? 'bg-red-500' : 'bg-gray-300'
        }`}>
        <Text className="text-sm font-semibold text-white">
          {activeTab === 'followers' ? 'Remove' : 'Unfollow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const currentData = activeTab === 'followers' ? followers : followings;

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* -------- TABS -------- */}
      <View className="flex-row border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => setActiveTab('followers')}
          className="flex-1 items-center border-b-2 py-3"
          style={{
            borderBottomColor: activeTab === 'followers' ? '#2196F3' : 'transparent',
          }}>
          <Text
            className="font-semibold"
            style={{
              color: activeTab === 'followers' ? '#2196F3' : '#999',
            }}>
            {followers.length} Followers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('following')}
          className="flex-1 items-center border-b-2 py-3"
          style={{
            borderBottomColor: activeTab === 'following' ? '#2196F3' : 'transparent',
          }}>
          <Text
            className="font-semibold"
            style={{
              color: activeTab === 'following' ? '#2196F3' : '#999',
            }}>
            {followings.length} Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* -------- LIST -------- */}
      {currentData.length > 0 ? (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderUserRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text className="text-gray-500 dark:text-gray-400">
            {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
