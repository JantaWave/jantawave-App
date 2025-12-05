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
  return data?.data;
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

export async function getPresignedUrl(fileName, fileType) {
  try {
    const response = await axiosClient.post('/api/v1/upload/presigned-url', {
      fileName,
      fileType,
    });

    console.log('🔍 Presigned URL Response:', response.data);

    // Handle cases where response might be wrapped in 'data' or returned directly
    // If backend sends { success: true, data: { ... } } -> we need response.data.data
    // If backend sends { uploadUrl: ... } directly -> we need response.data
    const result = response.data?.data || response.data;

    if (!result || !result.uploadUrl) {
      throw new Error('Invalid server response: Missing uploadUrl');
    }

    return result;
  } catch (error) {
    console.error('❌ API Error (getPresignedUrl):', error);
    throw error;
  }
}

export async function createPost(payload) {
  console.log('payload', payload);
  const { data } = await axiosClient.post('/api/v1/posts/create', payload);
  console.log(data);
  return data.data;
}

export async function getUserPosts(userId) {
  const { data } = await axiosClient.get(`/api/v1/posts/user/${userId}`);
  return data.data; // Returns array of posts
}

export const togglePostLike = async (postId, userId) => {
  console.log(userId, postId, 'in togglelike fn');
  const res = await axiosClient.post(`/api/v1/posts/${postId}/${userId}/like`);
  console.log(res);
  return res.data; // { liked: true/false }
};

export const getPostComments = async (postId) => {
  const res = await axiosClient.get(`/api/v1/posts/${postId}/comments`);
  console.log(res.data);
  return res.data;
};

export const commentOnPost = async (postId, content, parentCommentId) => {
  const res = await axiosClient.post(`/api/v1/posts/${postId}/comment`, {
    content,
    parentCommentId,
  });
  console.log(res.data);
  return res.data;
};
