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
import { getUserProfile } from '../api/user';
import { useToast } from 'react-native-toast-notifications';
import { MaterialIcons } from '@expo/vector-icons';
import { getErrorMessage } from '../utils/getErrorMessage';
import { getInitials, capitalize } from '../utils/getInitials';

import {
  connectYouTube,
  disconnectSocialMedia,
  getSocialMediaConnections,
} from '../api/socialMedia';

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Important: This tells WebBrowser to warm up for better performance
WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
  const Toast = useToast();
  const router = useRouter();
  const { user, logout, isLeaderMode } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState({
    youtube: false,
    facebook: false,
    instagram: false,
  });
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Handle deep link when returning from OAuth
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('📱 Deep link received:', event.url);

      try {
        const url = new URL(event.url);
        const connected = url.searchParams.get('connected');
        const google_sub = url.searchParams.get('google_sub');

        if (connected === 'true') {
          console.log('✅ OAuth successful! google_sub:', google_sub);
          Toast.show('YouTube connected successfully!', { type: 'success' });

          // Refresh social connections after successful OAuth
          setTimeout(() => {
            fetchSocialConnections();
          }, 1000);
        }
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSocialConnections();
  }, []);

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

  const fetchSocialConnections = async () => {
    try {
      console.log('🔄 Fetching social connections...');
      const response = await getSocialMediaConnections();
      console.log('📊 Social connections response:', response);

      setSocialConnections(response.data);

      // Log individual connection status
      console.log('YouTube connected:', response.data.youtube);
      console.log('Facebook connected:', response.data.facebook);
      console.log('Instagram connected:', response.data.instagram);
    } catch (error: any) {
      console.error('❌ Failed to fetch social connections:', error);
    }
  };

  const handleConnectSocial = async (platform: string) => {
    try {
      if (platform !== 'youtube') {
        Toast.show('Only YouTube OAuth implemented right now', { type: 'warning' });
        return;
      }

      // Check if user exists
      if (!user?.id) {
        Toast.show('User not authenticated', { type: 'danger' });
        return;
      }

      setConnectingPlatform(platform);

      console.log('🎬 Starting YouTube OAuth for user:', user.id);

      // STEP 1: Get OAuth URL from backend
      const authUrl = await connectYouTube(user.id);

      if (!authUrl) {
        Toast.show('Failed to get YouTube OAuth URL', { type: 'danger' });
        setConnectingPlatform(null);
        return;
      }

      console.log('🔗 OAuth URL:', authUrl);

      // STEP 2: Open OAuth in browser
      Toast.show('Opening YouTube authorization...', { type: 'info' });

      const redirectUri = Linking.createURL('/');
      console.log('📍 Redirect URI:', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      console.log('🔙 WebBrowser result:', result);

      // STEP 3: Handle result
      if (result.type === 'success') {
        console.log('✅ OAuth completed successfully');

        // The deep link handler will take care of showing success message
        // and refreshing connections, but we'll also refresh here as backup
        setTimeout(() => {
          fetchSocialConnections();
        }, 2000);
      } else if (result.type === 'cancel') {
        console.log('❌ User cancelled OAuth');
        Toast.show('Authorization cancelled', { type: 'info' });
      } else if (result.type === 'dismiss') {
        console.log('⚠️ OAuth dismissed');
        Toast.show('Authorization dismissed', { type: 'info' });
      }
    } catch (error: any) {
      console.error('❌ OAuth Error:', error);
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

              // Update local state immediately
              setSocialConnections((prev) => ({
                ...prev,
                [platform]: false,
              }));

              Toast.show(`${capitalize(platform)} disconnected successfully`, {
                type: 'success',
              });

              // Refresh from server to confirm
              await fetchSocialConnections();
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
      await logout();
      Toast.show('See you soon!', {
        type: 'success',
      });
      router.replace('/auth/login');
    } catch (error) {
      Toast.show('Failed to logout', {
        type: 'warning',
      });
    }
  };

  const SocialPlatformCard = ({
    platform,
    icon,
    color,
    connected,
  }: {
    platform: string;
    icon: string;
    color: string;
    connected: boolean;
  }) => (
    <TouchableOpacity
      className="mb-3 flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#333333] dark:bg-[#252525]"
      onPress={() => (connected ? handleDisconnectSocial(platform) : handleConnectSocial(platform))}
      disabled={connectingPlatform === platform}>
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
            {connected ? 'Connected' : 'Not connected'}
          </Text>
        </View>
      </View>

      {connectingPlatform === platform ? (
        <ActivityIndicator size="small" color={color} />
      ) : connected ? (
        <View className="flex-row items-center">
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text className="ml-2 text-sm text-red-500">Disconnect</Text>
        </View>
      ) : (
        <Text className="text-sm font-semibold" style={{ color }}>
          Connect
        </Text>
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
    <View className="flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-gray-100 px-5 pb-5 pt-16 dark:bg-[#252525]">
        <Text className="text-2xl font-bold text-black dark:text-white">Profile</Text>
        <View className="flex-row gap-2">
          {/* Refresh button for debugging */}
          <TouchableOpacity
            onPress={fetchSocialConnections}
            className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a]">
            <MaterialIcons name="refresh" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1a1a1a]">
            <MaterialIcons name="edit" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
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
          {user?.address && (
            <View className="mb-2 flex-row items-center gap-1.5">
              <MaterialIcons name="location-on" size={14} color={isDark ? '#888888' : '#666666'} />
              <Text className="text-sm text-gray-500 dark:text-[#888888]">
                {user?.address.village_name}, {user?.address.block_name},{' '}
                {user?.address.district_name}, {user?.address.state_name}
              </Text>
            </View>
          )}
          <Text className="text-sm text-gray-600 dark:text-[#cccccc]">{user?.contact}</Text>
        </View>

        {/* Stats Container */}
        <View className="mx-5 mb-5 flex-row rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-[#333333] dark:bg-[#252525]">
          {isLeader ? (
            <>
              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {profileData?.followersCount || user?.followersCount || 0}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Followers</Text>
              </View>

              <View className="w-px bg-gray-200 dark:bg-[#333333]" />

              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {profileData?.followingCount || user?.followingCount || 0}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Following</Text>
              </View>

              <View className="w-px bg-gray-200 dark:bg-[#333333]" />

              <View className="flex-1 items-center">
                <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                  {profileData?.streamsCount || user?.streamsCount || 0}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-[#888888]">Streams</Text>
              </View>
            </>
          ) : (
            <View className="flex-1 items-center">
              <Text className="mb-1 text-2xl font-bold text-[#2196F3]">
                {profileData?.followingCount || user?.followingCount || 0}
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
            />

            <SocialPlatformCard
              platform="facebook"
              icon="facebook"
              color="#1877F2"
              connected={socialConnections.facebook}
            />

            <SocialPlatformCard
              platform="instagram"
              icon="camera-alt"
              color="#E4405F"
              connected={socialConnections.instagram}
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
