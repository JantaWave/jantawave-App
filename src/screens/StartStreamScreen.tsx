import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform, // Ensure Platform is imported
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 1. IMPORT SAFE AREA INSETS HOOK
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mediaDevices } from 'react-native-webrtc';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RefreshCw,
  Monitor,
  Users,
  X,
  Heart,
  ChevronUp,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import axios from 'axios';

// WebRTC imports
import { RTCView, MediaStream, registerGlobals } from 'react-native-webrtc';
import { StreamConnection } from '../webrtc/connections';
import { getLocalStream, getScreenStream } from '../webrtc/helpers';
import { restartStream } from '../api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const platforms = [
  { id: 'instagram', name: 'Instagram', color: ['#833ab4', '#fd1d1d', '#fcb045'], icon: '📸' },
  { id: 'facebook', name: 'Facebook', color: ['#1877F2', '#1877F2'], icon: '📘' },
  { id: 'youtube', name: 'YouTube', color: ['#FF0000', '#FF0000'], icon: '▶️' },
];

export default function StartStreamScreen() {
  const router = useRouter();
  const { sessionId, scheduledTime } = useLocalSearchParams();

  // 2. GET INSETS
  const insets = useSafeAreaInsets();

  // --- WebRTC State ---
  const [hasWebRTC, setHasWebRTC] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [streamStatus, setStreamStatus] = useState('Ready');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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

    return () => {
      clearInterval(platformInterval);
      clearInterval(durationInterval);
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
        // 1. Update Viewers
        if (data.views) {
          setViewers((prev) => ({
            ...prev,
            youtube: data.views.youtube || 0,
            facebook: data.views.facebook || 0,
            // Recalculate total dynamically
            total: (data.views.youtube || 0) + (data.views.facebook || 0),
          }));
        }

        if (data.likes) {
          const newTotalLikes = (data.likes.youtube || 0) + (data.likes.facebook || 0);

          setLikes((prev) => {
            // If new likes are higher than previous, trigger animation
            if (newTotalLikes > prev) {
              setShowLikeAnimation(true);
              setTimeout(() => setShowLikeAnimation(false), 500);
            }
            return newTotalLikes;
          });
        }
        // 2. Update Comments
        if (data.comments && Array.isArray(data.comments) && data.comments.length > 0) {
          setComments((prevComments) => {
            // Create a Set of existing IDs to prevent duplicates
            const existingIds = new Set(prevComments.map((c) => c.id));

            // Filter out comments we already have
            const uniqueNewComments = data.comments.filter((c: any) => !existingIds.has(c.id));

            if (uniqueNewComments.length === 0) return prevComments;

            // Combine and keep only the last 50 to save memory
            const updated = [...prevComments, ...uniqueNewComments];
            return updated.slice(-50);
          });

          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
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
        setIsScreenSharing(false);
        await connRef.current?.stopScreenShare();
        if (isStreaming) {
          await restartStream(sessionId, isCameraOn);
        }
      } else {
        const stream = await getScreenStream(!isMuted);
        if (!stream) return;

        setIsScreenSharing(true);
        await connRef.current?.startScreenShare(stream);

        if (isStreaming) {
          setTimeout(async () => {
            console.log('Restarting FFmpeg for Screen Share...');
            await axios.post(`${BACKEND_URL}/api/v1/streams/restart`, {
              sessionId,
              isCameraOn: isCameraOn,
            });
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Screen Share Error:', e);
      setIsScreenSharing(false);
      Alert.alert('Error', 'Failed to toggle screen share.');
    }
  };

  const switchCamera = async () => {
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
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = newVideoState;
        });
      }
      if (isStreaming) {
        await restartStream(sessionId, newVideoState);
      }
    } catch (e) {
      console.error('Toggle Video Error:', e);
      setIsCameraOn(!isCameraOn);
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
            mirror={!isScreenSharing && facing === 'user'}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-900">
            <CameraOff color="#666" size={64} />
            <Text className="mt-4 text-gray-500">Camera Off</Text>
          </View>
        )}
      </View>

      {/* --- Top Overlay --- */}
      <SafeAreaView className="absolute left-0 right-0 top-0 z-20 flex-row items-start justify-between p-4">
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
              <View className="mb-1 flex-row items-center gap-2">
                {/* YouTube View Count */}
                <View className="flex-row items-center rounded-full bg-red-600/80 px-3 py-1.5">
                  <Text className="mr-1 text-[10px]">▶️</Text>
                  <Text className="ml-1 text-xs font-bold text-white">
                    {viewers.youtube.toLocaleString()}
                  </Text>
                </View>

                {/* Total View Count (Optional) */}
                <View className="flex-row items-center rounded-full bg-black/60 px-3 py-1.5">
                  <Users color="white" size={14} />
                  <Text className="ml-1.5 text-xs font-bold text-white">
                    {viewers.total.toLocaleString()}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* --- Comments Overlay --- */}
      {isStreaming && showComments && (
        <View className="absolute bottom-40 left-4 z-10 w-72">
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

      {isStreaming && !showComments && (
        <TouchableOpacity
          onPress={() => setShowComments(true)}
          className="absolute bottom-40 left-4 rounded-full bg-black/50 p-2">
          <ChevronUp color="white" size={20} />
        </TouchableOpacity>
      )}

      {/* --- 4. Bottom Controls --- */}
      {/* ✅ FIX: Applied paddingBottom based on insets 
        We use insets.bottom + 24 (original padding) so it clears the home bar.
      */}
      <View
        className="absolute bottom-0 left-0 right-0 z-20 p-6 pt-0"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 24 }}>
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

          <TouchableOpacity
            onPress={toggleScreenShare}
            className={`h-12 w-12 items-center justify-center rounded-full ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-500'}`}>
            <Monitor color="white" size={20} />
          </TouchableOpacity>
        </View>

        {timeLeft > 0 ? (
          <View className="w-full items-center rounded-2xl bg-gray-700 py-4">
            <Text className="text-lg font-bold text-white">
              Starting in {formatCountdown(timeLeft)}
            </Text>
          </View>
        ) : !isStreaming ? (
          <TouchableOpacity onPress={startStreaming}>
            <View className="w-full items-center rounded-2xl bg-blue-600 py-4">
              <Text className="text-lg font-bold text-white">Go Live Now</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stopStreaming}>
            <View className="w-full items-center rounded-2xl bg-red-600 py-4">
              <Text className="text-lg font-bold text-white">End Stream</Text>
            </View>
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
