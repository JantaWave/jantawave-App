// components/MessageBubble.tsx
import React from 'react';
import { View, Text, useColorScheme } from 'react-native';

interface MessageBubbleProps {
  text: string;
  time: string;
  isOwn: boolean;
}

export default function MessageBubble({ text, time, isOwn }: MessageBubbleProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className={`mb-3 max-w-[80%] ${isOwn ? 'items-end self-end' : 'items-start self-start'}`}>
      <View
        className={`rounded-2xl p-3 ${
          isOwn
            ? 'rounded-br-none bg-blue-500'
            : isDark
              ? 'rounded-bl-none bg-gray-800'
              : 'rounded-bl-none bg-gray-200'
        }`}>
        <Text className={`text-sm ${isOwn ? 'text-white' : isDark ? 'text-white' : 'text-black'}`}>
          {text}
        </Text>
        <Text
          className={`mt-1 text-right text-[10px] ${
            isOwn ? 'text-blue-200' : isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
          {time}
        </Text>
      </View>
    </View>
  );
}
