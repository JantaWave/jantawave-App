import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useColorScheme,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function NewPostScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(false);
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-[#101c22]' : 'bg-[#f6f7f8]'}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-300 px-5 py-4 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={28} color={isDark ? '#fff' : '#1f2937'} />
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>
          New Post
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Title Input */}
        <TextInput
          placeholder="Post Title"
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          className={`mb-4 rounded-lg px-4 py-3 text-base ${
            isDark ? 'bg-[#1a2831] text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        {/* Content Input */}
        <TextInput
          placeholder="Write your post here..."
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          multiline
          numberOfLines={6}
          className={`mb-6 rounded-lg px-4 py-3 text-base ${
            isDark ? 'bg-[#1a2831] text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        {/* Add Media */}
        <Text className={`mb-2 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Add Media
        </Text>

        <View className="gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            className={`flex-row items-center gap-4 rounded-lg p-3 ${
              isDark ? 'bg-[#1a2831]' : 'bg-white'
            }`}>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#13a4ec]/10">
              <MaterialIcons name="image" size={24} color="#13a4ec" />
            </View>
            <Text className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Upload Image
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            className={`flex-row items-center gap-4 rounded-lg p-3 ${
              isDark ? 'bg-[#1a2831]' : 'bg-white'
            }`}>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#13a4ec]/10">
              <MaterialIcons name="video-library" size={24} color="#13a4ec" />
            </View>
            <Text className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Upload Video
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Target Villages */}
        <View className="mt-6">
          <Text className={`mb-2 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Target Villages
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className={`flex-row items-center gap-4 rounded-lg p-3 ${
              isDark ? 'bg-[#1a2831]' : 'bg-white'
            }`}>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#13a4ec]/10">
              <MaterialIcons name="location-pin" size={24} color="#13a4ec" />
            </View>
            <Text className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Select Villages
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <View className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Feather name="share-2" size={18} color="#25D366" />
              <Text className="text-lg font-medium text-slate-700 dark:text-slate-300">
                Notify on WhatsApp
              </Text>
            </View>

            <Switch
              value={notifyOnWhatsApp}
              onValueChange={setNotifyOnWhatsApp}
              thumbColor={notifyOnWhatsApp ? '#ffffff' : '#e5e5e5'}
              trackColor={{ true: '#25D366', false: '#888888' }}
            />
          </View>

          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {notifyOnWhatsApp
              ? 'Users will receive updates on WhatsApp.'
              : 'WhatsApp notifications are disabled.'}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        className={`absolute bottom-0 w-full border-t px-5 py-4 ${
          isDark ? 'border-gray-700 bg-[#101c22]' : 'border-gray-200 bg-[#f6f7f8]'
        }`}>
        <TouchableOpacity className="w-full rounded-xl bg-[#13a4ec] py-4">
          <Text className="text-center text-base font-bold text-white">Publish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
