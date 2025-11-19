import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Switch,
  FlatList,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { createYouTubeLive } from '../api/youtube';

export default function CreateStreamScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [goLiveNow, setGoLiveNow] = useState(false);

  const villageList = ['Village A', 'Village B', 'Village C'];
  const [villages, setVillages] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handlePickThumbnail = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
    });
    if (!res.canceled) setThumbnail(res.assets[0].uri);
  };

  const toggleVillage = (name: string) => {
    setVillages((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  const handleSelectAll = () => {
    setVillages(selectAll ? [] : villageList);
    setSelectAll(!selectAll);
  };

  const handleCreate = async () => {
    try {
      if (!title.trim()) return alert('Title is required');

      const now = new Date();
      if (!goLiveNow && date <= now) return alert('Stream date must be in the future');

      const payload = {
        userId: user.id,
        title,
        description: content,
        scheduledStartTime: goLiveNow ? new Date().toISOString() : date.toISOString(),
      };

      const response = await createYouTubeLive(payload);
      const { ingestion } = response;

      const rtmpUrl = `${ingestion.ingestionAddress}/${ingestion.streamName}`;

      if (goLiveNow) {
        router.push({
          pathname: '/start-stream',
          params: { rtmpUrl },
        });
      } else {
        alert('Stream scheduled!');
        router.back();
      }
    } catch (e) {
      console.log(e);
      alert('Failed to create stream');
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Thumbnail */}
        <TouchableOpacity
          onPress={handlePickThumbnail}
          className="h-40 items-center justify-center rounded-xl border-2 border-dashed">
          {thumbnail ? (
            <ImageBackground source={{ uri: thumbnail }} className="absolute inset-0 rounded-xl" />
          ) : (
            <>
              <Feather name="upload" size={32} color={isDark ? '#fff' : '#000'} />
              <Text className="text-sm">Upload Thumbnail</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Title */}
        <TextInput
          placeholder="Stream Title"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          className="mt-5 rounded-lg border p-3"
        />

        {/* Content */}
        <TextInput
          placeholder="Describe your stream..."
          placeholderTextColor="#888"
          value={content}
          onChangeText={setContent}
          multiline
          className="mt-5 h-24 rounded-lg border p-3"
        />

        {/* Date / Go Live Now */}
        <View className="mt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-medium">Date & Time</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-blue-500">Go Live Now</Text>
              <Switch value={goLiveNow} onValueChange={setGoLiveNow} />
            </View>
          </View>

          {!goLiveNow && (
            <>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="mb-2 rounded-lg border p-3">
                <Text>{date.toDateString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="rounded-lg border p-3">
                <Text>
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(e, d) => {
                    setShowDatePicker(false);
                    if (d) setDate(d);
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  onChange={(e, d) => {
                    setShowTimePicker(false);
                    if (d) setDate(d);
                  }}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="border-t p-4">
        <TouchableOpacity onPress={handleCreate} className="rounded-xl bg-blue-500 p-4">
          <Text className="text-center text-lg font-bold text-white">
            {goLiveNow ? 'Start Stream' : 'Create Stream'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
