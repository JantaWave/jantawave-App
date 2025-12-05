import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Switch,
  FlatList,
  ScrollView,
  useColorScheme,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { setupLive } from '../api';

type PlatformKey = 'instagram' | 'facebook' | 'youtube';

export default function CreateStreamScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [goLiveNow, setGoLiveNow] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(false);

  const [villages, setVillages] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const [platforms, setPlatforms] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    facebook: false,
    youtube: true,
  });

  const villageList = [
    'Village A',
    'Village B',
    'Village C',
    'Village D',
    'Village E',
    'Village F',
    'Village G',
    'Village H',
    'Village I',
    'Village J',
  ];

  const handlePickThumbnail = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!res.canceled) {
      setThumbnail(res.assets[0].uri);
    }
  };

  const toggleVillage = (name: string) => {
    setVillages((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  const handleSelectAll = () => {
    if (selectAll) setVillages([]);
    else setVillages(villageList);
    setSelectAll(!selectAll);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Preserve the time when updating date
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Preserve the date when updating time
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const handleCreate = async () => {
    try {
      // Validation
      if (!title.trim()) {
        Alert.alert('Error', 'Title is required');
        return;
      }

      if (!content.trim()) {
        Alert.alert('Error', 'Description is required');
        return;
      }

      const now = new Date();
      if (!goLiveNow && date <= now) {
        Alert.alert('Invalid Date', 'Stream date must be in the future');
        return;
      }

      if (!platforms.youtube) {
        Alert.alert('Platform Required', 'Enable YouTube to start livestream');
        return;
      }

      if (platforms.facebook || platforms.instagram) {
        Alert.alert(
          'Not Implemented',
          'Facebook and Instagram have not been implemented yet. Use only YouTube to start stream.'
        );
        return;
      }
      console.log(user.id);
      const streamDate = goLiveNow
        ? new Date(Date.now() + 2 * 60 * 1000) // Now + 2 mins
        : date;

      // Prepare payload
      const payload = {
        userId: user.id,
        title: title,
        youtube: platforms.youtube ? 'true' : undefined,
        facebook: platforms.facebook ? 'true' : undefined,
        instagram: platforms.instagram ? 'true' : undefined,
        bannerText: content,
        logoUrl: thumbnail || '',
        ticker: 'Live Now',
        description: content,
        scheduledStartTime: streamDate.toISOString(),
      };

      setLoading(true);
      const response = await setupLive(payload); // Now returns { sessionId, shareUrls }
      setLoading(false);

      if (!response || !response.sessionId) {
        Alert.alert('Error', 'Failed to create session');
        return;
      }

      // ✅ CHECK: Instant vs Scheduled
      if (goLiveNow) {
        // 1. Instant: Go to Camera immediately
        router.push({
          pathname: '/start-stream',
          params: { sessionId: response.sessionId },
        });
      } else {
        // 2. Scheduled: Show Confirmation & Redirect to Home
        let message = 'Stream scheduled successfully!';

        Alert.alert('Success!', message, [
          {
            text: 'Share Link',
            onPress: () => shareStream(response.shareUrls, title),
          },
          {
            text: 'Go to Activities',
            onPress: () => router.replace('/(tabs)/activity'), // Or your streams list route
          },
        ]);
      }
    } catch (error: any) {
      console.error('Create stream error:', error);

      // ✅ Show the specific error from the backend (e.g. "YouTube Error: ...")
      const serverError = error.response?.data?.error || error.message;
      Alert.alert('Setup Failed', serverError);
    }
  };

  const shareStream = async (urls: any, streamTitle: string) => {
    if (!urls) return;
    const link = urls.youtube || urls.facebook || '';
    if (!link) return;

    try {
      await Share.share({
        message: `Join my upcoming stream: "${streamTitle}"! \n${link}`,
      });
      // Navigate away after sharing
      router.replace('/(tabs)/activity');
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between border-b px-4 pb-5 pt-16 ${
          isDark ? 'border-gray-700 bg-[#252525]' : 'border-gray-200 bg-gray-50'
        }`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>

        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>
          Create Stream
        </Text>

        <View className="w-6" />
      </View>

      {/* Main Scrollable Content */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="p-4">
          {/* Thumbnail */}
          <View className="mb-6">
            <Text
              className={`mb-2 text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
              Thumbnail
            </Text>

            <TouchableOpacity
              onPress={handlePickThumbnail}
              className={`relative h-40 w-full items-center justify-center rounded-xl border-2 border-dashed ${
                isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-200/50'
              }`}>
              {thumbnail ? (
                <ImageBackground
                  source={{ uri: thumbnail }}
                  className="absolute inset-0 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <Feather name="upload" size={32} color={isDark ? '#fff' : '#000'} />
                  <Text className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                    Upload Thumbnail
                  </Text>
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Or use your profile picture
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View className="mb-6">
            <Text
              className={`mb-2 text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
              Title
            </Text>
            <TextInput
              className={`rounded-lg border px-3 py-2 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
              placeholder="Enter stream title"
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text
              className={`mb-2 text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
              Content
            </Text>
            <TextInput
              className={`rounded-lg border px-3 py-2 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-900'
              }`}
              placeholder="Describe your stream..."
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Date & Time */}
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Date & Time
              </Text>

              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-medium text-blue-500">Go Live Now</Text>
                <Switch
                  value={goLiveNow}
                  onValueChange={setGoLiveNow}
                  trackColor={{ true: '#13a4ec' }}
                />
              </View>
            </View>

            {!goLiveNow && (
              <View>
                <View className="flex-row gap-4">
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className={`flex-1 flex-row items-center justify-between rounded-lg border px-3 py-2 ${
                      isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-100'
                    }`}>
                    <Text className={isDark ? 'text-white' : 'text-slate-900'}>
                      {date.toDateString()}
                    </Text>
                    <Feather name="calendar" size={18} color={isDark ? '#fff' : '#000'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className={`flex-1 flex-row items-center justify-between rounded-lg border px-3 py-2 ${
                      isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-100'
                    }`}>
                    <Text className={isDark ? 'text-white' : 'text-slate-900'}>
                      {date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Feather name="clock" size={18} color={isDark ? '#fff' : '#000'} />
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}

                {showTimePicker && (
                  <DateTimePicker value={date} mode="time" onChange={handleTimeChange} />
                )}
              </View>
            )}

            {goLiveNow && (
              <Text className="mt-2 text-sm text-green-500">You will go live instantly.</Text>
            )}
          </View>

          {/* Villages */}
          <View className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text
                className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Villages
              </Text>

              <TouchableOpacity onPress={handleSelectAll} className="flex-row items-center gap-1">
                <Feather name={selectAll ? 'check-square' : 'square'} size={18} color="#13a4ec" />
                <Text className="text-sm font-medium text-blue-400">
                  {selectAll ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              className={`rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              {villageList.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => toggleVillage(item)}
                  className={`border-b px-3 py-3 ${
                    villages.includes(item)
                      ? 'bg-blue-500/70'
                      : isDark
                        ? 'bg-slate-800/50'
                        : 'bg-slate-200/50'
                  } ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                  <Text
                    className={`font-medium ${
                      villages.includes(item)
                        ? 'text-white'
                        : isDark
                          ? 'text-slate-200'
                          : 'text-slate-800'
                    }`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Platforms */}
          <View className="mb-6">
            <Text
              className={`mb-2 text-sm font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
              Streaming Platforms
            </Text>

            {(Object.keys(platforms) as PlatformKey[]).map((key) => (
              <View
                key={key}
                className={`mb-2 flex-row items-center justify-between rounded-lg p-3 ${
                  isDark ? 'bg-slate-800/50' : 'bg-slate-200/50'
                }`}>
                <Text
                  className={`font-medium capitalize ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                  {key}
                </Text>
                <Switch
                  value={platforms[key]}
                  onValueChange={(val) => setPlatforms({ ...platforms, [key]: val })}
                  trackColor={{ true: '#13a4ec' }}
                />
              </View>
            ))}
          </View>

          {/* WhatsApp */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="share-2" size={18} color="#25D366" />
                <Text
                  className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
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

            <Text className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {notifyOnWhatsApp
                ? "You'll receive updates on WhatsApp."
                : 'WhatsApp notifications are disabled.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer */}
      <View
        className={`border-t p-4 ${
          isDark ? 'border-gray-700 bg-[#252525]' : 'border-gray-200 bg-gray-50'
        }`}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          className="w-full flex-row items-center justify-center rounded-xl bg-blue-500 py-3.5">
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-center text-base font-bold text-white">
              {goLiveNow ? 'Start Stream' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
