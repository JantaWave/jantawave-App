import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

// TEMP mock data — replace later with API call
const liveStreams = [
  {
    id: 1,
    title: 'Mobile Photography Masterclass',
    host: 'Alex',
    image: 'https://picsum.photos/300/200?1',
  },
  { id: 2, title: 'Digital Art Workshop', host: 'Jenna', image: 'https://picsum.photos/300/200?2' },
];
const upcoming = [
  {
    id: 1,
    title: 'UI/UX Future Talk',
    host: 'Design Hub',
    time: '3 hrs',
    image: 'https://picsum.photos/300/200?3',
  },
  {
    id: 2,
    title: 'Indie Game Dev Live',
    host: 'Mike',
    time: 'Tomorrow 7PM',
    image: 'https://picsum.photos/300/200?4',
  },
];

export default function AudienceHome() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-[#1a1a1a]">
      {/* ✅ Live Streams */}
      <Text className="mb-3 text-xl font-bold text-black dark:text-white">Live Streams</Text>

      {liveStreams.map((stream) => (
        <TouchableOpacity
          key={stream.id}
          onPress={() =>
            router.push({
              pathname: '/stream/[id]',
              params: {
                id: stream.id,
                title: stream.title,
                host: stream.host,
                image: stream.image,
              },
            })
          }
          className="mb-4 overflow-hidden rounded-xl bg-[#252525] shadow-lg">
          <Image source={{ uri: stream.image }} className="h-48 w-full" />
          <View className="p-4">
            <Text className="text-lg font-bold text-white">{stream.title}</Text>
            <Text className="text-sm text-white/60">by {stream.host}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {/* ✅ Upcoming */}
      <Text className="mb-3 mt-6 text-xl font-bold text-black dark:text-white">Upcoming</Text>

      {upcoming.map((item) => (
        <View
          key={item.id}
          className="mb-4 flex-row items-center gap-4 rounded-xl bg-[#252525] p-4">
          <Image source={{ uri: item.image }} className="h-20 w-20 rounded-lg" />
          <View className="flex-1">
            <Text className="font-bold text-white">{item.title}</Text>
            <Text className="text-xs text-white/60">{item.host}</Text>
            <Text className="mt-1 text-xs font-semibold text-blue-400">{item.time}</Text>
          </View>
        </View>
      ))}

      <View className="mb-20" />
    </ScrollView>
  );
}
