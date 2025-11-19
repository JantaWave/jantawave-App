// api/socialMedia.ts
import axiosClientInstance from '../config/axios'; // Use configured axios with interceptors
import axiosClient from './axiosClient';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ============================================
// YOUTUBE OAUTH CONNECTION
// ============================================

/**
 * Initiates YouTube OAuth flow
 * Backend: GET /api/v1/OAuth/init?userId=xxx
 * @param userId - User ID to associate with OAuth tokens
 * @returns Google OAuth consent URL
 */
export const connectYouTube = async (userId: string) => {
  if (!userId) {
    throw new Error('User ID is required for YouTube OAuth');
  }

  console.log('🔗 Initiating YouTube OAuth for user:', userId);

  try {
    const { data } = await axiosClient.get(`${API_URL}/api/v1/OAuth/init`, {
      params: { userId },
    });

    console.log('✅ OAuth URL generated:', data.url);

    if (!data.url) {
      throw new Error('No OAuth URL returned from backend');
    }

    return data.url;
  } catch (error: any) {
    console.error('❌ Failed to get YouTube OAuth URL:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to initiate YouTube OAuth');
  }
};

/**
 * Creates a YouTube live broadcast and stream
 * Backend: POST /api/v1/OAuth/create-live
 * @param params - Broadcast configuration
 * @returns Broadcast, stream, and ingestion details (RTMP URL + key)
 */
export const createYouTubeLive = async (params: {
  userId?: string;
  google_sub?: string;
  title?: string;
  description?: string;
  scheduledStartTime?: string;
}) => {
  console.log('🎥 Creating YouTube live broadcast:', params);

  try {
    const { data } = await axiosClient.post(`${API_URL}/api/v1/OAuth/create-live`, params);

    console.log('✅ Live broadcast created:', {
      broadcastId: data.broadcast?.id,
      streamId: data.stream?.id,
      hasIngestion: !!data.ingestion,
    });

    return {
      broadcast: data.broadcast,
      stream: data.stream,
      binding: data.binding,
      ingestion: data.ingestion, // Contains RTMP URL and stream key
    };
  } catch (error: any) {
    console.error('❌ Failed to create live broadcast:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to create YouTube live broadcast');
  }
};

// ============================================
// SOCIAL MEDIA CONNECTIONS
// ============================================

/**
 * Get connected social media platforms for the authenticated user
 * Backend: GET /api/v1/social-media/connections
 * Requires: Authorization header with JWT token
 */
export const getSocialMediaConnections = async () => {
  try {
    console.log('📡 Fetching social media connections...');

    const { data } = await axiosClient.get(`${API_URL}/api/v1/social-media/connections`);

    console.log('✅ Social connections:', data.data);

    return {
      data: data.data || {
        youtube: false,
        facebook: false,
        instagram: false,
      },
    };
  } catch (error: any) {
    console.error('❌ Failed to fetch social connections:', error.response?.data || error.message);

    // Return default values if endpoint fails
    return {
      data: {
        youtube: false,
        facebook: false,
        instagram: false,
      },
    };
  }
};

/**
 * Disconnect a social media platform
 * Backend: POST /api/v1/social-media/disconnect
 * Requires: Authorization header with JWT token
 * @param platform - Platform to disconnect (youtube, facebook, instagram)
 */
export const disconnectSocialMedia = async (platform: string) => {
  try {
    console.log('🔌 Disconnecting platform:', platform);

    const { data } = await axiosClient.post(`${API_URL}/api/v1/social-media/disconnect`, {
      platform: platform.toLowerCase(),
    });

    console.log('✅ Platform disconnected:', data);

    return data.success;
  } catch (error: any) {
    console.error('❌ Failed to disconnect social media:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to disconnect platform');
  }
};

/**
 * Check status of a specific social media platform connection
 * Backend: GET /api/v1/social-media/status/:platform
 * @param platform - Platform to check (youtube, facebook, instagram)
 */
export const checkPlatformStatus = async (platform: string) => {
  try {
    const { data } = await axiosClient.get(
      `${API_URL}/api/v1/social-media/status/${platform.toLowerCase()}`
    );

    return {
      connected: data.connected,
      platform: data.platform,
      provider_user_id: data.provider_user_id,
      expires_at: data.expires_at,
      scope: data.scope,
    };
  } catch (error: any) {
    console.error('Failed to check platform status:', error);
    throw new Error('Failed to check platform status');
  }
};

// ============================================
// HELPER TYPES
// ============================================

export interface YouTubeLiveBroadcast {
  id: string;
  snippet: {
    title: string;
    description: string;
    scheduledStartTime: string;
  };
  status: {
    lifeCycleStatus: string;
  };
}

export interface YouTubeLiveStream {
  id: string;
  cdn: {
    ingestionInfo: {
      streamName: string; // This is your stream key
      ingestionAddress: string; // RTMP URL
    };
  };
}

export interface YouTubeLiveResponse {
  broadcast: YouTubeLiveBroadcast;
  stream: YouTubeLiveStream;
  binding: any;
  ingestion: {
    streamName: string;
    ingestionAddress: string;
  } | null;
}

export interface SocialConnections {
  youtube: boolean;
  facebook: boolean;
  instagram: boolean;
}

export interface PlatformStatus {
  connected: boolean;
  platform: string;
  provider_user_id?: string;
  expires_at?: string;
  scope?: string;
}
