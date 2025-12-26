import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { getUserProfileStats } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { TrendingUp } from 'lucide-react-native';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { formatCount } from '../utils/formatters';

export default function LeaderHome() {
  const Toast = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeData, setHomeData] = useState<any>(null);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const data = await getUserProfileStats();
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
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <ScrollView
        className="flex-1 p-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Action Buttons */}
        <View className="flex-row gap-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/create-stream')}
            className="flex-1 items-center justify-center gap-3 rounded-xl  border border-border-light bg-surface-light p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <MaterialIcons name="podcasts" size={32} color={colors.primary} />
            </View>
            <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">
              Start Live Stream
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/new-post')}
            className="flex-1 items-center justify-center gap-3 rounded-xl  border border-border-light bg-surface-light p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <MaterialIcons name="add-box" size={32} color="#10b981" />
            </View>
            <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">
              Create Post
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            Quick Stats
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* Card 1 */}
            <View className="w-[48%] flex-grow items-center rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-2xl font-bold text-primary">
                {formatCount(homeData?.followers_count)}
              </Text>
              <Text className="text-secondary-light text-sm dark:text-text-secondary-dark">
                Followers
              </Text>
            </View>

            {/* Card 2 */}
            <View className="w-[48%] flex-grow items-center rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-2xl font-bold text-primary">
                {formatCount(homeData?.following_count)}
              </Text>
              <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Followings
              </Text>
            </View>

            {/* Card 3 */}
            <View className="w-[48%] flex-grow items-center rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-2xl font-bold text-primary">
                {formatCount(homeData?.streams_count)}
              </Text>
              <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Live Streams
              </Text>
            </View>

            {/* Card 4 */}
            <View className="w-[48%] flex-grow items-center rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <Text className="text-2xl font-bold text-primary">
                {formatCount(homeData?.posts_count)}
              </Text>
              <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Posts
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-20 mt-8">
          <Text className="mb-4 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            Recent Activity
          </Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-4 rounded-xl  border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <MaterialIcons name="thumb-up" size={24} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  New like on your post "Community Meetup"
                </Text>
                <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  2 minutes ago
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 rounded-xl  border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <MaterialIcons name="comment" size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  New comment on your live stream
                </Text>
                <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                  1 hour ago
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
