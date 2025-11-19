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
import { getStreams } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import AppHeader from './Components/AppHeader';

export default function StreamsScreen() {
  const Toast = useToast();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streams, setStreams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'streams' | 'posts'>('streams');

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const data = await getStreams();
      setStreams(data.streams || []);
    } catch (error: any) {
      Toast.show(error.response?.data?.message || 'Failed to load streams', {
        type: 'warning',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStreams();
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
      {/* ✅ Reusable AppHeader */}
      <AppHeader title="Activity" iconName="radio" />

      {/* 🔹 Filter Bar */}
      <View className="p-1">
        <View className="w-full flex-row items-center justify-center rounded-full bg-[#252525] p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('streams')}
            className={`flex-1 rounded-full py-2 ${activeTab === 'streams' ? 'bg-[#2196F3]' : ''}`}
            activeOpacity={0.9}>
            <Text
              className={`text-center font-semibold ${
                activeTab === 'streams' ? 'text-white' : 'text-white/70'
              }`}>
              Streams
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            className={`flex-1 rounded-full py-2 ${activeTab === 'posts' ? 'bg-[#2196F3]' : ''}`}
            activeOpacity={0.9}>
            <Text
              className={`text-center font-semibold ${
                activeTab === 'posts' ? 'text-white' : 'text-white/70'
              }`}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔹 Main Content */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2196F3" />
        }
        showsVerticalScrollIndicator={false}>
        {/* STREAMS SECTION */}
        {activeTab === 'streams' && (
          <>
            {streams.length > 0 ? (
              <>
                {/* 🔴 Live Now */}
                <View className="mt-6 px-5">
                  <Text className="mb-4 text-lg font-bold text-black dark:text-white">
                    Live Now
                  </Text>
                  {streams
                    .filter((s) => s.isLive)
                    .map((stream, index) => (
                      <TouchableOpacity
                        key={index}
                        className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]">
                        {/* Live Badge */}
                        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-md bg-[#ff4444] px-2 py-1">
                          <View className="h-1.5 w-1.5 rounded-full bg-white" />
                          <Text className="text-[10px] font-bold text-white">LIVE</Text>
                        </View>

                        <View className="mr-3 flex-1">
                          <Text className="mb-1.5 text-base font-semibold text-black dark:text-white">
                            {stream.title}
                          </Text>
                          <Text className="mb-2 text-sm text-gray-600 dark:text-[#cccccc]">
                            by {stream.hostName}
                          </Text>
                          <View className="flex-row items-center gap-4">
                            <View className="flex-row items-center gap-1">
                              <MaterialIcons
                                name="visibility"
                                size={14}
                                color={isDark ? '#888888' : '#666666'}
                              />
                              <Text className="text-xs text-gray-500 dark:text-[#888888]">
                                {stream.viewers}
                              </Text>
                            </View>
                            <Text className="text-xs text-gray-500 dark:text-[#888888]">
                              {stream.duration}
                            </Text>
                          </View>
                        </View>

                        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#2196F3]">
                          <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>

                {/* 🕒 Recent Streams */}
                <View className="mt-6 px-5 pb-6">
                  <Text className="mb-4 text-lg font-bold text-black dark:text-white">
                    Recent Streams
                  </Text>
                  {streams
                    .filter((s) => !s.isLive)
                    .map((stream, index) => (
                      <TouchableOpacity
                        key={index}
                        className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]">
                        <View className="mr-3 flex-1">
                          <Text className="mb-1.5 text-base font-semibold text-black dark:text-white">
                            {stream.title}
                          </Text>
                          <Text className="mb-2 text-sm text-gray-600 dark:text-[#cccccc]">
                            by {stream.hostName}
                          </Text>
                          <View className="flex-row items-center gap-4">
                            <View className="flex-row items-center gap-1">
                              <MaterialIcons
                                name="visibility"
                                size={14}
                                color={isDark ? '#888888' : '#666666'}
                              />
                              <Text className="text-xs text-gray-500 dark:text-[#888888]">
                                {stream.viewers}
                              </Text>
                            </View>
                            <Text className="text-xs text-gray-500 dark:text-[#888888]">
                              {stream.timeAgo}
                            </Text>
                          </View>
                        </View>

                        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#2196F3]">
                          <MaterialIcons name="play-arrow" size={24} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center px-10 py-20">
                <MaterialIcons name="radio" size={64} color={isDark ? '#333333' : '#cccccc'} />
                <Text className="mb-2 mt-6 text-xl font-bold text-black dark:text-white">
                  No Streams Available
                </Text>
                <Text className="text-center text-sm text-gray-500 dark:text-[#888888]">
                  Check back later for live streams and recordings
                </Text>
              </View>
            )}
          </>
        )}

        {/* POSTS SECTION */}
        {activeTab === 'posts' && (
          <View className="items-center justify-center px-5 py-10">
            <MaterialIcons name="article" size={64} color="#2196F3" />
            <Text className="mt-4 text-lg font-bold text-black dark:text-white">
              Posts Coming Soon
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-500 dark:text-[#aaaaaa]">
              This section will show your uploaded and recent posts
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
