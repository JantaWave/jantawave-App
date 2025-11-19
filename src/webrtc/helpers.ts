// src/webrtc/helpers.ts
import { Camera } from "expo-camera";
import * as Audio from "expo-av";
import { MediaStream } from "react-native-webrtc";

export const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
  {
    urls: "turn:myturn.example.com:3478",
    username: "turnuser",
    credential: "turnpass"
  }
] as RTCIceServer[];

export async function requestPermissions() {
  const camera = await Camera.requestCameraPermissionsAsync();
  const audio = await Audio.Audio.requestPermissionsAsync();
  return {
    cameraGranted: camera.status === "granted",
    audioGranted: audio.status === "granted"
  };
}

/**
 * Format seconds to HH:MM:SS
 */
export function formatSeconds(s: number) {
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/**
 * Helper to get local media stream using react-native-webrtc API
 * We intentionally use constraints that allow switching facingMode
 */
export async function getLocalStream(facingMode: "user" | "environment" = "user", audio = true) {
  // react-native-webrtc exposes mediaDevices
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mediaDevices } = require("react-native-webrtc");

  const constraints = {
    audio,
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  };

  const stream: MediaStream = await mediaDevices.getUserMedia(constraints);
  return stream;
}

