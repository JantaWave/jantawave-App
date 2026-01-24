import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/context/ThemeContext';
import { getLeaderProfile, getUserStreams } from '@/src/api/user';
import { followUser, unfollowUser } from '@/src/api/community';
import { getUserPosts } from '@/src/api';
import { capitalize, getInitials } from '../utils/getInitials';

const PAGE_LIMIT = 9;

/* ---------------- TYPES ---------------- */
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio?: string;
  followers_count: number;
  following_count: number;
  streams_count: number;
  posts_count: number;
  is_following: boolean;
}

type TabType = 'posts' | 'streams';

/* ---------------- SCREEN ---------------- */
export default function LeaderProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  /* ---------------- STATE ---------------- */
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [contentLoading, setContentLoading] = useState(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [postsHasMore, setPostsHasMore] = useState(true);

  const [streams, setStreams] = useState<any[]>([]);
  const [streamCursor, setStreamCursor] = useState<string | null>(null);
  const [streamsHasMore, setStreamsHasMore] = useState(true);

  /* ---------------- FETCH PROFILE ---------------- */
  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getLeaderProfile(id as string);
        setProfile(data);
      } catch {
        Alert.alert('Error', 'Failed to load profile');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  /* ---------------- FETCH POSTS ---------------- */
  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      if (!profile || contentLoading || (isLoadMore && !postCursor)) return;

      try {
        setContentLoading(true);

        const currentCursor = isLoadMore ? postCursor : null;
        const response = await getUserPosts(profile.id, PAGE_LIMIT, currentCursor);
        const newPosts = response?.posts || [];
        const nextCursor = response?.nextCursor;

        setPosts((prev) => (isLoadMore ? [...prev, ...newPosts] : newPosts));
        setPostCursor(nextCursor);
        setPostsHasMore(!!nextCursor);
      } catch (error) {
        console.error(error); // Log the actual error
        Alert.alert('Error', 'Failed to load posts');
      } finally {
        setContentLoading(false);
      }
    },
    [profile, postCursor, contentLoading]
  );
  /* ---------------- FETCH STREAMS ---------------- */
  const fetchStreams = useCallback(
    async (isLoadMore = false) => {
      if (!profile || contentLoading || (isLoadMore && !streamCursor)) return;
      try {
        setContentLoading(true);
        const currentCursor = isLoadMore ? streamCursor : null;
        const response = await getUserStreams(profile.id, PAGE_LIMIT, currentCursor);
        const newStreams = response?.streams || [];
        const nextCursor = response?.nextCursor;
        setStreams((prev) => (isLoadMore ? [...prev, ...newStreams] : newStreams));
        setStreamCursor(nextCursor);
        setStreamsHasMore(!!nextCursor);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load streams');
      } finally {
        setContentLoading(false);
      }
    },
    [profile, streamCursor, contentLoading]
  );
  /* ---------------- TAB CHANGE ---------------- */
  useEffect(() => {
    if (!profile || contentLoading) return;

    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts(false);
    }

    if (activeTab === 'streams' && streams.length === 0) {
      fetchStreams(false);
    }
  }, [activeTab, profile]);

  /* ---------------- FOLLOW ---------------- */
  const handleToggleFollow = async () => {
    if (!profile) return;

    const prevFollow = profile.is_following;
    const prevCount = profile.followers_count;

    setProfile({
      ...profile,
      is_following: !prevFollow,
      followers_count: prevFollow ? prevCount - 1 : prevCount + 1,
    });

    try {
      setFollowLoading(true);
      prevFollow ? await unfollowUser(profile.id) : await followUser(profile.id);
    } catch {
      setProfile({
        ...profile,
        is_following: prevFollow,
        followers_count: prevCount,
      });
      Alert.alert('Error', 'Action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  /* ---------------- LOAD MORE ---------------- */
  const handleLoadMore = () => {
    if (contentLoading) return;

    if (activeTab === 'posts' && postsHasMore) fetchPosts(true);
    if (activeTab === 'streams' && streamsHasMore) fetchStreams(true);
  };

  /* ---------------- GRID ITEM ---------------- */
  const GridItem = ({ thumbnail }: { thumbnail?: string }) => (
    <View className="h-32 w-1/3 border border-black/5 dark:border-white/5">
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} className="h-full w-full" />
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-200 dark:bg-gray-800">
          <Feather name="video" size={20} color="#999" />
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) return null;

  const currentData = activeTab === 'posts' ? posts : streams;
  const hasMore = activeTab === 'posts' ? postsHasMore : streamsHasMore;

  /* ---------------- RENDER ---------------- */
  return (
    <View className="flex-1 bg-white dark:bg-black">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <FlatList
        data={currentData}
        key={activeTab}
        numColumns={3}
        keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
        renderItem={({ item }) => <GridItem thumbnail={item.thumbnail_url || item.media_url} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        initialNumToRender={9}
        maxToRenderPerBatch={9}
        windowSize={5}
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View className="flex-row items-center px-4" style={{ paddingTop: insets.top + 8 }}>
              <TouchableOpacity onPress={() => router.back()}>
                <Feather name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <Text className="ml-4 text-lg font-bold text-black dark:text-white">
                {capitalize(profile.first_name)}
              </Text>
            </View>

            {/* AVATAR + STATS */}
            <View className="mt-6 flex-row px-6">
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="h-24 w-24 rounded-full" />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full bg-blue-500">
                  <Text className="text-3xl font-black text-white">
                    {getInitials(profile.first_name, profile.last_name)}
                  </Text>
                </View>
              )}

              <View className="ml-6 flex-1 flex-row justify-around">
                {[
                  { label: 'Streams', value: profile.streams_count },
                  { label: 'Followers', value: profile.followers_count },
                  { label: 'Following', value: profile.following_count },
                ].map((item) => (
                  <View key={item.label} className="items-center">
                    <Text className="text-lg font-bold text-black dark:text-white">
                      {item.value}
                    </Text>
                    <Text className="text-xs text-gray-500">{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* FOLLOW BUTTON */}
            <View className="mt-4 px-6">
              <TouchableOpacity
                onPress={handleToggleFollow}
                disabled={followLoading}
                className={`h-9 items-center justify-center rounded-md ${
                  profile.is_following ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-500'
                }`}>
                {followLoading ? (
                  <ActivityIndicator size="small" color={profile.is_following ? '#000' : '#fff'} />
                ) : (
                  <Text
                    className={`font-semibold ${
                      profile.is_following ? 'text-black dark:text-white' : 'text-white'
                    }`}>
                    {profile.is_following ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* TABS */}
            <View className="mt-6 flex-row border-t border-gray-200 dark:border-gray-800">
              {(['posts', 'streams'] as TabType[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={`flex-1 items-center py-3 ${
                    activeTab === tab ? 'border-b-2 border-black dark:border-white' : ''
                  }`}>
                  <Feather
                    name={tab === 'posts' ? 'grid' : 'video'}
                    size={20}
                    color={isDark ? '#fff' : '#000'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListFooterComponent={
          contentLoading && hasMore ? <ActivityIndicator className="my-4" size="small" /> : null
        }
        ListEmptyComponent={
          !contentLoading ? (
            <View className="items-center justify-center py-20">
              <Feather name={activeTab === 'posts' ? 'image' : 'video'} size={48} color="#999" />
              <Text className="mt-4 text-gray-500">No {activeTab} yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
