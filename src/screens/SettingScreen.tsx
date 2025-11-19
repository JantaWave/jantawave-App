import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

export default function SettingsScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // State variables
  const [newFollowers, setNewFollowers] = useState(true);
  const [comments, setComments] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [statusVisibility, setStatusVisibility] = useState('Everyone');
  const [language, setLanguage] = useState('English');
  const [darkMode, setDarkMode] = useState(isDark);

  return (
    <SafeAreaView className="flex-1 bg-[#1a1a1a]">
      {/* Header */}
      <View className="mt-10 flex-row items-center justify-between border-b border-[#2e2e2e] bg-[#1a1a1a] px-4 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Settings</Text>
        <View className="w-6" />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Notifications */}
        <View className="mb-8 space-y-4">
          <Text className="mb-1 text-sm font-bold uppercase tracking-wider text-[#13a4ec]">
            Notifications
          </Text>

          <View className="rounded-xl bg-[#252525]">
            <View className="flex-row items-center justify-between border-b border-[#333] px-4 py-4">
              <Text className="font-medium text-white">New Followers</Text>
              <Switch
                value={newFollowers}
                onValueChange={setNewFollowers}
                thumbColor={newFollowers ? '#fff' : '#eee'}
                trackColor={{ true: '#13a4ec', false: '#555' }}
              />
            </View>

            <View className="flex-row items-center justify-between border-b border-[#333] px-4 py-4">
              <Text className="font-medium text-white">Comments on your stream</Text>
              <Switch
                value={comments}
                onValueChange={setComments}
                thumbColor={comments ? '#fff' : '#eee'}
                trackColor={{ true: '#13a4ec', false: '#555' }}
              />
            </View>
          </View>
        </View>

        {/* Privacy */}
        <View className="mb-8 space-y-4">
          <Text className="mb-1 text-sm font-bold uppercase tracking-wider text-[#13a4ec]">
            Privacy
          </Text>

          <View className="rounded-xl bg-[#252525]">
            {/* <View className="flex-row items-center justify-between border-b border-[#333] px-4 py-4"> */}
            {/*   <Text className="font-medium text-white">Private Account</Text> */}
            {/*   <Switch */}
            {/*     value={privateAccount} */}
            {/*     onValueChange={setPrivateAccount} */}
            {/*     thumbColor={privateAccount ? '#fff' : '#eee'} */}
            {/*     trackColor={{ true: '#13a4ec', false: '#555' }} */}
            {/*   /> */}
            {/* </View> */}

            <View className="px-4 py-4">
              <Text className="mb-2 font-medium text-white">Who can see your online status</Text>
              <View className="overflow-hidden rounded-lg bg-[#333333]">
                <Picker
                  selectedValue={statusVisibility}
                  onValueChange={(value) => setStatusVisibility(value)}
                  dropdownIconColor="#ccc"
                  style={{
                    color: '#fff',
                    backgroundColor: '#333333',
                    height: 48,
                  }}>
                  <Picker.Item label="Everyone" value="Everyone" />
                  <Picker.Item label="Friends" value="Friends" />
                  <Picker.Item label="No one" value="No one" />
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* General */}
        <View className="mb-8 space-y-4">
          <Text className="mb-1 text-sm font-bold uppercase tracking-wider text-[#13a4ec]">
            General
          </Text>

          <View className="rounded-xl bg-[#252525]">
            <View className="border-b border-[#333] px-4 py-4">
              <Text className="mb-2 font-medium text-white">Language</Text>
              <View className="overflow-hidden rounded-lg bg-[#333333]">
                <Picker
                  selectedValue={language}
                  onValueChange={(value) => setLanguage(value)}
                  dropdownIconColor="#ccc"
                  style={{
                    color: '#fff',
                    backgroundColor: '#333333',
                    height: 48,
                  }}>
                  <Picker.Item label="English" value="English" />
                  <Picker.Item label="Hindi" value="Hindi" />
                  <Picker.Item label="Gujrati" value="Gujrati" />
                </Picker>
              </View>
            </View>

            <View className="flex-row items-center justify-between px-4 py-4">
              <Text className="font-medium text-white">Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor={darkMode ? '#fff' : '#eee'}
                trackColor={{ true: '#13a4ec', false: '#555' }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 w-full border-t border-[#333] bg-[#1a1a1a] p-4">
        <TouchableOpacity
          activeOpacity={0.9}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#13a4ec]">
          <Text className="text-base font-bold text-white">Save Changes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
