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
  StatusBar,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import debounce from 'lodash/debounce';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { searchLeaders } from '../api/user';
import { getInitials } from '../utils/getInitials';
import { APP_KEYS } from '../constants/storage';

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

export default function DiscoverLeadersScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // --- THEME CONSTANTS FOR PROPS ---
  const colors = {
    primary: '#2196F3',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    placeholder: isDark ? '#94a3b8' : '#94a3b8',
    surfaceHighlight: isDark ? '#262626' : '#f1f5f9',
  };

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
      const jsonValue = await AsyncStorage.getItem(APP_KEYS.SEARCH_HISTORY);
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
      await AsyncStorage.setItem(APP_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const clearHistory = async () => {
    setRecentLeaders([]);
    await AsyncStorage.removeItem(APP_KEYS.SEARCH_HISTORY);
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
      // Using surface colors for cards with a subtle border
      className="mb-3 flex-row items-center justify-between rounded-xl border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark">
      <View className="flex-row items-center gap-3">
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            className="h-12 w-12 rounded-full bg-surfaceHighlight-light dark:bg-surfaceHighlight-dark"
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Text className="text-xl font-black text-white">
              {getInitials(item?.first_name, item?.last_name)}
            </Text>
          </View>
        )}

        <View>
          <Text className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">
            {item.first_name} {item.last_name}
          </Text>
          <View className="flex-row items-center gap-1">
            {item.village_name && (
              <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {item.village_name} {item.block_name ? `• ${item.block_name}` : ''}
              </Text>
            )}
            {isHistory && <Feather name="clock" size={10} color={colors.textSecondary} />}
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* --- HEADER --- */}
      <View
        className="flex-row items-center gap-3 border-b border-border-light bg-background-light px-4 pb-4 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingTop: Math.max(insets.top, 20) + 10 }}>
        {/* 1. Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="-ml-2 rounded-full p-2 active:bg-surfaceHighlight-light dark:active:bg-surfaceHighlight-dark">
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* 2. Search Input Container */}
        <View className="relative flex-1">
          <MaterialIcons
            name="search"
            size={22}
            color={colors.textSecondary}
            className="absolute left-3 top-3 z-10"
          />
          <TextInput
            placeholder="Search leaders..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={handleSearchChange}
            // Using surface colors for input background
            className="rounded-xl bg-surface-light py-3 pl-10 pr-10 text-base text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              className="absolute right-3 top-3 z-20">
              <Feather name="x" size={18} color={colors.textSecondary} />
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
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 text-text-secondary-light dark:text-text-secondary-dark">
                  Searching JantaWave...
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => renderLeaderItem({ item })}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
                ListEmptyComponent={
                  <View className="mt-10 items-center">
                    <Text className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark">
                      No leaders found
                    </Text>
                    <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
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
                <Text className="text-sm font-bold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">
                  Recent Searches
                </Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text className="text-xs font-medium text-danger">Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={recentLeaders}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => renderLeaderItem({ item, isHistory: true })}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
              ListEmptyComponent={
                <View className="mt-20 items-center opacity-60">
                  <Feather name="users" size={48} color={colors.textSecondary} />
                  <Text className="mt-4 text-center font-medium text-text-secondary-light dark:text-text-secondary-dark">
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
