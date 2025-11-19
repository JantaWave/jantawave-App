// screens/ChatWindowScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MessageBubble from './MessageBubble';
import AppHeader from '../Components/AppHeader';
import DUMMY_CHATS, { Message } from '../../api/chatData';

export default function ChatWindowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params.id;
  const isDark = useColorScheme() === 'dark';
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatUser, setChatUser] = useState<{
    name: string;
    village: string;
    online: boolean;
  } | null>(null);

  // Simulated chat data
  useEffect(() => {
    const found = DUMMY_CHATS.find((c) => c.id === chatId);
    if (found) {
      setChatUser({
        name: found.leaderName,
        village: 'Sample Village',
        online: found.leaderOnline,
      });
      setMessages(found.messages);
    }
  }, [chatId]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      chatId: chatId!,
      senderId: 'me',
      text: inputText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setSending(true);
    setTimeout(() => setSending(false), 400);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!chatUser)
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );

  return (
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* ✅ AppHeader - Only pass showBackButton, NO iconName */}
      <AppHeader
        title={`${chatUser.name} (${chatUser.village})`}
        showBackButton
        onBackPress={() => router.back()}
      />

      {/* ✅ Keyboard Avoiding Container */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              time={new Date(item.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              isOwn={item.senderId === 'me'}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          className="flex-1 bg-white dark:bg-[#1a1a1a]"
        />

        {/* ✅ Chat Input Fixed Above Keyboard */}
        <View className="flex-row items-center border-t border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-[#1a1a1a]">
          <TouchableOpacity className="mr-2">
            <MaterialIcons
              name="sentiment-satisfied-alt"
              size={24}
              color={isDark ? '#e5e5e5' : '#9CA3AF'}
            />
          </TouchableOpacity>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 rounded-full bg-gray-100 px-4 py-2 text-gray-900 dark:bg-gray-800 dark:text-white"
            multiline
            maxHeight={100}
            onSubmitEditing={() => {
              handleSend();
              Keyboard.dismiss();
            }}
          />

          <TouchableOpacity className="mx-2">
            <MaterialIcons name="attach-file" size={24} color={isDark ? '#e5e5e5' : '#9CA3AF'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`rounded-full p-2 ${inputText.trim() ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-700'}`}>
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
