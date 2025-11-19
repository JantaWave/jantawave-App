import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import ChatItem from './ChatItem';
import DUMMY_CHATS, { Chat } from '../../api/chatData';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppHeader from '../Components/AppHeader'; // ✅ Correct import

export default function ChatListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Dummy chat data (replace with API later)
  const chats = DUMMY_CHATS;

  const filtered = useMemo(() => {
    let arr = chats.slice();
    if (filter === 'unread') {
      arr = arr.filter((c) => (c.unreadCount ?? 0) > 0);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.leaderName.toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q)
      );
    }
    // Sort latest messages first
    arr.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
    return arr;
  }, [chats, filter, query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Replace with actual API refresh
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  const openChat = (chat: Chat) => {
    router.push({ pathname: '/chat/[id]', params: { id: chat.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* ✅ Reusable AppHeader */}
      <AppHeader
        title="Chats"
        iconName="chat"
        rightIconName="add"
        onRightPress={() => console.log('New Chat Coming Soon')}
      />

      <View className="flex-1 px-4 pt-4">
        {/* 🔍 Search Bar */}
        <View className="relative mb-5">
          <TextInput
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            className="w-full rounded-lg bg-black/5 py-3 pl-10 pr-4 text-sm text-black dark:bg-white/5 dark:text-white"
            accessibilityLabel="Search chats"
          />
          <View className="absolute left-3 top-3">
            <MaterialIcons name="search" size={18} color="#9CA3AF" />
          </View>
        </View>

        {/* 🔹 Filter Chips */}
        <View className="mb-4 flex-row space-x-3 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
          ].map((c) => (
            <TouchableOpacity
              key={c.key}
              onPress={() => setFilter(c.key as any)}
              activeOpacity={0.8}
              className={`mx-1 rounded-full px-4 py-2 ${
                filter === c.key ? 'bg-blue-500' : 'bg-gray-200 dark:bg-[#2a2a2a]'
              }`}>
              <Text
                className={`${
                  filter === c.key ? 'text-white' : 'text-gray-800 dark:text-white'
                } font-medium`}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 💬 Chat List */}
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <ChatItem chat={item} onPress={openChat} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-16">
              <MaterialIcons name="chat-bubble-outline" size={40} color="#9CA3AF" />
              <Text className="mt-3 text-gray-500 dark:text-gray-400">No conversations yet</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
