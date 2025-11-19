// components/ChatItem.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Chat } from '../../api/chatData';
import { formatRelative } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  chat: Chat;
  onPress?: (chat: Chat) => void;
};

export default function ChatItem({ chat, onPress }: Props) {
  const lastAt = chat.lastMessageAt ? new Date(chat.lastMessageAt) : undefined;
  const timeText = lastAt ? formatRelative(lastAt, new Date()) : '';

  const initials = chat.leaderName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(chat)}
      activeOpacity={0.8}
      accessibilityRole="button"
      className="flex-row items-center gap-4 rounded-xl bg-gray-50 p-4 dark:bg-[#252525]">
      {/* Avatar */}
      {chat.leaderAvatar ? (
        <Image source={{ uri: chat.leaderAvatar }} className="h-12 w-12 rounded-full" />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-500">
          <Text className="font-bold text-white">{initials}</Text>
        </View>
      )}

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-bold text-black dark:text-white">
            {chat.leaderName} (village_name)
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{timeText}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            numberOfLines={1}
            className="text-sm text-gray-700 dark:text-gray-300"
            ellipsizeMode="tail">
            {chat.lastMessage ?? ''}
          </Text>

          <View className="ml-2">
            {chat.unreadCount && chat.unreadCount > 0 ? (
              <View className="min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-2">
                <Text className="text-xs font-bold text-white">{chat.unreadCount}</Text>
              </View>
            ) : chat.leaderOnline ? (
              <View className="h-3 w-3 rounded-full bg-green-400" />
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
