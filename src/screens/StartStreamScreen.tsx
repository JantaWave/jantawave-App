import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  Monitor,
  MessageCircle,
  Users,
  X,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
// import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import axios from 'axios'; // ✅ ADDED

// WebRTC imports
import { RTCView, MediaStream, registerGlobals } from 'react-native-webrtc';
import { StreamConnection } from '../webrtc/connections';
import { getLocalStream, getScreenStream } from '../webrtc/helpers'; // ✅ ADDED

// Env var for backend restart
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const platforms = [
  { id: 'instagram', name: 'Instagram', color: ['#833ab4', '#fd1d1d', '#fcb045'], icon: '📸' },
  { id: 'facebook', name: 'Facebook', color: ['#1877F2', '#1877F2'], icon: '📘' },
  { id: 'youtube', name: 'YouTube', color: ['#FF0000', '#FF0000'], icon: '▶️' },
];

const mockCommentsData = [
  { id: 1, user: 'sarah_m', text: 'Love this stream! 🔥', platform: 'Instagram' },
  { id: 2, user: 'tech_guru', text: 'Great quality!', platform: 'YouTube' },
  { id: 3, user: 'mike.j', text: 'Hello from NYC!', platform: 'Facebook' },
];

export default function StartStreamScreen() {
  // useKeepAwake(); // Keep screen on
  const router = useRouter();
  const { sessionId, scheduledTime } = useLocalSearchParams();

  // --- WebRTC State ---
  const [hasWebRTC, setHasWebRTC] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [streamStatus, setStreamStatus] = useState('Ready');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false); // ✅ Screen Share State

  // --- UI State ---
  const [showComments, setShowComments] = useState(true);
  const [activePlatformIndex, setActivePlatformIndex] = useState(0);
  const [comments, setComments] = useState(mockCommentsData);
  const [viewers, setViewers] = useState({ youtube: 0, facebook: 0, total: 0 });
  const [likes, setLikes] = useState(0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // --- Refs ---
  const connRef = useRef<StreamConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Permissions ---
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicrophonePermission] = useMicrophonePermissions();

  // 1. Initialize WebRTC & Background Audio
  useEffect(() => {
    registerGlobals();
    if (global.RTCPeerConnection) setHasWebRTC(true);

    // ✅ Enable Background Audio Mode (Critical for Screen Share)
    const enableBackgroundMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('Failed to set audio mode:', e);
      }
    };
    enableBackgroundMode();

    if (scheduledTime) {
      const target = new Date(scheduledTime as string).getTime();
      const interval = setInterval(() => {
        const diff = Math.ceil((target - Date.now()) / 1000);
        if (diff <= 0) {
          setTimeLeft(0);
          clearInterval(interval);
        } else {
          setTimeLeft(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [scheduledTime]);

  // 2. Start Camera Preview
  useEffect(() => {
    let mounted = true;
    const initCamera = async () => {
      if (cameraPermission?.granted && micPermission?.granted) {
        // Start with Camera
        const stream = await getLocalStream(facing, true);
        if (mounted) {
          localStreamRef.current = stream;
          setFacing((prev) => prev);
        }
      }
    };
    initCamera();
    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current.release();
      }
    };
  }, [cameraPermission, micPermission]);

  // 3. UI Simulation Effects
  useEffect(() => {
    if (!isStreaming) return;

    const platformInterval = setInterval(() => {
      setActivePlatformIndex((prev) => (prev + 1) % platforms.length);
    }, 3000);

    const durationInterval = setInterval(() => {
      setStreamDuration((prev) => prev + 1);
    }, 1000);

    const commentInterval = setInterval(() => {
      const randomC = mockCommentsData[Math.floor(Math.random() * mockCommentsData.length)];
      const newC = {
        ...randomC,
        id: Date.now(),
        text: randomC.text + ' ' + ['🔥', '❤️', '👏'][Math.floor(Math.random() * 3)],
      };
      setComments((prev) => [...prev.slice(-4), newC]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 4000);

    const likeInterval = setInterval(() => {
      setLikes((prev) => prev + Math.floor(Math.random() * 5) + 1);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 500);
    }, 2000);

    return () => {
      clearInterval(platformInterval);
      clearInterval(durationInterval);
      clearInterval(commentInterval);
      clearInterval(likeInterval);
    };
  }, [isStreaming]);

  // --- Logic Functions ---

  const startStreaming = async () => {
    if (!sessionId) return Alert.alert('Error', 'Missing sessionId.');
    if (!hasWebRTC) return Alert.alert('Error', 'WebRTC not available.');

    try {
      setStreamStatus('Initializing...');

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await getLocalStream(facing, true);
        localStreamRef.current = stream;
      }

      const conn = new StreamConnection({
        onConnectionState: (state) => {
          if (state === 'connected') setIsStreaming(true);
          if (state === 'failed' || state === 'disconnected') {
            setIsStreaming(false);
            setStreamStatus('Disconnected');
          }
        },
        onError: (e) => {
          Alert.alert('Stream Error', e.message);
          setIsStreaming(false);
        },
      });

      connRef.current = conn;
      setStreamStatus('Connecting...');
      await conn.connect(stream, { sessionId });

      conn.socket?.on('social_update', (data: any) => {
        console.log('Received social update:', data);
        if (data.views !== undefined) {
          console.log('views:', data.views);
          setViewers(data.views);
        }
        if (data.comments && data.comments.length > 0) {
          // Append new comments (avoid duplicates via ID check if needed)
          setComments((prev) => {
            // Simple merge strategy: take the last 10 from server
            return data.comments.slice(-10).reverse();
          });
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      });

      setIsStreaming(true);
      setStreamStatus('Live');
    } catch (err) {
      Alert.alert('Error', String(err));
      setIsStreaming(false);
    }
  };

  const stopStreaming = async () => {
    if (connRef.current) await connRef.current.stop();
    connRef.current = null;
    setIsStreaming(false);
    setStreamStatus('Stopped');
    router.back();
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop Screen
        await connRef.current?.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        // Start Screen
        const stream = await getScreenStream(!isMuted);
        await connRef.current?.startScreenShare(stream);
        setIsScreenSharing(true);
      }

      // ✅ RESTART FFmpeg to pick up new layout
      if (isStreaming) {
        await axios.post(`${BACKEND_URL}/api/v1/streams/restart`, { sessionId });
      }
    } catch (e) {
      console.error('Screen Share Error:', e);
      Alert.alert('Error', 'Failed to toggle screen share.');
    }
  };

  const switchCamera = async () => {
    // Disable camera switch if screen sharing is active (optional choice)
    // if (isScreenSharing) return;

    const newFacing = facing === 'user' ? 'environment' : 'user';
    setFacing(newFacing);

    const newStream = await getLocalStream(newFacing, !isMuted);

    if (isStreaming && connRef.current) {
      const videoTrack = newStream.getVideoTracks()[0];
      await connRef.current.replaceVideoTrack(videoTrack);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
    }
    localStreamRef.current = newStream;
  };

  const toggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    }
  };

  const toggleVideo = async () => {
    try {
      const newVideoState = !isCameraOn;
      setIsCameraOn(newVideoState);

      // 1. Toggle Local Track (Visual feedback for user)
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = newVideoState));
      }

      // 2. ✅ Notify Backend to switch layout (Real Camera vs Placeholder)
      if (isStreaming) {
        await axios.post(`${BACKEND_URL}/api/v1/streams/restart`, {
          sessionId,
          isCameraOn: newVideoState, // Send the new state
        });
      }
    } catch (e) {
      console.error('Toggle Video Error:', e);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activePlatform = platforms[activePlatformIndex];

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <Text className="mb-4 text-white">Permissions required</Text>
        <TouchableOpacity
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
          className="rounded-lg bg-blue-500 px-4 py-2">
          <Text className="text-white">Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-gray-900">
      <StatusBar style="light" />

      {/* --- 1. Main Video Layer --- */}
      <View className="absolute inset-0 bg-gray-800">
        {isCameraOn && localStreamRef.current ? (
          <RTCView
            streamURL={localStreamRef.current.toURL()}
            style={{ width: '100%', height: '100%' }}
            objectFit="cover"
            // Don't mirror if sharing screen or using back camera
            mirror={!isScreenSharing && facing === 'user'}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-900">
            <CameraOff color="#666" size={64} />
            <Text className="mt-4 text-gray-500">Camera Off</Text>
          </View>
        )}
      </View>

      {/* ... (Top Overlay: Same as before) ... */}
      <SafeAreaView className="absolute left-0 right-0 top-0 z-20 flex-row items-start justify-between p-4">
        {/* ... (Copy existing top overlay code) ... */}
        <View className="flex-col gap-2">
          {isStreaming ? (
            <>
              <View className="flex-row items-center self-start rounded-full bg-red-600 px-3 py-1.5">
                <View className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
                <Text className="mr-2 text-xs font-bold text-white">LIVE</Text>
                <Text className="font-mono text-xs text-white/80">
                  {formatDuration(streamDuration)}
                </Text>
              </View>
              <View className="flex-row items-center self-start rounded-full px-3 py-1.5">
                <Text className="mr-1 text-xs">{activePlatform.icon}</Text>
                <Text className="text-xs font-bold text-white">{activePlatform.name}</Text>
              </View>
            </>
          ) : (
            <View className="rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
              <Text className="text-xs font-bold text-white">PREVIEW</Text>
            </View>
          )}
        </View>

        <View className="flex-col items-end gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-2 rounded-full bg-black/40 p-2">
            <X color="white" size={24} />
          </TouchableOpacity>
          {isStreaming && (
            <>
              <View className="mb-1 flex-row items-center rounded-full bg-black/60 px-3 py-1.5">
                <Users color="white" size={14} />
                <Text className="ml-1.5 text-xs font-bold text-white">
                  {viewers.toLocaleString()}
                </Text>
              </View>
              <View className={`flex-row items-center rounded-full bg-black/60 px-3 py-1.5 `}>
                <Heart
                  color={showLikeAnimation ? '#ef4444' : 'white'}
                  fill={showLikeAnimation ? '#ef4444' : 'transparent'}
                  size={14}
                />
                <Text className="ml-1.5 text-xs font-bold text-white">
                  {likes.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ... (Comments Overlay: Same as before) ... */}
      {isStreaming && showComments && (
        <View className="absolute bottom-40 left-4 z-10 w-72">
          {/* ... Copy comments UI ... */}
          <View className="max-h-48">
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}>
              {comments.map((c) => (
                <View key={c.id} className="flex-row items-start rounded-xl bg-black/40 px-3 py-2">
                  <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-gray-600">
                    <Text className="text-xs">👤</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="mr-2 text-xs font-bold text-white">{c.user}</Text>
                      <Text className="rounded bg-white/10 px-1 text-[10px] text-white/50">
                        {c.platform}
                      </Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-white/90">{c.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Toggle Comments Button */}
      {isStreaming && !showComments && (
        <TouchableOpacity
          onPress={() => setShowComments(true)}
          className="absolute bottom-40 left-4 rounded-full bg-black/50 p-2">
          <ChevronUp color="white" size={20} />
        </TouchableOpacity>
      )}

      {/* --- 4. Bottom Controls --- */}
      <View className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-0">
        <View className="mb-6 flex-row items-center justify-center gap-6">
          <TouchableOpacity
            onPress={toggleMute}
            className={`h-12 w-12 items-center justify-center rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-500'}`}>
            {isMuted ? <MicOff color="white" size={20} /> : <Mic color="white" size={20} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleVideo}
            className={`h-12 w-12 items-center justify-center rounded-full ${!isCameraOn ? 'bg-red-500' : 'bg-gray-500'}`}>
            {!isCameraOn ? (
              <CameraOff color="white" size={20} />
            ) : (
              <Camera color="white" size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={switchCamera}
            className="h-12 w-12 items-center justify-center rounded-full bg-gray-500">
            <RefreshCw color="white" size={20} />
          </TouchableOpacity>

          {/* ✅ Screen Share Button */}
          <TouchableOpacity
            onPress={toggleScreenShare}
            className={`h-12 w-12 items-center justify-center rounded-full ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-500'}`}>
            <Monitor color="white" size={20} />
          </TouchableOpacity>
        </View>

        {timeLeft > 0 ? (
          <View className="w-full items-center rounded-2xl bg-gray-700 py-4">
            <Text className="text-lg font-bold text-white">
              Going Live in {formatCountdown(timeLeft)}
            </Text>
          </View>
        ) : !isStreaming ? (
          <TouchableOpacity onPress={startStreaming}>
            <View className="w-full items-center rounded-2xl py-4">
              <Text className="text-lg font-bold text-white">Go Live Now</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={stopStreaming}
            className="w-full items-center rounded-2xl bg-red-600 py-4">
            <Text className="text-lg font-bold text-white">End Stream</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Heart */}
      {showLikeAnimation && (
        <View className="absolute bottom-48 right-8">
          <Heart color="#ef4444" fill="#ef4444" size={32} />
        </View>
      )}
    </View>
  );
}
