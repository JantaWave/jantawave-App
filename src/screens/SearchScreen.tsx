import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function DiscoverLeadersScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [leaders, setLeaders] = useState([
    {
      id: '1',
      name: 'Alex Morgan',
      username: '@alex_morgan',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDDHA4ph4iSo33bVSDHLtOqEbYlxe6IeCEIv945v4YAtcMmbGNGVDCytk7tsVQixgLtWCg6oTqOYCeif4vJcU2S_DE7NrXxWH0LA7m46N_QmpIj_oRzb9OlfZgRA00Po5niBYCgoDM-yXrkD59E_gXThcjyTvBjFBZV_HY10VotY05zg9cGsPoFK-Wt11Vf10E5kG7GytbfYZPo7PQ-dRG7pHG80DeZV8t_X0H7l7G5mfnhc3Mgw7RHALvI-K_AHuudCCVYhBrVdy8',
      isFollowing: false,
    },
    {
      id: '2',
      name: 'Samantha Bee',
      username: '@samanthabee',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDWHtueV6c4FuliZU8x-ECQG7pXlKQwCJu_iQY6WBeLU5LcnS_Pe0wki9sXYg4SF2HDec7GA_YCoxuXkghfhfkO8UxEt0OctOXLc1Lm1fjMoVf4vUEz8I9NZuCEHkxxQKb3bRZK3u1T4b5gsHbngQrdoMC7dQjx7sgnZ62vEl7-XTTcqDWlYTe9yxHIsn0-c4TkYzkebtGRwq0ZO-dfBOaOhOaew5Go-LOjdwzKmKdNWRFEPnnqACzTqNfYeurF1loD8aBvGf-EjWc',
      isFollowing: true,
    },
    {
      id: '3',
      name: 'Casey Neistat',
      username: '@caseyneistat',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDyWNjqQ8xuVgDDC_4PJC2PCQrRaqlaxCgFsfPQWwx9nn86noTSBEYEH4ccLOxLmTj9j5WRey93EYsWSQBWslQfwiScO8ffzPb8a1gNBqn5GD83wVAvh_H4ncdr2h79HnPAeXPONSwlUaETFXaxriV3CM04KVmVLGnuuB2jwTEVJaF2WyM6ZIiKMOq6m6NBg2fC9PtBj8QsVKNZPPF5Hgwdp33UmTzkJ_aV0q55eGiW4iL2SZh-ri3fpz8pH5gGSUmcK_IjDdeiAAk',
      isFollowing: false,
    },
    {
      id: '4',
      name: 'Lilly Singh',
      username: '@iisuperwomanii',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBhVEeX8AYEjBz0MXblRjw2Cx1P72vRswHNQQTJreG95ktfY0EdXpL6_XU1SAGGSUd-HHjuaARrYiD3sW_5pjsgL4lrKvFCBtjNge6ISiyQpgDyhJl3gBGNKmdmAzvIfSCbbjvV0DAt_huQ--sMUrXtHIYdZJeM0QuqsuauB6YeJ_dKhucS_QqNFSj00JSkHKI70im2SXYPHGB0hcUXJFw8zD3YvtAGpw6XkIt2RkjM4xK2ZfrrxVGk8Vw0m0qF6bUrxRgHHwxMRGA',
      isFollowing: false,
    },
    {
      id: '5',
      name: 'Emma Chamberlain',
      username: '@emmachamberlain',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDNIjCZB_reNvW9-ZFqWE6b4ON4XiG08_HQlPoXnHnYsgmYaJENz3kkAd3L2e6bk81vR2a9kOH-4m2WfKtMnrPdtfbCJI5RlXnrx_50JewUNt1VQS9zngf0wbAjmcQTz-94cgM46eguCFTAAdIwXVPrP9CMbX-fWLZr0Rtsyu7HgG3x3WQcDHn_wUFv7cbiVUS-TI0hhmtPvFZWF_6Vv1DP619UO2GlhfOUGbIymryvgWm6aZjNTBmb8lJ3YnqcNwXz4Yr8Xobm0zY',
      isFollowing: true,
    },
  ]);

  const toggleFollow = (id) => {
    setLeaders((prev) =>
      prev.map((leader) =>
        leader.id === id ? { ...leader, isFollowing: !leader.isFollowing } : leader
      )
    );
  };

  return (
    <View className="flex-1 bg-[#1a1a1a]">
      {/* Search Header */}
      <View className="px-4 pb-3 pt-12">
        <View className="relative">
          <MaterialIcons
            name="search"
            size={22}
            color="#9ca3af"
            className="absolute left-3 top-3"
          />
          <TextInput
            placeholder="Search for leaders"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="rounded-xl bg-[#252525] py-3 pl-10 pr-4 text-base text-white"
          />
        </View>
      </View>

      {/* Leaders */}
      <FlatList
        data={leaders.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
        }}
        renderItem={({ item }) => (
          <View className="mb-4 flex-row items-center justify-between rounded-xl bg-[#252525] p-4">
            <View className="flex-row items-center space-x-3">
              <Image source={{ uri: item.image }} className="mr-2 h-12 w-12 rounded-full" />
              <View>
                <Text className="text-base font-bold text-white">{item.name}</Text>
                <Text className="text-sm text-white/50">{item.username}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => toggleFollow(item.id)}
              activeOpacity={0.8}
              className={`rounded-full px-4 py-2 ${
                item.isFollowing ? 'bg-white/10' : 'bg-[#13a4ec]'
              }`}>
              <Text
                className={`text-sm font-bold ${
                  item.isFollowing ? 'text-white/80' : 'text-white'
                }`}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
