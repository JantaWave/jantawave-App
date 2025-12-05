import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { getCommunity } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import AppHeader from './Components/AppHeader';

export default function CommunityScreen() {
  const Toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchCommunity();
  }, []);

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const data = await getCommunity();
      setPosts(data.posts || []);
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to load community posts', {
        type: 'warning',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCommunity();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* ✅ Reusable Header */}
      <AppHeader title="Community" iconName="group" />

      <ScrollView
        className="flex-1 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
        showsVerticalScrollIndicator={false}>
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <View
              key={index}
              className="mx-5 mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]">
              {/* Post Header */}
              <View className="mb-3 flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#2196F3]">
                  <Text className="text-lg font-bold text-white">
                    {post.authorName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="mb-0.5 text-base font-semibold text-black dark:text-white">
                    {post.authorName}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-[#888888]">{post.timeAgo}</Text>
                </View>
              </View>

              {/* Post Content */}
              <Text className="mb-3 text-sm leading-5 text-gray-700 dark:text-[#cccccc]">
                {post.content}
              </Text>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <View className="mb-3 flex-row flex-wrap gap-2">
                  {post.tags.map((tag: string, idx: number) => (
                    <View
                      key={idx}
                      className="rounded-2xl border border-[#2196F3] bg-white px-3 py-1.5 dark:bg-[#1a1a1a]">
                      <Text className="text-xs font-medium text-[#2196F3]">#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Post Actions */}
              <View className="flex-row gap-6 border-t border-gray-200 pt-3 dark:border-[#333333]">
                <TouchableOpacity className="flex-row items-center gap-1.5">
                  <MaterialIcons
                    name="favorite-border"
                    size={18}
                    color={isDark ? '#888888' : '#666666'}
                  />
                  <Text className="text-sm text-gray-600 dark:text-[#888888]">
                    {post.likes || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center gap-1.5">
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={18}
                    color={isDark ? '#888888' : '#666666'}
                  />
                  <Text className="text-sm text-gray-600 dark:text-[#888888]">
                    {post.comments || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center gap-1.5">
                  <MaterialIcons name="share" size={18} color={isDark ? '#888888' : '#666666'} />
                  <Text className="text-sm text-gray-600 dark:text-[#888888]">Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center px-10 py-20">
            <MaterialIcons name="group" size={64} color={isDark ? '#333333' : '#cccccc'} />
            <Text className="mb-2 mt-6 text-xl font-bold text-black dark:text-white">
              No Posts Yet
            </Text>
            <Text className="text-center text-sm text-gray-500 dark:text-[#888888]">
              Be the first to share your thoughts with the community
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
