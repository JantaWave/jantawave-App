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
    youtubeKey: payload.youtube || '',
    facebookKey: payload.facebook || '',
    instagramKey: payload.instagram || '',
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
export async function startLive(sessionId) {
  const { data } = await axiosClient.post('/api/v1/streams/start', {
    sessionId,
  });
  return data;
  /**
   * {
   *   sessionId,
   *   ports: { audioPort, videoPort },
   *   ff: { pid }
   * }
   */
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
