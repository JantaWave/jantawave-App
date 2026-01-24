import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { getUserActivity, getMyActivity } from '../api/activity';
import { useAuth } from '../context/AuthContext';

// Types
interface Activity {
  id: string;
  action: 'like' | 'dislike' | 'comment' | 'reply';
  entity_type: 'post' | 'comment';
  entity_id: string;
  metadata?: any;
  created_at: string;
  actor_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  // For "My Activity" view
  target_first_name?: string;
  target_last_name?: string;
  target_avatar_url?: string;
  target_user_id?: string;
}

interface ActivityResponse {
  activities: Activity[];
  nextCursor: string | null;
}

export default function AudienceActivityScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Get user role from auth context
  const { user } = useAuth(); // Adjust based on your auth implementation
  const isLeader = user?.role === 'leader'; // Adjust based on your user model

  // Fetch activities from API based on user role
  const fetchActivities = async (refresh = false) => {
    try {
      const currentCursor = refresh ? null : cursor;

      const response: ActivityResponse = isLeader
        ? await getUserActivity({ limit: 10, cursor: currentCursor })
        : await getMyActivity({ limit: 10, cursor: currentCursor });

      if (refresh) {
        setActivities(response.activities || []);
      } else {
        setActivities((prev) => [...prev, ...(response.activities || [])]);
      }

      setCursor(response.nextCursor);
      setHasMore(!!response.nextCursor);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities(true);
  }, [isLeader]); // Re-fetch when role changes

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities(true);
  }, [isLeader]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchActivities(false);
    }
  };

  // Get activity message based on action and user role
  const getActivityMessage = (activity: Activity) => {
    if (isLeader) {
      // Leader view: "John Doe liked your post"
      const userName = `${activity.first_name} ${activity.last_name}`;

      switch (activity.action) {
        case 'like':
          return { primary: userName, action: 'liked', target: `your ${activity.entity_type}` };
        case 'dislike':
          return { primary: userName, action: 'disliked', target: `your ${activity.entity_type}` };
        case 'comment':
          return {
            primary: userName,
            action: 'commented on',
            target: `your ${activity.entity_type}`,
          };
        case 'reply':
          return { primary: userName, action: 'replied to', target: 'your comment' };
        default:
          return { primary: userName, action: 'interacted with', target: 'your content' };
      }
    } else {
      // Regular user view: "You liked John Doe's post"
      const targetName = `${activity.target_first_name} ${activity.target_last_name}`;

      switch (activity.action) {
        case 'like':
          return {
            primary: 'You',
            action: 'liked',
            target: `${targetName}'s ${activity.entity_type}`,
          };
        case 'dislike':
          return {
            primary: 'You',
            action: 'disliked',
            target: `${targetName}'s ${activity.entity_type}`,
          };
        case 'comment':
          return {
            primary: 'You',
            action: 'commented on',
            target: `${targetName}'s ${activity.entity_type}`,
          };
        case 'reply':
          return { primary: 'You', action: 'replied to', target: `${targetName}'s comment` };
        default:
          return { primary: 'You', action: 'interacted with', target: `${targetName}'s content` };
      }
    }
  };

  // Get time ago string
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };

  // Get action styling
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'like':
        return {
          icon: '❤️',
          gradient: ['#FF6B9D', '#FE8C72'],
          bgColor: isDark ? 'rgba(255, 107, 157, 0.15)' : 'rgba(255, 107, 157, 0.1)',
        };
      case 'dislike':
        return {
          icon: '💔',
          gradient: ['#8B8B8B', '#6B6B6B'],
          bgColor: isDark ? 'rgba(139, 139, 139, 0.15)' : 'rgba(139, 139, 139, 0.1)',
        };
      case 'comment':
        return {
          icon: '💬',
          gradient: ['#4F9EFF', '#2196F3'],
          bgColor: isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
        };
      case 'reply':
        return {
          icon: '↩️',
          gradient: ['#9C27B0', '#7B1FA2'],
          bgColor: isDark ? 'rgba(156, 39, 176, 0.15)' : 'rgba(156, 39, 176, 0.1)',
        };
      default:
        return {
          icon: '📌',
          gradient: ['#757575', '#616161'],
          bgColor: isDark ? 'rgba(117, 117, 117, 0.15)' : 'rgba(117, 117, 117, 0.1)',
        };
    }
  };

  // Handle activity press
  const handleActivityPress = (activity: Activity) => {
    router.push(`/post/${activity.entity_id}`);
  };

  // Get avatar URL and initials based on user role
  const getAvatarInfo = (activity: Activity) => {
    if (isLeader) {
      return {
        avatarUrl: activity.avatar_url,
        initials: `${activity.first_name[0]}${activity.last_name[0]}`,
      };
    } else {
      return {
        avatarUrl: activity.target_avatar_url,
        initials: `${activity.target_first_name?.[0] || ''}${activity.target_last_name?.[0] || ''}`,
      };
    }
  };

  // Render single activity item with animation
  const renderActivity = ({ item, index }: { item: Activity; index: number }) => {
    const actionStyle = getActionStyle(item.action);
    const message = getActivityMessage(item);
    const avatarInfo = getAvatarInfo(item);

    return (
      <TouchableOpacity
        className="mb-2 px-4"
        onPress={() => handleActivityPress(item)}
        activeOpacity={0.7}>
        <View
          className={`overflow-hidden rounded-2xl ${isDark ? 'bg-[#1E1E1E]' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}>
          <View className="p-4">
            <View className="flex-row items-start">
              {/* Avatar with gradient border */}
              <View className="relative mr-3">
                <View
                  className="items-center justify-center rounded-full p-0.5"
                  style={{
                    backgroundColor: actionStyle.bgColor,
                  }}>
                  {avatarInfo.avatarUrl ? (
                    <Image
                      source={{ uri: avatarInfo.avatarUrl }}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <View
                      className="h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
                      }}>
                      <Text
                        className={`text-base font-bold ${
                          isDark ? 'text-white' : 'text-gray-800'
                        }`}>
                        {avatarInfo.initials}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action icon badge with gradient */}
                <View
                  className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    backgroundColor: actionStyle.bgColor,
                  }}>
                  <Text className="text-sm">{actionStyle.icon}</Text>
                </View>
              </View>

              {/* Activity details */}
              <View className="flex-1 pt-0.5">
                <View className="mb-1 flex-row flex-wrap items-center">
                  <Text
                    className={`mr-1 text-[15px] font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {message.primary}
                  </Text>
                  <Text
                    className={`mr-1 text-[15px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {message.action}
                  </Text>
                  <Text className={`text-[15px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {message.target}
                  </Text>
                </View>

                {/* Show comment/reply content preview */}
                {item.metadata?.content && (
                  <View
                    className={`mb-2 mt-1 rounded-xl px-3 py-2 ${
                      isDark ? 'bg-[#2A2A2A]' : 'bg-gray-50'
                    }`}>
                    <Text
                      className={`text-[14px] leading-5 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                      numberOfLines={2}>
                      {item.metadata.content}
                    </Text>
                  </View>
                )}

                <Text
                  className={`text-[13px] font-medium ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                  {getTimeAgo(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`mb-6 h-24 w-24 items-center justify-center rounded-full ${
          isDark ? 'bg-[#1E1E1E]' : 'bg-gray-100'
        }`}>
        <Text className="text-5xl">🔔</Text>
      </View>
      <Text
        className={`mb-2 text-center text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        No activity yet
      </Text>
      <Text
        className={`text-center text-[15px] leading-6 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
        {isLeader
          ? "When people interact with your posts, you'll see their activity here"
          : "Your interactions with leaders' posts will appear here"}
      </Text>
    </View>
  );

  // Loading footer
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="items-center py-6">
        <ActivityIndicator size="small" color={isDark ? '#4F9EFF' : '#2196F3'} />
      </View>
    );
  };

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? 'bg-background-dark' : 'bg-background-light'
        }`}>
        <ActivityIndicator size="large" color={isDark ? '#4F9EFF' : '#2196F3'} />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          activities.length === 0 ? { flex: 1 } : { paddingTop: 12, paddingBottom: 20 }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#4F9EFF' : '#2196F3'}
            colors={[isDark ? '#4F9EFF' : '#2196F3']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
