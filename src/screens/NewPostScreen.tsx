import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { getPresignedUrl, createPost } from '../api';
import { getVillages } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

export default function NewPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useAppTheme();

  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Village Selection State
  const [availableVillages, setAvailableVillages] = useState<any[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [showVillageList, setShowVillageList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchVillagesData = async () => {
      if (user?.block_id) {
        try {
          const res = await getVillages(user.block_id);
          if (res?.data) {
            setAvailableVillages(res.data);
          }
        } catch (error) {
          console.error('Failed to fetch villages:', error);
        }
      }
    };
    fetchVillagesData();
  }, [user?.block_id]);

  const toggleVillage = (id: string) => {
    setVillages((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const filteredVillages = availableVillages.filter((v) =>
    v.village_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    const itemsToToggle = searchQuery ? filteredVillages : availableVillages;
    const allIds = itemsToToggle.map((v) => v.village_id.toString());
    const allSelected = allIds.every((id) => villages.includes(id));

    if (allSelected) {
      setVillages(villages.filter((id) => !allIds.includes(id)));
    } else {
      const newSelection = [...new Set([...villages, ...allIds])];
      setVillages(newSelection);
    }
  };

  const handlePickMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.5,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const MAX_SIZE = 16 * 1024 * 1024; // 16 MB

        if (asset.fileSize && asset.fileSize > MAX_SIZE) {
          Alert.alert('File Too Large', 'Please upload a file smaller than 16 MB.');
          return;
        }

        const type = asset.type === 'video' ? 'video' : 'image';
        await uploadToR2(asset.uri, type);
      }
    } catch (e) {
      console.error('Pick Media Error:', e);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const uploadToR2 = async (uri: string, type: 'image' | 'video') => {
    try {
      setUploading(true);

      const extension = uri.split('.').pop()?.toLowerCase();
      let fileType = 'application/octet-stream';
      let fileName = `upload_${Date.now()}`;

      if (type === 'video') {
        fileName += `.${extension || 'mp4'}`;
        fileType = extension === 'mov' ? 'video/quicktime' : 'video/mp4';
      } else {
        fileName += `.${extension || 'jpg'}`;
        fileType = extension === 'png' ? 'image/png' : 'image/jpeg';
      }

      const { uploadUrl, fileUrl } = await getPresignedUrl(fileName, fileType, 'posts');

      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });

      if (uploadResponse.ok) {
        const finalUrl = fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`;
        setMedia(finalUrl);
        setMediaType(type);
      } else {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to upload media. ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !content) return Alert.alert('Missing Fields', 'Please add title and content');
    try {
      await createPost({
        userId: user?.id,
        title,
        content,
        mediaUrl: media,
        mediaType: mediaType || 'image',
        villages: villages,
      });
      Alert.alert('Success', 'Post published successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Error',
        'Failed to create post. ' + (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center justify-between border-b border-border-light px-5 pb-4 dark:border-border-dark">
        <TouchableOpacity onPress={() => router.back()} className="pt-2">
          <MaterialIcons name="close" size={28} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text className="pt-2 text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
          New Post
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}>
        {/* Title Input */}
        <TextInput
          placeholder="Post Title"
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          value={title}
          onChangeText={setTitle}
          className="mb-4 rounded-lg bg-surface-light px-4 py-3 text-base text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark"
        />

        {/* Content Input */}
        <TextInput
          placeholder="Write your post here..."
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          className="mb-6 rounded-lg bg-surface-light px-4 py-3 text-base text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark"
        />

        {/* Media Preview */}
        {media && (
          <View className="relative mb-6 h-48 w-full overflow-hidden rounded-lg bg-gray-200">
            {mediaType === 'video' ? (
              <Video
                source={{ uri: media }}
                style={{ width: '100%', height: '100%' }}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
            ) : (
              <Image source={{ uri: media }} className="h-full w-full" resizeMode="cover" />
            )}

            <TouchableOpacity
              onPress={() => {
                setMedia(null);
                setMediaType(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1">
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Add Media Button */}
        {!media && (
          <>
            <Text className="mb-2 text-base font-bold text-text-primary-light dark:text-text-primary-dark">
              Add Media
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickMedia}
              disabled={uploading}
              className="flex-row items-center gap-4 rounded-lg bg-surface-light p-3 dark:bg-surface-dark">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {uploading ? (
                  <ActivityIndicator color="#2196F3" size="small" />
                ) : (
                  <MaterialIcons name="add-a-photo" size={24} color="#2196F3" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
                  {uploading ? 'Uploading...' : 'Photo / Video'}
                </Text>
                <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Max size 16MB
                </Text>
              </View>
              <MaterialIcons
                name="arrow-forward-ios"
                size={16}
                color={isDark ? '#94a3b8' : '#64748b'}
              />
            </TouchableOpacity>
          </>
        )}

        {/* Village Selection */}
        <View className="my-6">
          <Text className="mb-2 text-base font-bold text-text-primary-light dark:text-text-primary-dark">
            Target Villages
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowVillageList(!showVillageList)}
            className="flex-row items-center gap-4 rounded-lg bg-surface-light p-3 dark:bg-surface-dark">
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MaterialIcons name="location-pin" size={24} color="#2196F3" />
            </View>
            <View className="flex-1">
              <Text className="text-base text-text-primary-light dark:text-text-primary-dark">
                Select Villages
              </Text>
              {villages.length > 0 && (
                <Text className="text-xs text-primary">{villages.length} selected</Text>
              )}
            </View>
            <MaterialIcons
              name={showVillageList ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={isDark ? '#94a3b8' : '#64748b'}
            />
          </TouchableOpacity>

          {/* Expandable Village List */}
          {showVillageList && (
            <View className="mt-2 overflow-hidden rounded-lg border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
              {/* Search Bar */}
              <View className="px-4 py-3 pb-2">
                <View className="flex-row items-center rounded-lg border border-border-light bg-background-light px-3 py-2 dark:border-border-dark dark:bg-background-dark">
                  <Feather name="search" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  <TextInput
                    placeholder="Search Villages..."
                    placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="ml-2 flex-1 text-sm text-text-primary-light dark:text-text-primary-dark"
                  />
                </View>
              </View>

              {/* Select All/Visible Button */}
              <View className="flex-row items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
                <Text className="font-medium text-text-secondary-light dark:text-text-secondary-dark">
                  {searchQuery ? 'Filtered Villages' : 'Available Villages'}
                </Text>
                <TouchableOpacity onPress={handleSelectAll}>
                  <Text className="text-sm font-bold text-primary">
                    {(searchQuery ? filteredVillages : availableVillages).every((v) =>
                      villages.includes(v.village_id.toString())
                    )
                      ? 'Deselect'
                      : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Village List */}
              {filteredVillages.length > 0 ? (
                filteredVillages.map((v) => {
                  const isSelected = villages.includes(v.village_id.toString());
                  return (
                    <TouchableOpacity
                      key={v.village_id}
                      onPress={() => toggleVillage(v.village_id.toString())}
                      className="flex-row items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? 'text-primary'
                            : 'text-text-primary-light dark:text-text-primary-dark'
                        }`}>
                        {v.village_name}
                      </Text>
                      <MaterialIcons
                        name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={isSelected ? '#2196F3' : isDark ? '#94a3b8' : '#64748b'}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="p-4">
                  <Text className="text-center text-text-secondary-light dark:text-text-secondary-dark">
                    {searchQuery ? 'No villages found.' : 'No villages found in your block.'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* WhatsApp Notification Toggle */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between rounded-lg bg-surface-light p-4 dark:bg-surface-dark">
            <View className="flex-row items-center gap-3">
              <Feather name="message-circle" size={20} color="#25D366" />
              <View>
                <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
                  WhatsApp Alert
                </Text>
                <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  Notify users immediately
                </Text>
              </View>
            </View>
            <Switch
              value={notifyOnWhatsApp}
              onValueChange={setNotifyOnWhatsApp}
              thumbColor="#ffffff"
              trackColor={{ true: '#25D366', false: isDark ? '#262626' : '#e2e8f0' }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Publish Button */}
      <View
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }}
        className="absolute bottom-0 w-full border-t border-border-light bg-surface-light px-5 pt-3 dark:border-border-dark dark:bg-surface-dark">
        <TouchableOpacity
          onPress={handlePublish}
          disabled={uploading || !media}
          className={`w-full rounded-xl py-4 ${
            uploading || !media
              ? 'bg-text-secondary-light dark:bg-text-secondary-dark'
              : 'bg-primary'
          }`}>
          <Text className="text-center text-base font-bold text-white">
            {uploading ? 'Uploading...' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
