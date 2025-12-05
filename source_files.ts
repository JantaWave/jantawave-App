// src/api/auth.ts
import axiosClient from './axiosClient';

export interface SendOTPRequest {
  contact: string;
}

export interface VerifyOTPRequest {
  contact: string;
  otp: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  village_id: string;
  contact: string;
  mpin: string;
  date_of_birth: string;
  gender: string;
}

export interface LoginRequest {
  contact: string;
  otp?: string;
  mpin?: string;
}

export const sendOTP = async (data: SendOTPRequest) => {
  const response = await axiosClient.post('/api/v1/send-otp', data);
  return response.data;
};

export const verifyOTP = async (data: VerifyOTPRequest) => {
  const response = await axiosClient.post('/api/v1/verify-otp', data);
  return response.data;
};

export const register = async (data: RegisterRequest) => {
  console.log('Data from register api', data);
  const response = await axiosClient.post('/api/v1/register', data);
  return response.data;
};

export const login = async (data: LoginRequest) => {
  const response = await axiosClient.post('/api/v1/login', data);
  console.log(response.data.data.user);
  return response.data.data;
};

export const getStates = async () => {
  const response = await axiosClient.get('/api/v1/states');
  return response.data;
};

export const getCities = async (stateId: string) => {
  const response = await axiosClient.get(`/api/v1/states/${stateId}/districts`);
  return response.data;
};

export const getBlocks = async (districtId: string) => {
  const response = await axiosClient.get(`/api/v1/districts/${districtId}/blocks`);
  return response.data;
};

export const getVillages = async (blockId: string) => {
  const response = await axiosClient.get(`/api/v1/blocks/${blockId}/villages`);
  return response.data;
};
export const getAddress = async (villageId: string) => {
  const response = await axiosClient.get(`/api/v1/address/${villageId}`);
  return response.data;
};

export const getTerms = async () => {
  const response = await axiosClient.get('/api/v1/users');
  return response.data;
};




// src/api/axiosClient.ts
import axios, { AxiosError } from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use EXPO_PUBLIC_ prefix
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Debug: Log to see if it's loaded
if (__DEV__) {
  console.log("API URL:", API_URL);
}

if (!API_URL) {
  console.error("⚠️ EXPO_PUBLIC_BACKEND_URL is not set! Check your .env file");
}

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Platform": Platform.OS,
  },
});

// Request interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log("Making request to:", config.baseURL + config.url);
    }

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Enhanced error logging
    if (__DEV__) {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem("auth_token");
        // Optional: Navigate to login screen or trigger logout event
        // You can add a callback or event emitter here
      } catch (storageError) {
        console.error("Error clearing auth token:", storageError);
      }
    }

    // Network error handling
    if (error.message === "Network Error" || !error.response) {
      return Promise.reject({
        ...error,
        message:
          "Network connection failed. Please check your internet connection.",
      });
    }

    // Timeout error handling
    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        ...error,
        message: "Request timeout. Please try again.",
      });
    }

    return Promise.reject(error);
  },
);

// Optional: Add retry logic for failed requests
export const setupRetryInterceptor = (retries = 3, retryDelay = 1000) => {
  axiosClient.interceptors.response.use(undefined, async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 0;
    }

    // Don't retry on 4xx errors (except 429 rate limit)
    if (
      error.response?.status >= 400 &&
      error.response?.status < 500 &&
      error.response?.status !== 429
    ) {
      return Promise.reject(error);
    }

    if (config.retry >= retries) {
      return Promise.reject(error);
    }

    config.retry += 1;

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, config.retry - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (__DEV__) {
      console.log(`Retrying request (${config.retry}/${retries})...`);
    }

    return axiosClient(config);
  });
};

// Helper function to check API health
export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    await axiosClient.get("/health");
    return true;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
};

// Helper to clear all auth data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem("auth_token");
    // Add any other auth-related storage keys here
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

export default axiosClient;




// src/api/chat.ts




// src/api/chatData.ts
// lib/chatData.ts
export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  createdAt: string; // ISO
  type?: 'text' | 'image' | 'system';
};

export type Chat = {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar?: string;
  leaderOnline?: boolean;
  lastMessage?: string;
  lastMessageAt?: string; // ISO
  unreadCount?: number;
  messages: Message[];
};

const now = new Date();

const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

