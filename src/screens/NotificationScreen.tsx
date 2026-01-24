import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  useColorScheme,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from 'react-native-toast-notifications';
import { getErrorMessage } from '../utils/getErrorMessage';

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notifications';

export default function NotificationsScreen() {
  const Toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getMyNotifications({ limit: 50, offset: 0 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      Toast.show(getErrorMessage(err), { type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredData = notifications.filter((n) => (activeTab === 'unread' ? !n.is_read : true));

  const NotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="mb-3 flex-row items-start gap-3 rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark"
      activeOpacity={0.7}
      onPress={async () => {
        // ✅ mark read
        if (!item.is_read) {
          await markNotificationRead(item.id);
          await fetchNotifications();
        }

        // ✅ you can navigate based on item.data.screen
        // if (item.data?.screen) router.push(item.data.screen);
      }}>
      <View className="flex-1">
        <Text className="text-[14px] font-bold text-text-primary-light dark:text-text-primary-dark">
          {item.title}
        </Text>
        <Text className="mt-1 text-[13px] text-text-secondary-light dark:text-text-secondary-dark">
          {item.body}
        </Text>
      </View>

      {!item.is_read && <View className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View
        className="flex-row items-center justify-between border-b border-border-light bg-background-light px-5 pb-4 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={26} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
          Notifications
        </Text>

        <TouchableOpacity
          onPress={async () => {
            await markAllNotificationsRead();
            await fetchNotifications();
            Toast.show('All marked as read', { type: 'success' });
          }}>
          <Text className="text-sm font-semibold text-primary">Read All</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 px-5 py-4">
        {['all', 'unread'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab as any)}
            className={`flex-1 rounded-xl border py-2.5 ${
              activeTab === tab
                ? 'border-primary bg-primary'
                : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
            }`}>
            <Text
              className={`text-center text-sm font-semibold ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-text-secondary-light dark:text-text-secondary-dark'
              }`}>
              {tab === 'unread' ? `Unread (${unreadCount})` : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationItem item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          }}
          ListEmptyComponent={() => (
            <View className="mt-20 items-center justify-center">
              <MaterialIcons
                name="notifications-none"
                size={40}
                color={isDark ? '#4b5563' : '#9ca3af'}
              />
              <Text className="mt-3 text-lg font-medium text-text-secondary-light dark:text-text-secondary-dark">
                No {activeTab === 'unread' ? 'unread ' : ''}notifications
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
