// src/webrtc/helpers.ts
import { Camera } from 'expo-camera';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

export const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  // { urls: 'stun:stun1.l.google.com:19302' },
  // { urls: 'stun:global.stun.twilio.com:3478?transport=udp'  },
];

/**
 * Proper Permission Function
 */
export async function requestPermissions() {
  const camera = await Camera.requestCameraPermissionsAsync();
  const audio = await Camera.requestMicrophonePermissionsAsync();

  return {
    cameraGranted: camera.status === 'granted',
    audioGranted: audio.status === 'granted',
  };
}

/**
 * Helper to format seconds in HH:MM:SS
 */
export function formatSeconds(s: number) {
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

/**
 * FIXED: WebRTC getLocalStream
 */
export async function getLocalStream(
  facingMode: 'user' | 'environment' = 'environment',
  audio = true
): Promise<MediaStream> {
  console.log('Getting user media with facingMode:', facingMode);

  const constraints = {
    audio: audio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : false,
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  };

  try {
    const stream = (await mediaDevices.getUserMedia(constraints)) as MediaStream;
    console.log('Stream obtained:', stream.id);
    console.log(
      'Video tracks:',
      stream.getVideoTracks().map((t) => ({ id: t.id, enabled: t.enabled }))
    );
    console.log(
      'Audio tracks:',
      stream.getAudioTracks().map((t) => ({ id: t.id, enabled: t.enabled }))
    );
    return stream;
  } catch (error) {
    console.error('getUserMedia error:', error);
    throw error;
  }
}

/**
 * Get Screen Share Stream
 */
export async function getScreenStream(audio = true): Promise<MediaStream> {
  try {
    // @ts-ignore - getDisplayMedia signature varies by version
    const stream = await mediaDevices.getDisplayMedia({
      video: true,
      audio: audio,
    });
    return stream as MediaStream;
  } catch (err) {
    console.error('Error getting screen stream:', err);
    throw err;
  }
}