export const DUMMY_CHATS: Chat[] = [
  {
    id: '1',
    leaderId: 'u_101',
    leaderName: 'Amit Sharma',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmRq0a_frE8gwzWtWvJSav54nBpgBCJh21lHB4mdigWa2KM9foYQiyxRQcpjKUUSOcGB28_C5qCX1Gtrmd4FpNsil-hjbiJqdzHYc45idTwJdsKkZhZS8nAsCE_-UuA1qFYWI5A80kp-t7JVxZhgvhVh1v2-CY_FbY0hYpwVxLfYsqORT5PF_hoh7JxnkYSes7-WgZTcvsnKzah_Ooj_USwQ_2Kx1R8pRdQyLN2HMMyKt1_fEK6fP_OGFMcozO5YlxMtwwTzf5Grc',
    leaderOnline: true,
    lastMessage: 'See you at the meeting!',
    lastMessageAt: minutesAgo(2),
    unreadCount: 2,
    messages: [
      { id: 'm1', chatId: 'chat_1', senderId: 'u_101', text: 'Hey 👋', createdAt: hoursAgo(2) },
      {
        id: 'm2',
        chatId: 'chat_1',
        senderId: 'me',
        text: 'Hi! Are we on for today?',
        createdAt: hoursAgo(2),
      },
      {
        id: 'm3',
        chatId: 'chat_1',
        senderId: 'u_101',
        text: 'Yes, 4 PM',
        createdAt: minutesAgo(120),
      },
    ],
  },

  {
    id: '2',
    leaderId: 'u_102',
    leaderName: 'Neha Verma',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAnWDXimVfKM_z6Z7EeMILgDSPB3VDgIUweww-T8LkOo-hSlMozt3IWuGu6IBjTatmP7LzK9CdTUEVoRAEhtLdr3ikxHMVpAzWUiLpnZTzIakthR85TmCZQu6PkRt8-GfqSSjc_R3jALEUkCZyu4yX8AJEuaLd8LwqM0VKGBN2BTzMfv_hNw2giB_r3etdidOC4_IICFOFPDZvM7dNyIiYsPuv7_jO06nBuIY_OgjEs1txNB1YUHnJOdH-U2cVP7HTN--BgoC2bLVU',
    leaderOnline: false,
    lastMessage: 'Got it, thanks!',
    lastMessageAt: minutesAgo(10),
    unreadCount: 0,
    messages: [
      {
        id: 'm4',
        chatId: 'chat_2',
        senderId: 'u_102',
        text: 'Please review the doc',
        createdAt: hoursAgo(1),
      },
      { id: 'm5', chatId: 'chat_2', senderId: 'me', text: 'Done ✅', createdAt: minutesAgo(10) },
    ],
  },

  {
    id: '3',
    leaderId: 'u_103',
    leaderName: 'Rohit Singh',
    leaderAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJFZwsiExAtbGLIS8vehMxfbwygtfBMi6Y3OXa96cZrGAowv-hEx9r2uNgqCDujh1jPzLowAX-GdAbAVikEKW-xbqIJ6eian5-Bv0szW_Os5oiaWjMHcakeqmwdHz1ynhWAWpv27Uu5pp7ezmvCa5m3pKWW9deoF_vvQ32p67nzyjhdRbKlzJEJw4UQ96KROu1ZSfSctAgGw8TAdV3e_ybSO-lPyZ3_vxuuueqG8ymfUHGlpg1O8VZOOhbk_uUYN2-nlWRxjgu9Fc',
    leaderOnline: false,
    lastMessage: 'Sent the files!',
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
    messages: [
      {
        id: 'm6',
        chatId: 'chat_3',
        senderId: 'u_103',
        text: 'I uploaded the assets',
        createdAt: hoursAgo(1),
      },
      {
        id: 'm7',
        chatId: 'chat_3',
        senderId: 'me',
        text: 'Thanks — will check',
        createdAt: minutesAgo(55),
      },
    ],
  },
];

export default DUMMY_CHATS;




// src/api/index.ts
// src/api/index.js
import axiosClient from './axiosClient';

/**
 * Setup livestream session
 * Returns: { sessionId }
 */
export async function setupLive(payload) {
  const body = {
    userId: payload.userId,
    title: payload.title,
    description: payload.description,
    scheduledStartTime: payload.scheduledStartTime,
    youtube: payload.youtube || false,
    facebook: payload.facebook || false,
    instagram: payload.instagram || false,
    overlays: {
      bannerText: payload.bannerText || '',
      logoUrl: payload.logoUrl || '',
      ticker: payload.ticker || '',
    },
  };
  const { data } = await axiosClient.post('/api/v1/streams/setup', body);
  console.log('Hello', data.data.sessionId);
  return data?.data.sessionId; // { sessionId }
}

/**
 * Start FFmpeg + WebRTC pipeline
 */
/**
 * Start FFmpeg + WebRTC pipeline
 */
export async function startLive(sessionId, sdp) {
  console.log('Sending Offer for session:', sessionId);
  // You MUST send 'sdp' if you want WebRTC to work!
  const { data } = await axiosClient.post('/api/v1/streams/start', {
    sessionId,
    sdp,
  });
  return data;
}

/**
 * Stop livestream
 */
export async function stopLive(sessionId) {
  const { data } = await axiosClient.post('/api/v1/streams/stop', {
    sessionId,
  });
  return data; // { stopped: true }
}

/**
 * Update stream overlays
 */
export async function updateOverlays(sessionId, overlays) {
  const { data } = await axiosClient.post('/api/v1/streams/overlays/update', {
    sessionId,
    overlays,
  });
  return data; // { ok: true }
}




// src/api/socialMedia.ts
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




// src/api/user.ts
import axiosClient from './axiosClient';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  stateId?: string;
  cityId?: string;
  block?: string;
  village?: string;
}

export const getUserProfile = async () => {
  const response = await axiosClient.get('/api/v1/user/profile');
  return response.data;
};

// export const updateUserProfile = async (data: UpdateProfileRequest) => {
//   const response = await axiosClient.put('/api/v1/user/update', data);
//   return response.data;
// };
//
// export const getUserStreams = async () => {
//   const response = await axiosClient.get('/api/v1/user/streams');
//   return response.data;
// };
//
// export const getUserPosts = async () => {
//   const response = await axiosClient.get('/api/v1/user/posts');
//   return response.data;
// };
//
// export const getHome = async () => {
//   const response = await axiosClient.get('/api/v1/home');
//   return response.data;
// };
//
// export const getStreams = async () => {
//   const response = await axiosClient.get('/api/v1/streams');
//   return response.data;
// };
//
// export const getCommunity = async () => {
//   const response = await axiosClient.get('/api/v1/community');
//   return response.data;
// };




// src/api/youtube.ts
import axiosClient from './axiosClient';

export const createYouTubeLive = async (payload: {
  userId: string;
  title: string;
  description: string;
  scheduledStartTime: string; // ISO string
}) => {
  const { data } = await axiosClient.post(`/api/v1/streams/create-live`, payload);
  return data; // contains ingestion info
};




