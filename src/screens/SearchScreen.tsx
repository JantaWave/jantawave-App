import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import debounce from 'lodash/debounce';
import { useAppTheme } from '../context/ThemeContext';
import { searchLeaders } from '../api/user';
import { getInitials } from '../utils/getInitials';

// --- TYPES ---
interface Leader {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: 'leader';
  village_name?: string;
  block_name?: string;
}

const STORAGE_KEY = '@recent_leaders_search';

export default function DiscoverLeadersScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Leader[]>([]);
  const [recentLeaders, setRecentLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);

  // --- LOAD HISTORY ---
  useEffect(() => {
    loadRecentHistory();
  }, []);

  const loadRecentHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setRecentLeaders(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  // --- SAVE HISTORY ---
  const addToRecent = async (leader: Leader) => {
    try {
      const filtered = recentLeaders.filter((item) => item.id !== leader.id);
      const updated = [leader, ...filtered].slice(0, 5); // Keep max 5
      setRecentLeaders(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const clearHistory = async () => {
    setRecentLeaders([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  // --- API SEARCH ---
  const searchApi = async (text: string) => {
    if (!text.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await searchLeaders(text);
      // Ensure we treat the response correctly (handle if it returns { data: [...] } or just [...])
      const data = response.data || response;
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(searchApi, 500), []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setLoading(true);
      debouncedSearch(text);
    } else {
      setSearchResults([]);
      setLoading(false);
    }
  };

  const handleSelectLeader = (leader: Leader) => {
    Keyboard.dismiss();
    addToRecent(leader);

    // Navigate to the dynamic route [id].tsx
    router.push({
      pathname: '/leader-profile/[id]',
      params: { id: leader.id },
    });
  };

  // --- RENDER ITEM ---
  const renderLeaderItem = ({ item, isHistory = false }: { item: Leader; isHistory?: boolean }) => (
    <TouchableOpacity
      onPress={() => handleSelectLeader(item)}
      activeOpacity={0.7}
      className={`mb-3 flex-row items-center justify-between rounded-xl border-border-light bg-background-light p-3 dark:border-border-dark dark:bg-background-dark`}>
      <View className="flex-row items-center gap-3">
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} className="h-12 w-12 rounded-full bg-gray-300" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-500">
            <Text className="text-xl font-black text-white">
              {getInitials(item?.first_name, item?.last_name)}
            </Text>
          </View>
        )}

        <View>
          <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {item.first_name} {item.last_name}
          </Text>
          <View className="flex-row items-center gap-1">
            {item.village_name && (
              <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {item.village_name} {item.block_name ? `• ${item.block_name}` : ''}
              </Text>
            )}
            {isHistory && <Feather name="clock" size={10} color={isDark ? '#9ca3af' : '#6b7280'} />}
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={isDark ? '#555' : '#ccc'} />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:border-border-dark">
      {/* --- HEADER --- */}
      <View
        className={`flex-row items-center gap-3 px-4 pb-4 pt-14 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'}`}>
        {/* 1. Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className={`-ml-2 rounded-full p-2 ${isDark ? 'active:bg-gray-800' : 'active:bg-gray-100'}`}>
          <Feather name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>

        {/* 2. Search Input Container */}
        <View className="relative flex-1">
          <MaterialIcons
            name="search"
            size={22}
            color="#9ca3af"
            className="absolute left-3 top-3 z-10"
          />
          <TextInput
            placeholder="Search leaders..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            className={`rounded-xl py-3 pl-10 pr-10 text-base ${
              isDark ? 'bg-[#252525] text-white' : 'bg-gray-100 text-gray-900'
            }`}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true} // Focus automatically for better UX
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              className="absolute right-3 top-3 z-20">
              <Feather name="x" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- CONTENT --- */}
      <View className="flex-1 px-4 pt-4">
        {searchQuery.length > 0 ? (
          <>
            {loading ? (
              <View className="mt-10 items-center">
                <ActivityIndicator size="large" color="#2196F3" />
                <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Searching JantaWave...
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => renderLeaderItem({ item })}
                ListEmptyComponent={
                  <View className="mt-10 items-center">
                    <Text
                      className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      No leaders found
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      Try searching for a different village or name.
                    </Text>
                  </View>
                }
              />
            )}
          </>
        ) : (
          /* Recent History */
          <>
            {recentLeaders.length > 0 && (
              <View className="mb-3 flex-row items-center justify-between">
                <Text
                  className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Recent Searches
                </Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text className="text-xs font-medium text-red-500">Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={recentLeaders}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => renderLeaderItem({ item, isHistory: true })}
              ListEmptyComponent={
                <View className="mt-20 items-center opacity-60">
                  <Feather name="users" size={48} color={isDark ? '#444' : '#ccc'} />
                  <Text
                    className={`mt-4 text-center font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Search for leaders in your block{'\n'}to see their updates.
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </View>
  );
}
