import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
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
import { capitalize, getInitials } from '../utils/getInitials';
import { getUserPosts } from '../api';

const PAGE_LIMIT = 9;

/* ---------------- TYPES ---------------- */
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  bio?: string;
  followers_count: number;
  following_count: number;
  streams_count: number;
  is_following: boolean;
}

type TabType = 'posts' | 'streams';

/* ---------------- SCREEN ---------------- */
export default function LeaderProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  /* -------- POSTS PAGINATION -------- */
  const [posts, setPosts] = useState<any[]>([]);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(true);

  /* -------- STREAMS PAGINATION -------- */
  const [streams, setStreams] = useState<any[]>([]);
  const [streamsOffset, setStreamsOffset] = useState(0);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamsHasMore, setStreamsHasMore] = useState(true);

  /* ---------------- FETCH PROFILE ---------------- */
  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

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

  /* ---------------- POSTS ---------------- */
  const [offset, setOffset] = useState(0);
  const LIMIT = 9;

  const fetchPosts = async (isLoadMore = false) => {
    try {
      setContentLoading(true);

      const data = await getUserPosts(profile!.id, LIMIT, isLoadMore ? offset : 0);

      setPosts((prev) => (isLoadMore ? [...prev, ...data] : data));

      if (data.length === LIMIT) {
        setOffset((prev) => prev + LIMIT);
      }
    } finally {
      setContentLoading(false);
    }
  };

  /* ---------------- STREAMS ---------------- */
  const fetchStreams = async (reset = false) => {
    if (!profile || streamsLoading || (!streamsHasMore && !reset)) return;

    try {
      setStreamsLoading(true);

      const offset = reset ? 0 : streamsOffset;
      const data = await getUserStreams(profile.id, PAGE_LIMIT, offset);

      setStreams((prev) => (reset ? data : [...prev, ...data]));
      setStreamsOffset(offset + PAGE_LIMIT);
      setStreamsHasMore(data.length === PAGE_LIMIT);
    } catch {
      Alert.alert('Error', 'Failed to load streams');
    } finally {
      setStreamsLoading(false);
    }
  };

  /* ---------------- TAB CHANGE ---------------- */
  useEffect(() => {
    if (!profile) return;

    if (activeTab === 'posts' && posts.length === 0) fetchPosts(true);
    if (activeTab === 'streams' && streams.length === 0) fetchStreams(true);
  }, [activeTab, profile]);

  /* ---------------- FOLLOW ---------------- */
  const handleToggleFollow = async () => {
    if (!profile) return;

    const prev = profile.is_following;
    const prevCount = profile.followers_count;

    setProfile({
      ...profile,
      is_following: !prev,
      followers_count: prev ? prevCount - 1 : prevCount + 1,
    });

    try {
      setFollowLoading(true);
      prev ? await unfollowUser(profile.id) : await followUser(profile.id);
    } catch {
      setProfile({
        ...profile,
        is_following: prev,
        followers_count: prevCount,
      });
      Alert.alert('Error', 'Action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) return null;

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

  /* ---------------- GRID RENDER ---------------- */
  const renderGrid = (data: any[], loadMore: () => void, loadingMore: boolean) => (
    <FlatList
      data={data}
      numColumns={3}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <GridItem thumbnail={item.thumbnail_url || item.media_url} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" /> : null}
    />
  );

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View className="flex-row items-center px-4" style={{ paddingTop: insets.top + 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} />
          </TouchableOpacity>
          <Text className="ml-4 text-lg font-bold">{capitalize(profile.first_name)}</Text>
        </View>

        {/* AVATAR + STATS */}
        <View className="mt-6 flex-row px-6">
          {profile.profile_image ? (
            <Image source={{ uri: profile.profile_image }} className="h-24 w-24 rounded-full" />
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
                <Text className="text-lg font-bold">{item.value}</Text>
                <Text className="text-xs text-gray-500">{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FOLLOW */}
        <View className="mt-4 px-6">
          <TouchableOpacity
            onPress={handleToggleFollow}
            disabled={followLoading}
            className={`h-9 items-center justify-center rounded-md ${
              profile.is_following ? 'bg-gray-200' : 'bg-blue-500'
            }`}>
            {followLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`font-semibold ${profile.is_following ? '' : 'text-white'}`}>
                {profile.is_following ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View className="mt-6 flex-row border-t">
          {['posts', 'streams'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as TabType)}
              className={`flex-1 items-center py-3 ${activeTab === tab ? 'border-b-2' : ''}`}>
              <Feather name={tab === 'posts' ? 'grid' : 'video'} size={20} />
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENT */}
        {activeTab === 'posts'
          ? renderGrid(posts, () => fetchPosts(), postsLoading)
          : renderGrid(streams, () => fetchStreams(), streamsLoading)}
      </ScrollView>
    </View>
  );
}
