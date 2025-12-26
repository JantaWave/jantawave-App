import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { getStreamsForUser } from '../api';

export default function AudienceHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<any[]>([]);
  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      // This returns { streams: [...], nextCursor: ... }
      const response = await getStreamsForUser();

      // ✅ FIX: Extract the array from the response object
      const streamsList = response?.streams || [];

      // Filter out streams from the logged-in user
      const filteredStreams = streamsList.filter((s: any) => s.user_id !== user?.id);
      setStreams(filteredStreams);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeLink = async (url: string) => {
    if (!url) {
      alert('No YouTube link available for this stream');
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening YouTube link:', error);
      alert('Failed to open YouTube link');
    }
  };

  // ---------------- FILTER STREAMS ----------------
  const liveStreams = streams.filter((s) => s.status === 'live' || s.is_live === true);
  const upcomingStreams = streams.filter((s) => s.status === 'scheduled');

  // Show only first 5 unless "Show More" is clicked
  const displayedLiveStreams = showAllLive ? liveStreams : liveStreams.slice(0, 5);
  const displayedUpcomingStreams = showAllUpcoming ? upcomingStreams : upcomingStreams.slice(0, 5);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      {/* ---------------- LIVE STREAMS ---------------- */}
      {liveStreams.length > 0 && (
        <>
          <Text className="mb-3 text-xl font-bold text-black dark:text-white">🔴 Live Now</Text>

          {displayedLiveStreams.map((stream) => (
            <View
              key={stream.id}
              className="mb-4 overflow-hidden rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-[#1a1a1a]">
              <Image
                source={{ uri: stream.thumbnail || stream.cover_image }}
                className="h-48 w-full"
              />

              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-lg font-bold text-black dark:text-white">
                    {stream.title}
                  </Text>

                  <View className="flex-row items-center gap-1 rounded bg-red-500 px-2 py-1">
                    <View className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <Text className="text-[10px] font-bold text-white">LIVE</Text>
                  </View>
                </View>

                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  by {stream.first_name} {stream.last_name}
                </Text>

                <TouchableOpacity
                  onPress={() => handleYoutubeLink(stream.share_urls.youtube)}
                  className="mt-3 flex-row items-center justify-center gap-2 rounded-lg bg-red-600 py-3"
                  activeOpacity={0.7}>
                  <Feather name="youtube" size={20} color="white" />
                  <Text className="font-bold text-white">
                    {stream.share_urls.youtube ? 'Join on YouTube' : 'No Stream Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Show More Button for Live Streams */}
          {liveStreams.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowAllLive(!showAllLive)}
              className="mb-4 items-center rounded-lg border border-red-300 bg-white py-3 dark:border-red-800 dark:bg-[#1a1a1a]">
              <Text className="font-semibold text-red-600 dark:text-red-400">
                {showAllLive ? 'Show Less' : `Show ${liveStreams.length - 5} More Live Streams`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ---------------- UPCOMING STREAMS ---------------- */}
      {upcomingStreams.length > 0 && (
        <>
          <Text className="mb-3 mt-6 text-xl font-bold text-black dark:text-white">
            📅 Upcoming
          </Text>

          {displayedUpcomingStreams.map((stream) => (
            <View
              key={stream.id}
              className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#1a1a1a]">
              <View className="flex-row items-center gap-4">
                <Image
                  source={{ uri: stream.thumbnail || stream.cover_image }}
                  className="h-20 w-20 rounded-lg"
                />

                <View className="flex-1">
                  <Text className="font-bold text-black dark:text-white">{stream.title}</Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {stream.first_name} {stream.last_name}
                  </Text>

                  <View className="mt-1 flex-row items-center gap-1">
                    <Feather name="clock" size={12} color="#2196F3" />
                    <Text className="text-xs font-semibold text-blue-500">
                      {stream.scheduled_time}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleYoutubeLink(stream.share_urls.youtube)}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-lg border border-red-600 py-2"
                activeOpacity={0.7}>
                <Feather name="youtube" size={18} color="#DC2626" />
                <Text className="font-semibold text-red-600">
                  {stream.share_urls.youtube ? 'Set Reminder on YouTube' : 'No Stream Link'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Show More Button for Upcoming Streams */}
          {upcomingStreams.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowAllUpcoming(!showAllUpcoming)}
              className="mb-4 items-center rounded-lg border border-gray-300 bg-white py-3 dark:border-gray-700 dark:bg-[#1a1a1a]">
              <Text className="font-semibold text-blue-600 dark:text-blue-400">
                {showAllUpcoming
                  ? 'Show Less'
                  : `Show ${upcomingStreams.length - 5} More Upcoming Streams`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ---------------- EMPTY STATE ---------------- */}
      {streams.length === 0 && (
        <View className="items-center py-20">
          <Feather name="radio" size={64} color="#999" />
          <Text className="mt-4 text-gray-500">No streams from leaders you follow</Text>
        </View>
      )}

      <View className="mb-20" />
    </ScrollView>
  );
}
