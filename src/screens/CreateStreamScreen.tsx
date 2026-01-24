import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Switch,
  ScrollView,
  Alert,
  Share,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { setupLive, getPresignedUrl } from '../api';
import { getVillages } from '../api/auth';
import { useAppTheme } from '../context/ThemeContext';
import AppHeader from './Components/AppHeader';

type PlatformKey = 'instagram' | 'facebook' | 'youtube';

export default function CreateStreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useAppTheme();

  // --- STATE ---
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [goLiveNow, setGoLiveNow] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(false);

  // Village Logic
  const [availableVillages, setAvailableVillages] = useState<any[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [showVillageList, setShowVillageList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [platforms, setPlatforms] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    facebook: false,
    youtube: true,
  });

  // --- LOGIC ---
  useEffect(() => {
    const fetchVillagesData = async () => {
      if (user?.block_id) {
        try {
          const res = await getVillages(user.block_id);
          if (res?.data) setAvailableVillages(res.data);
        } catch (error) {
          console.error('Failed to fetch villages:', error);
        }
      }
    };
    fetchVillagesData();
  }, [user?.block_id]);

  const uploadToR2 = async (uri: string) => {
    try {
      setUploading(true);
      const fileName = uri.split('/').pop() || 'image.jpg';
      const fileType = 'image/jpeg'; // Always use JPEG after compression
      const { uploadUrl, fileUrl } = await getPresignedUrl(fileName, fileType, 'thumbnail');

      const response = await fetch(uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });

      if (uploadResponse.ok) {
        const finalUrl = fileUrl.startsWith('http') ? fileUrl : `https://${fileUrl}`;
        setThumbnail(finalUrl);
      } else {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to upload image. ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePickThumbnail = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload thumbnails.'
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Landscape mode aspect ratio
        quality: 1,
        // iOS specific options for better editing UI
        ...(Platform.OS === 'ios' && {
          presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        }),
      });

      if (!res.canceled && res.assets?.[0]) {
        setUploading(true);
        const asset = res.assets[0];

        // Get image dimensions
        const { width, height } = asset;

        // Calculate landscape dimensions (16:9 aspect ratio)
        let targetWidth = 1920;
        let targetHeight = 1080;

        // If image is smaller, maintain aspect ratio but don't upscale
        if (width < targetWidth || height < targetHeight) {
          const aspectRatio = 16 / 9;
          if (width / height > aspectRatio) {
            targetWidth = width;
            targetHeight = Math.round(width / aspectRatio);
          } else {
            targetHeight = height;
            targetWidth = Math.round(height * aspectRatio);
          }
        }

        // Compress and resize image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            {
              resize: {
                width: targetWidth,
                height: targetHeight,
              },
            },
          ],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        await uploadToR2(manipulatedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to process image. ' + error.message);
      setUploading(false);
    }
  };
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

  const handleCreate = async () => {
    try {
      if (!thumbnail) return Alert.alert('Missing Thumbnail', 'Please upload a thumbnail.');
      if (!title.trim()) return Alert.alert('Error', 'Title is required');
      if (!content.trim()) return Alert.alert('Error', 'Description is required');

      const now = new Date();
      if (!goLiveNow && date <= now)
        return Alert.alert('Invalid Date', 'Stream date must be in the future');
      if (!platforms.youtube)
        return Alert.alert('Platform Required', 'Enable YouTube to start livestream');

      const streamDate = goLiveNow ? new Date() : date;
      const payload = {
        userId: user.id,
        title: title,
        youtube: platforms.youtube ? 'true' : undefined,
        bannerText: content,
        logoUrl: thumbnail,
        ticker: 'Live Now',
        description: content,
        scheduledStartTime: streamDate.toISOString(),
      };

      setLoading(true);
      const response = await setupLive(payload);
      setLoading(false);

      if (!response || !response.sessionId) return Alert.alert('Error', 'Failed to create session');

      if (goLiveNow) {
        router.push({ pathname: '/start-stream', params: { sessionId: response.sessionId } });
      } else {
        Alert.alert('Success!', 'Stream scheduled successfully!', [
          { text: 'Share Link', onPress: () => shareStream(response.shareUrls, title) },
          { text: 'Go to Activities', onPress: () => router.replace('/(tabs)/activity') },
        ]);
      }
    } catch (error: any) {
      setLoading(false);
      console.log('Stream Setup Error:', error.response?.data);

      // ✅ FIX: Improved Error Extraction to catch "YouTube not connected"
      const serverError =
        error.response?.data?.message || // 1. Most common API error field
        error.response?.data?.error || // 2. Your specific fallback
        (typeof error.response?.data === 'string' ? error.response?.data : null) || // 3. Raw string response
        error.message || // 4. Axios error message
        'An unknown error occurred';

      Alert.alert('Setup Failed', serverError);
    }
  };

  const shareStream = async (urls: any, streamTitle: string) => {
    if (!urls?.youtube) return;
    try {
      await Share.share({
        message: `Join my upcoming stream: "${streamTitle}"! \n${urls.youtube}`,
      });
      router.replace('/(tabs)/activity');
    } catch (error) {
      console.log(error);
    }
  };

  const onChangeDate = (e: any, d?: Date) => {
    setShowDatePicker(false);
    if (d) {
      const n = new Date(d);
      n.setHours(date.getHours(), date.getMinutes());
      setDate(n);
    }
  };
  const onChangeTime = (e: any, t?: Date) => {
    setShowTimePicker(false);
    if (t) {
      const n = new Date(date);
      n.setHours(t.getHours(), t.getMinutes());
      setDate(n);
    }
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        {/* Header */}
        <AppHeader title="New Stream" showBackButton onBackPress={() => router.back()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
          className="p-5">
          {/* 1. Thumbnail Section */}
          <View className="mb-6">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
              Thumbnail (Landscape)
            </Text>
            <TouchableOpacity
              onPress={handlePickThumbnail}
              disabled={uploading}
              className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
              {uploading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text className="mt-3 font-medium text-text-secondary-light dark:text-text-secondary-dark">
                    Processing...
                  </Text>
                </View>
              ) : thumbnail ? (
                <View className="relative h-full w-full">
                  {/* Image Container - Separate from buttons */}
                  <ImageBackground
                    source={{ uri: thumbnail }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />

                  {/* Overlay with Edit Button - Positioned away from crop controls */}
                  <View className="absolute inset-0 items-center justify-center bg-black/20">
                    <View className="items-center justify-center rounded-full bg-black/60 p-4">
                      <Feather name="edit-2" size={28} color="#fff" />
                      <Text className="mt-2 text-xs font-semibold text-white">Tap to Change</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-1 items-center justify-center opacity-70">
                  <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surfaceHighlight-light dark:bg-surfaceHighlight-dark">
                    <Feather name="image" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                  </View>
                  <Text className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Upload Landscape Cover
                  </Text>
                  <Text className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    16:9 ratio • JPG up to 5MB
                  </Text>
                  <Text className="mt-1 text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
                    Image will be compressed automatically
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            {thumbnail && (
              <View className="mt-2 flex-row items-center rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                <Feather name="info" size={14} color="#2196F3" />
                <Text className="ml-2 text-xs text-blue-700 dark:text-blue-300">
                  Optimized for landscape streaming (1920x1080)
                </Text>
              </View>
            )}
          </View>
          {/* 2. Stream Details Card */}
          <View className="mb-6 rounded-2xl border border-border-light bg-surface-light p-4 shadow-sm shadow-gray-200 dark:border-border-dark dark:bg-surface-dark dark:shadow-none">
            {/* Title */}
            <View className="mb-5">
              <Text className="mb-2 text-xs font-bold uppercase text-text-primary-light dark:text-text-primary-dark">
                Stream Title
              </Text>
              <TextInput
                className="rounded-xl border border-border-light bg-background-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark"
                placeholder="e.g. Village Council Meeting"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View>
              <Text className="mb-2 text-xs font-bold uppercase text-text-primary-light dark:text-text-primary-dark">
                Description
              </Text>
              <TextInput
                className="min-h-[100px] rounded-xl border border-border-light bg-background-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark"
                placeholder="What is this stream about?"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
          {/* 3. Schedule Section */}
          <View className="mb-6 rounded-2xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <Feather name="radio" size={16} color="#ef4444" />
                </View>
                <Text className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
                  Go Live Immediately
                </Text>
              </View>
              <Switch
                value={goLiveNow}
                onValueChange={setGoLiveNow}
                trackColor={{ true: '#2196F3', false: isDark ? '#262626' : '#e2e8f0' }}
                thumbColor="#ffffff"
              />
            </View>

            {!goLiveNow && (
              <View className="border-t border-dashed border-border-light pt-4 dark:border-border-dark">
                <Text className="mb-3 text-xs font-bold uppercase text-text-primary-light dark:text-text-primary-dark">
                  Schedule Start Time
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="flex-1 flex-row items-center rounded-xl border border-border-light bg-surfaceHighlight-light px-3 py-3 dark:border-border-dark dark:bg-surfaceHighlight-dark">
                    <Feather name="calendar" size={18} color="#2196F3" />
                    <Text className="ml-2 font-medium text-text-primary-light dark:text-text-primary-dark">
                      {date.toDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="flex-1 flex-row items-center rounded-xl border border-border-light bg-surfaceHighlight-light px-3 py-3 dark:border-border-dark dark:bg-surfaceHighlight-dark">
                    <Feather name="clock" size={18} color="#2196F3" />
                    <Text className="ml-2 font-medium text-text-primary-light dark:text-text-primary-dark">
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={onChangeDate}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker value={date} mode="time" onChange={onChangeTime} />
                )}
              </View>
            )}
          </View>
          {/* 4. Villages Selector */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
              Audience
            </Text>
            <View className="overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
              <TouchableOpacity
                onPress={() => setShowVillageList(!showVillageList)}
                className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MaterialIcons name="location-on" size={22} color="#2196F3" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-text-primary-light dark:text-text-primary-dark">
                      Select Villages
                    </Text>
                    <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                      {villages.length === 0
                        ? 'No villages selected'
                        : `${villages.length} villages selected`}
                    </Text>
                  </View>
                </View>
                <Feather
                  name={showVillageList ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={isDark ? '#94a3b8' : '#64748b'}
                />
              </TouchableOpacity>

              {showVillageList && (
                <View className="border-t border-border-light dark:border-border-dark">
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

                  {/* Select All Row */}
                  <TouchableOpacity
                    onPress={handleSelectAll}
                    className="flex-row items-center justify-between border-t border-border-light p-3 px-4 dark:border-border-dark">
                    <Text className="font-medium text-text-secondary-light dark:text-text-secondary-dark">
                      {searchQuery ? 'Select Visible' : 'Select All'}
                    </Text>
                    <Text className="font-bold text-primary">
                      {(searchQuery ? filteredVillages : availableVillages).every((v) =>
                        villages.includes(v.village_id.toString())
                      )
                        ? 'Deselect'
                        : 'Select'}
                    </Text>
                  </TouchableOpacity>

                  {/* List of Filtered Villages */}
                  {filteredVillages.length > 0 ? (
                    filteredVillages.map((v) => {
                      const isSelected = villages.includes(v.village_id.toString());
                      return (
                        <TouchableOpacity
                          key={v.village_id}
                          onPress={() => toggleVillage(v.village_id.toString())}
                          className="flex-row items-center justify-between border-t border-border-light px-4 py-3 dark:border-border-dark">
                          <Text
                            className={`font-medium ${
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
                    <View className="border-t border-border-light p-4 dark:border-border-dark">
                      <Text className="text-center text-text-secondary-light dark:text-text-secondary-dark">
                        No villages found.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
          {/* 5. Platforms & Notification */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
              Broadcasting
            </Text>
            <View className="divide-y rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
              {/* YouTube */}
              <View className="flex-row items-center justify-between border-b border-border-light p-4 dark:border-border-dark">
                <View className="flex-row items-center gap-3">
                  <Feather name="youtube" size={20} color="#FF0000" />
                  <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
                    YouTube Live
                  </Text>
                </View>
                <Switch
                  value={platforms.youtube}
                  onValueChange={(v) => setPlatforms({ ...platforms, youtube: v })}
                  trackColor={{ true: '#2196F3', false: isDark ? '#262626' : '#e2e8f0' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Facebook - DISABLED */}
              <View className="flex-row items-center justify-between border-b border-border-light p-4 opacity-50 dark:border-border-dark">
                <View className="flex-row items-center gap-3">
                  <Feather name="facebook" size={20} color={isDark ? '#f8fafc' : '#0f172a'} />
                  <View>
                    <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
                      Facebook Live
                    </Text>
                  </View>
                </View>
                <View className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-700">
                  <Text className="text-[10px] font-bold text-gray-500 dark:text-gray-300">
                    COMING SOON
                  </Text>
                </View>
              </View>

              {/* Instagram - DISABLED */}
              <View className="flex-row items-center justify-between border-b border-border-light p-4 opacity-50 dark:border-border-dark">
                <View className="flex-row items-center gap-3">
                  <Feather name="instagram" size={20} color={isDark ? '#f8fafc' : '#0f172a'} />
                  <View>
                    <Text className="text-base font-medium text-text-primary-light dark:text-text-primary-dark">
                      Instagram Live
                    </Text>
                  </View>
                </View>
                <View className="rounded bg-gray-200 px-2 py-1 dark:bg-gray-700">
                  <Text className="text-[10px] font-bold text-gray-500 dark:text-gray-300">
                    COMING SOON
                  </Text>
                </View>
              </View>

              {/* WhatsApp */}
              <View className="flex-row items-center justify-between p-4">
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
                  trackColor={{ true: '#25D366', false: isDark ? '#262626' : '#e2e8f0' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }}
          className="absolute bottom-0 w-full border-t border-border-light bg-surface-light px-5 pt-4 shadow-lg dark:border-border-dark dark:bg-surface-dark">
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading || uploading}
            className={`w-full flex-row items-center justify-center rounded-xl py-4 ${
              loading || uploading
                ? 'bg-text-secondary-light dark:bg-text-secondary-dark'
                : 'bg-primary'
            }`}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-center text-base font-bold tracking-wide text-white">
                {goLiveNow ? 'Start Live Stream' : 'Schedule Stream'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
