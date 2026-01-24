import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserProfileStats } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import { getErrorMessage } from '../utils/getErrorMessage';
import { getInitials, capitalize } from '../utils/getInitials';

// Social Media Connection API functions (you'll need to implement these)
import {
  connectYouTube,
  disconnectSocialMedia,
  getSocialMediaConnections,
} from '../api/socialMedia';

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { formatCount } from '../utils/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_KEYS } from '../constants/storage';
import { logout, logoutFromAllDevices } from '../api/auth';

export default function ProfileScreen() {
  const Toast = useToast();
  const router = useRouter();
  const { user, localLogout, isLeaderMode } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState({
    youtube: false,
    facebook: false,
    instagram: false,
  });
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchSocialConnections();
    fetchProfileStats();
  }, []);
  console.log(user?.id);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getUserProfile();
      setProfileData(response.data);
    } catch (error: any) {
      Toast.show(getErrorMessage(error), {
        type: 'warning',
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchProfileStats = async () => {
    try {
      setLoading(true);
      const data = await getUserProfileStats();
      setProfileStats(data);
    } catch (error: any) {
      Toast.show(getErrorMessage(error), {
        type: 'warning',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialConnections = async () => {
    try {
      const response = await getSocialMediaConnections();
      setSocialConnections(response.data);
    } catch (error: any) {
      console.error('Failed to fetch social connections:', error);
    }
  };

  const handleConnectSocial = async (platform: string) => {
    try {
      if (platform !== 'youtube') {
        Toast.show('Only YouTube OAuth implemented right now', { type: 'warning' });
        return;
      }

      setConnectingPlatform(platform);

      // STEP 1 → Call backend
      console.log(user?.id);
      const authUrl = await connectYouTube(user?.id); // 🔥 FIXED

      console.log('YouTube OAuth URL =>', authUrl);

      if (!authUrl) {
        Toast.show('Failed to get YouTube OAuth URL', { type: 'danger' });
        return;
      }

      Toast.show('Redirecting to YouTube authorization...', { type: 'info' });

      // STEP 2 → Open Google OAuth in an in-app browser
      const redirectUri = Linking.createURL('/'); // expo:// scheme
      console.log('Redirect URI =>', redirectUri);

      await WebBrowser.openAuthSessionAsync(authUrl, redirectUri); // 🔥 FIXED

      // STEP 3 → AFTER CALLBACK, refresh connection status
      await fetchSocialConnections();
    } catch (error) {
      console.log('OAuth Error:', error);
      Toast.show(getErrorMessage(error), { type: 'warning' });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnectSocial = async (platform: string) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${platform} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectSocialMedia(platform);
              setSocialConnections((prev) => ({
                ...prev,
                [platform]: false,
              }));
              Toast.show(`${platform} disconnected successfully`, {
                type: 'success',
              });
            } catch (error: any) {
              Toast.show(getErrorMessage(error), {
                type: 'warning',
              });
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      const expoPushToken = await AsyncStorage.getItem(APP_KEYS.EXPO_PUSH_TOKENS);
      // if you store single token use APP_KEYS.EXPO_PUSH_TOKEN

      // ✅ backend logout (revokes session + deletes push token)
      await logout({ expoPushToken });

      // ✅ local logout (clear AsyncStorage + reset state)
      await localLogout();

      Toast.show('See you soon!', { type: 'success' });
      router.replace('/auth/login');
    } catch (error: any) {
      Toast.show(getErrorMessage(error), { type: 'warning' });

      // ✅ still logout locally if server fails
      await localLogout();
      router.replace('/auth/login');
    }
  };

  const handleLogoutFromAllDevices = async () => {
    Alert.alert(
      'Logout from all devices',
      'This will logout your account from all devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ backend logout all (revokes all sessions + deletes all push tokens)
              await logoutFromAllDevices();

              // ✅ local logout
              await localLogout();

              Toast.show('Logged out from all devices!', { type: 'success' });
              router.replace('/auth/login');
            } catch (error: any) {
              Toast.show(getErrorMessage(error), { type: 'warning' });

              // ✅ still logout locally if server fails
              await localLogout();
              router.replace('/auth/login');
            }
          },
        },
      ]
    );
  };

  const SocialPlatformCard = ({
    platform,
    icon,
    color,
    connected,
    enabled,
  }: {
    platform: string;
    icon: string;
    color: string;
    connected: boolean;
    enabled: boolean;
  }) => (
    <TouchableOpacity
      className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 ${
        enabled
          ? 'border-gray-200 bg-gray-50 dark:border-[#333333] dark:bg-[#252525]'
          : 'border-gray-200 bg-gray-100 opacity-60 dark:border-[#333333] dark:bg-[#1f1f1f]'
      }`}
      onPress={() => {
        if (!enabled) return;
        connected ? handleDisconnectSocial(platform) : handleConnectSocial(platform);
      }}
      activeOpacity={enabled ? 0.7 : 1}
      disabled={!enabled || connectingPlatform === platform}>
      <View className="flex-row items-center">
        <View
          className="mr-3 h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20` }}>
          <MaterialIcons name={icon as any} size={24} color={color} />
        </View>

        <View>
          <Text className="text-base font-semibold text-black dark:text-white">
            {capitalize(platform)}
          </Text>

          <Text className="text-xs text-gray-500 dark:text-[#888888]">
            {enabled ? (connected ? 'Connected' : 'Not connected') : 'Coming soon'}
          </Text>
        </View>
      </View>

      {/* Right side status */}
      {connectingPlatform === platform ? (
        <ActivityIndicator size="small" color={color} />
      ) : enabled ? (
        connected ? (
          <View className="flex-row items-center">
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text className="ml-2 text-sm text-red-500">Disconnect</Text>
          </View>
        ) : (
          <Text className="text-sm font-semibold" style={{ color }}>
            Connect
          </Text>
        )
      ) : (
        <Text className="text-sm font-semibold text-gray-400">Coming Soon</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!user) return null;

  const isLeader = user.role === 'leader' || isLeaderMode?.();

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-gray-100 px-5 pb-5 pt-16 dark:bg-[#252525]">
        <Text className="text-2xl font-bold text-black dark:text-white">Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/edit-profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a]">
          <MaterialIcons name="edit" size={20} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View className="mb-5 items-center bg-gray-100 py-8 dark:bg-[#252525]">
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} className="h-24 w-24 rounded-full" />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-blue-500">
              <Text className="text-4xl font-black text-white">
                {getInitials(user?.first_name, user?.last_name)}
              </Text>
            </View>
          )}
          <Text className="mb-2 mt-2 text-2xl font-bold text-black dark:text-white">
            {capitalize(user?.first_name)} {capitalize(user?.last_name)}
          </Text>
          {user && (
            <View className="mb-2 flex-row items-center gap-1.5">
              <MaterialIcons name="location-on" size={14} color={isDark ? '#888888' : '#666666'} />
              <Text className="text-sm text-gray-500 dark:text-[#888888]">
                {user?.village_name}, {user?.block_name}, {user?.district_name}, {user?.state_name}
              </Text>
            </View>
          )}
          <Text className="text-sm text-gray-600 dark:text-[#cccccc]">{user?.contact}</Text>
        </View>

        {/* Stats Container */}
        <View className="mx-5 mb-5 flex-row rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-[#333333] dark:bg-[#252525]">
          {isLeader ? (
            <>
              {/* Followers */}
              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {formatCount(profileStats?.followers_count)}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Followers</Text>
              </View>

              <View className="w-px bg-gray-200 dark:bg-[#333333]" />

              {/* Following */}
              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {formatCount(profileStats?.following_count)}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Following</Text>
              </View>

              <View className="w-px bg-gray-200 dark:bg-[#333333]" />

              {/* Streams */}
              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {formatCount(profileStats?.streams_count)}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Streams</Text>
              </View>
              <View className="w-px bg-gray-200 dark:bg-[#333333]" />

              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {formatCount(profileStats?.posts_count)}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Posts</Text>
              </View>
            </>
          ) : (
            <View className="flex-1 items-center">
              <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                {formatCount(profileStats?.following_count)}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-[#888888]">Following</Text>
            </View>
          )}
        </View>

        {/* Social Media Connections Section - Only for Leaders */}
        {isLeader && (
          <View className="mb-6 px-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-black dark:text-white">
                Live Stream Connections
              </Text>
              <TouchableOpacity onPress={() => setShowSocialModal(true)}>
                <MaterialIcons
                  name="info-outline"
                  size={20}
                  color={isDark ? '#888888' : '#666666'}
                />
              </TouchableOpacity>
            </View>

            <SocialPlatformCard
              platform="youtube"
              icon="play-circle-filled"
              color="#FF0000"
              connected={socialConnections.youtube}
              enabled={true}
            />

            <SocialPlatformCard
              platform="facebook"
              icon="facebook"
              color="#1877F2"
              connected={socialConnections.facebook}
              enabled={false}
            />

            <SocialPlatformCard
              platform="instagram"
              icon="camera-alt"
              color="#E4405F"
              connected={socialConnections.instagram}
              enabled={false}
            />
          </View>
        )}

        {/* Settings Section */}
        <View className="mb-6 px-5">
          <Text className="mb-4 text-lg font-bold text-black dark:text-white">Settings</Text>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]"
            onPress={() => router.push('/setting')}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a]">
              <MaterialIcons name="settings" size={20} color="#2196F3" />
            </View>
            <Text className="text-base text-black dark:text-white">App Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]"
            onPress={handleLogout}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <MaterialIcons name="logout" size={20} color="#ff4444" />
            </View>
            <Text className="text-base text-[#ff4444]">Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-2 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]"
            onPress={handleLogoutFromAllDevices}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <MaterialIcons name="logout" size={20} color="#ff4444" />
            </View>
            <Text className="text-base text-[#ff4444]">Logout from all Devices</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={showSocialModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSocialModal(false)}>
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50"
          activeOpacity={1}
          onPress={() => setShowSocialModal(false)}>
          <View className="mx-5 rounded-2xl bg-white p-6 dark:bg-[#252525]">
            <View className="mb-4 flex-row items-center">
              <MaterialIcons name="live-tv" size={24} color="#2196F3" />
              <Text className="ml-2 text-xl font-bold text-black dark:text-white">
                Live Streaming
              </Text>
            </View>

            <Text className="mb-4 text-base text-gray-600 dark:text-[#cccccc]">
              Connect your social media accounts to stream live videos directly to your followers on
              multiple platforms simultaneously.
            </Text>

            <View className="mb-2">
              <Text className="mb-1 font-semibold text-black dark:text-white">✓ YouTube Live</Text>
              <Text className="mb-3 text-sm text-gray-600 dark:text-[#888888]">
                Stream to your YouTube channel
              </Text>

              <Text className="mb-1 font-semibold text-black dark:text-white">✓ Facebook Live</Text>
              <Text className="mb-3 text-sm text-gray-600 dark:text-[#888888]">
                Broadcast to your Facebook page or profile
              </Text>

              <Text className="mb-1 font-semibold text-black dark:text-white">
                ✓ Instagram Live
              </Text>
              <Text className="text-sm text-gray-600 dark:text-[#888888]">
                Go live on your Instagram account
              </Text>
            </View>

            <TouchableOpacity
              className="mt-4 rounded-xl bg-[#2196F3] py-3"
              onPress={() => setShowSocialModal(false)}>
              <Text className="text-center font-semibold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
