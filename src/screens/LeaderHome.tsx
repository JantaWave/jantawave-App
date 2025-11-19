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
import { getHome } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { TrendingUp } from 'lucide-react-native';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useAuth } from '../context/AuthContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

export default function LeaderHome() {
  const Toast = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeData, setHomeData] = useState<any>(null);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const data = await getHome();
      setHomeData(data);
    } catch (error: any) {
      Toast.show(getErrorMessage(error), {
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Action Buttons */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/create-stream')}
            className="flex-1 items-center justify-center gap-3 rounded-xl bg-[#252525] p-6 shadow-lg">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#252525]">
              <MaterialIcons name="podcasts" size={32} color="#ffffff" />
            </View>
            <Text className="font-bold text-white">Start Live Stream</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/new-post')}
            className="flex-1 items-center justify-center gap-3 rounded-xl bg-[#252525] p-6 shadow-lg">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-[#252525]">
              <MaterialIcons name="add-box" size={32} color="#ffffff" />
            </View>
            <Text className="font-bold text-white">Create Post</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-black dark:text-white">Quick Stats</Text>
          <View className="flex-row gap-4">
            <View className="flex-1 items-center rounded-xl bg-[#252525] p-4">
              <Text className="text-2xl font-bold text-white">1.2K</Text>
              <Text className="text-sm text-white/50">Followers</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-[#252525] p-4">
              <Text className="text-2xl font-bold text-white">8</Text>
              <Text className="text-sm text-white/50">Live Streams</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-20 mt-8">
          <Text className="mb-4 text-xl font-bold text-black dark:text-white">Recent Activity</Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-4 rounded-xl bg-[#252525] p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#252525]">
                <MaterialIcons name="thumb-up" size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-white">
                  New like on your post "Community Meetup"
                </Text>
                <Text className="text-sm text-white/50">2 minutes ago</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 rounded-xl bg-[#252525] p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#252525]">
                <MaterialIcons name="comment" size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-white">New comment on your live stream</Text>
                <Text className="text-sm text-white/50">1 hour ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
