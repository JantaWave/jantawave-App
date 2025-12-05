import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useColorScheme,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getPresignedUrl, createPost } from '../api';
import { useAuth } from '../context/AuthContext';

export default function NewPostScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(false);
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const [media, setMedia] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 1. Pick Image
  const handlePickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        await uploadToR2(asset.uri);
      }
    } catch (e) {
      console.error('Pick Image Error:', e);
    }
  };

  // 2. Upload Logic
  const uploadToR2 = async (uri: string) => {
    try {
      setUploading(true);

      const fileName = uri.split('/').pop() || 'image.jpg';
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

      console.log('Getting URL...');
      const { uploadUrl, fileUrl } = await getPresignedUrl(fileName, fileType);
      console.log('Got URL:', uploadUrl);

      // ✅ Modern API using fetch
      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType,
        },
        body: blob,
      });

      if (uploadResponse.ok) {
        const finalUrl = fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`;
        setMedia(finalUrl);
        console.log('Upload Successful:', finalUrl);
      } else {
        console.error('Upload Failed:', uploadResponse.status);
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload image. ' + error.message);
    } finally {
      setUploading(false);
    }
  };
  const handlePublish = async () => {
    if (!title || !content) return Alert.alert('Missing Fields', 'Please add title and content');

    try {
      console.log('Publishing Post...');

      await createPost({
        userId: user?.id, // Ensure user ID is passed
        title,
        content,
        mediaUrl: media,
        mediaType: 'image', // You can detect video vs image from file extension if needed
        villages: [], // Add logic to collect selected villages if implemented
      });

      Alert.alert('Success', 'Post published successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Publish Error:', error);
      Alert.alert(
        'Error',
        'Failed to create post. ' + (error.response?.data?.message || error.message)
      );
    }
  };

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
        {/* Inputs */}
        <TextInput
          placeholder="Post Title"
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={title}
          onChangeText={setTitle}
          className={`mb-4 rounded-lg px-4 py-3 text-base ${
            isDark ? 'bg-[#1a2831] text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        <TextInput
          placeholder="Write your post here..."
          placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          className={`mb-6 rounded-lg px-4 py-3 text-base ${
            isDark ? 'bg-[#1a2831] text-white' : 'bg-gray-100 text-gray-900'
          }`}
        />

        {/* Media Preview */}
        {media && (
          <View className="relative mb-6">
            <Image
              source={{ uri: media }}
              className="h-48 w-full rounded-lg bg-gray-200"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => setMedia(null)}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1">
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Media Buttons */}
        {!media && (
          <>
            <Text className={`mb-2 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add Media
            </Text>
            <View className="gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickImage}
                disabled={uploading}
                className={`flex-row items-center gap-4 rounded-lg p-3 ${
                  isDark ? 'bg-[#1a2831]' : 'bg-white'
                }`}>
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#13a4ec]/10">
                  {uploading ? (
                    <ActivityIndicator color="#13a4ec" size="small" />
                  ) : (
                    <MaterialIcons name="image" size={24} color="#13a4ec" />
                  )}
                </View>
                <Text className={`flex-1 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {uploading ? 'Uploading...' : 'Upload Image'}
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
          </>
        )}

        {/* Other Inputs */}
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

        <View className="mb-6 mt-6">
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
        </View>
      </ScrollView>

      {/* Publish Button */}
      <View
        className={`absolute bottom-0 w-full border-t px-5 py-4 ${
          isDark ? 'border-gray-700 bg-[#101c22]' : 'border-gray-200 bg-[#f6f7f8]'
        }`}>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={uploading || !media}
          className={`w-full rounded-xl py-4 ${uploading || !media ? 'bg-gray-400' : 'bg-[#13a4ec]'}`}>
          <Text className="text-center text-base font-bold text-white">
            {uploading ? 'Uploading...' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
