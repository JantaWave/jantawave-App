import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const notifications = [
    {
      id: 1,
      user: 'Alice',
      avatar: 'https://i.pravatar.cc/150?img=1',
      message: 'mentioned you in her stream: "Check out this amazing view! 🌅"',
      time: '2 minutes ago',
      unread: true,
      hasStatus: true,
    },
    {
      id: 2,
      user: 'Bob',
      avatar: 'https://i.pravatar.cc/150?img=2',
      message: 'started a new stream. "Let\'s play some games! 🎮"',
      time: '15 minutes ago',
      unread: false,
    },
  ];

  const filtered = notifications.filter((n) => (activeTab === 'unread' ? n.unread : n));

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#101c22]' : 'bg-[#f6f7f8]'}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-300 px-5 py-4 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={28} color={isDark ? '#fff' : '#1f2937'} />
        </TouchableOpacity>

        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>
          Notifications
        </Text>

        <View className="w-6" />
      </View>

      {/* Tabs */}
      <View className="flex-row gap-2 p-4">
        {['all', 'unread'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 rounded-full border px-4 py-2 ${
              activeTab === tab
                ? 'border-[#13a4ec] bg-[#13a4ec]/10'
                : isDark
                  ? 'border-gray-700 bg-[#1a2831]'
                  : 'border-gray-300 bg-white'
            }`}>
            <Text
              className={`text-center text-sm font-medium ${
                activeTab === tab ? 'text-[#13a4ec]' : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications List */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>
        {filtered.map((n) => (
          <TouchableOpacity
            key={n.id}
            className={`mb-3 flex-row items-start gap-3 rounded-lg p-3 ${
              isDark ? 'bg-[#1a2831]' : 'bg-white'
            }`}
            activeOpacity={0.8}>
            <View className="relative">
              <Image source={{ uri: n.avatar }} className="h-12 w-12 rounded-full" />
              {n.hasStatus && (
                <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1a2831] bg-red-500" />
              )}
            </View>

            <View className="flex-1">
              <Text className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Text className="font-bold">{n.user}</Text> {n.message}
              </Text>
              <Text className="mt-1 text-xs text-gray-400">{n.time}</Text>
            </View>

            {n.unread && <View className="mt-2 h-2 w-2 rounded-full bg-[#13a4ec]" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
