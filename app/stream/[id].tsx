import { View, Text, Image, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function StreamDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#101c22]">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center gap-3 bg-[#101c22] px-4 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-black/40">
          <MaterialIcons name="arrow-back-ios-new" size={20} color="#fff" />
        </Pressable>
        <Text className="text-lg font-bold text-white">Live Stream</Text>
      </View>

      {/* Stream Video / Banner */}
      <View className="relative h-64 w-full">
        <Image
          source={{
            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlFWQ9f7L4ay0D3Jem8p5NiM5Sw1bAhcMVYjk-0gyXHrfvF4BKhzgZH_QxM4Qqjb7MfB8U-pXsCEST7wruMKs6U5WkJceMZNIjtvikc-FtgcjCyWfuOuBa-qShc5Uy3CgCSglI0nCl036hjgDmDfZVfNCmJhV8KnqvkgjVPerBdDQpWhqZfMTSLiROozvsov-OAsFiHn5YG9aKDcMr9KLhNu17stiHLpJW-Fw7WOCLMJXD33MCeEQtFG3aAp0770p4w8UBSU7X7co',
          }}
          className="absolute inset-0 h-full w-full"
          resizeMode="cover"
        />

        <View className="absolute inset-0 bg-black/50" />

        <View className="absolute right-4 top-3 flex-row items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5">
          <MaterialIcons name="sensors" size={16} color="white" />
          <Text className="text-xs font-bold text-white">LIVE</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView className="flex-1 px-4 py-3">
        <Text className="mb-1 text-2xl font-bold text-white">Mastering Mobile Photography</Text>
        <Text className="mb-3 text-white/60">with Alex Thompson</Text>

        <View className="mb-3 flex-row gap-5">
          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="today" size={18} color="white" />
            <Text className="text-sm text-white/70">July 25, 2024</Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="schedule" size={18} color="white" />
            <Text className="text-sm text-white/70">9:00 PM</Text>
          </View>
        </View>

        <Text className="mb-4 text-white/90">
          Join Alex as he shares secrets to capturing stunning photos with smartphones.
        </Text>

        {/* Chat Area */}
        <View className="mb-2 rounded-lg bg-[#1a2831]/60 p-4">
          <View className="mb-2 flex-row justify-between">
            <Text className="font-bold text-white">Live Chat</Text>
            <Text className="text-xs text-white/50">2.3k viewers</Text>
          </View>

          <ScrollView className="h-52" showsVerticalScrollIndicator={false}>
            {[
              { name: 'Casey Lee', msg: 'This is so informative! 🔥' },
              { name: 'David Chen', msg: 'What camera app do you use?' },
              { name: 'Emily Rodriguez', msg: 'Show before/after 🤩' },
              { name: 'Michael Johnson', msg: 'Loving it, thanks Alex!' },
            ].map((c, i) => (
              <View key={i} className="mb-3">
                <Text className="text-sm font-semibold text-white">{c.name}</Text>
                <Text className="text-sm text-white/80">{c.msg}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom Chat Input */}
      <View className="flex-row items-center gap-2 border-t border-white/10 bg-[#101c22] p-3">
        <TextInput
          placeholder="Send a message..."
          placeholderTextColor="#aaa"
          className="flex-1 rounded-full bg-[#1a2831] px-4 py-2 text-sm text-white"
        />
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-[#13a4ec]">
          <MaterialIcons name="send" size={22} color="white" />
        </Pressable>
        <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-[#1a2831]">
          <MaterialIcons name="add-reaction" size={22} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
