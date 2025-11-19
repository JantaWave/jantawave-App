// import React, { useEffect, useRef, useState } from 'react';
// import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
//
// import { RTCPeerConnection, mediaDevices, RTCView } from 'react-native-webrtc';
//
// export default function StartStreamScreen() {
//   const router = useRouter();
//   const { rtmpUrl } = useLocalSearchParams();
//
//   const [pc, setPc] = useState<RTCPeerConnection | null>(null);
//   const [stream, setStream] = useState(null);
//   const [isLive, setIsLive] = useState(false);
//   const [secs, setSecs] = useState(0);
//
//   const wsRef = useRef<WebSocket | null>(null);
//
//   // Timer
//   useEffect(() => {
//     let t;
//     if (isLive) t = setInterval(() => setSecs((s) => s + 1), 1000);
//
//     return () => clearInterval(t);
//   }, [isLive]);
//
//   // 1) Start local camera + mic
//   const startLocalStream = async () => {
//     const s = await mediaDevices.getUserMedia({
//       audio: true,
//       video: {
//         facingMode: 'user',
//         frameRate: 30,
//       },
//     });
//
//     setStream(s);
//   };
//
//   // WebSocket to backend (mediasoup)
//   const connectSocket = () => {
//     return new Promise((resolve) => {
//       const ws = new WebSocket('wss://yourbackend.com/mediasoup');
//
//       ws.onopen = () => {
//         console.log('WS connected');
//         wsRef.current = ws;
//         resolve(ws); // <--- return WebSocket
//       };
//
//       ws.onerror = (err) => {
//         console.log('WS error:', err);
//         resolve(null);
//       };
//     });
//   };
//
//   // Start WebRTC for streaming
//   const startWebRTC = async () => {
//     if (!stream) return;
//
//     const ws = await connectSocket();
//     if (!ws || ws.readyState !== 1) {
//       // 1 = OPEN
//       alert('WebSocket failed to connect. Check backend.');
//       return;
//     }
//
//     // --- NOW it is safe ---
//     ws.onmessage = async (msg) => {
//       const data = JSON.parse(msg.data);
//       if (data.answer) {
//         await pc.setRemoteDescription(data.answer);
//       }
//       if (data.iceCandidate) {
//         await pc.addIceCandidate(data.iceCandidate);
//       }
//     };
//
//     const peerConnection = new RTCPeerConnection({
//       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
//     });
//
//     setPc(peerConnection);
//
//     stream.getTracks().forEach((track) => {
//       peerConnection.addTrack(track, stream);
//     });
//
//     peerConnection.onicecandidate = (event) => {
//       if (event.candidate) {
//         ws.send(JSON.stringify({ iceCandidate: event.candidate }));
//       }
//     };
//
//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);
//
//     ws.send(JSON.stringify({ offer, rtmpUrl }));
//
//     setIsLive(true);
//   };
//
//   const stopStream = () => {
//     pc?.close();
//     stream?.getTracks()?.forEach((t) => t.stop());
//     wsRef.current?.close();
//
//     setIsLive(false);
//     setSecs(0);
//
//     router.back(); // safe now
//   };
//
//   // Start camera on mount
//   useEffect(() => {
//     startLocalStream();
//
//     // Cleanup (NO navigation here!)
//     return () => {
//       pc?.close();
//       stream?.getTracks()?.forEach((t) => t.stop());
//       wsRef.current?.close();
//     };
//   }, []);
//
//   const formatTime = (s) =>
//     `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
//
//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
//       {/* Camera Preview */}
//       <View style={{ flex: 1 }}>
//         {stream && (
//           <RTCView
//             streamURL={stream.toURL()}
//             style={{ width: '100%', height: '100%' }}
//             objectFit="cover"
//           />
//         )}
//       </View>
//
//       {/* Controls */}
//       <View style={{ padding: 15, backgroundColor: '#0008' }}>
//         {isLive ? (
//           <>
//             <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
//               LIVE • {formatTime(secs)}
//             </Text>
//             <TouchableOpacity
//               onPress={stopStream}
//               style={{ backgroundColor: 'red', paddingVertical: 14, borderRadius: 10 }}>
//               <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
//                 Stop Stream
//               </Text>
//             </TouchableOpacity>
//           </>
//         ) : (
//           <TouchableOpacity
//             onPress={startWebRTC}
//             style={{ backgroundColor: 'green', paddingVertical: 14, borderRadius: 10 }}>
//             <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Go Live</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </SafeAreaView>
//   );
// }

// src/screens/StartStreamScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

import { RTCView, MediaStreamTrack } from 'react-native-webrtc';

import { getLocalStream, requestPermissions, formatSeconds } from '../webrtc/helpers';
import { StreamConnection } from '../webrtc/connections';
import { setupLive } from '../api';

export default function StartStreamScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();

  console.log('got sessionId as:', sessionId);

  const connRef = useRef<StreamConnection | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const [streamStatus, setStreamStatus] = useState('Ready');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  /* ----------------------------------
      TIMER
  -----------------------------------*/
  useEffect(() => {
    let timer: any;
    if (isStreaming) {
      timer = setInterval(() => setSecs((s) => s + 1), 1000);
    } else {
      setSecs(0);
    }
    return () => clearInterval(timer);
  }, [isStreaming]);

  /* ----------------------------------
      PERMISSIONS → START PREVIEW
  -----------------------------------*/
  useEffect(() => {
    (async () => {
      const { cameraGranted, audioGranted } = await requestPermissions();

      if (!cameraGranted || !audioGranted) {
        Alert.alert('Permissions required', 'Camera + microphone required');
        return;
      }

      const stream = await getLocalStream(facingMode, true);
      setLocalStream(stream);
    })();
  }, []);

  /* ----------------------------------
      START STREAMING
  -----------------------------------*/
  const startStreaming = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'Missing sessionId from previous screen.');
      return;
    }

    try {
      setStreamStatus('Connecting...');

      // Initialize WebRTC client
      const conn = new StreamConnection({
        onConnectionState: (state) => {
          setStreamStatus(state);

          if (state === 'connected') {
            setIsStreaming(true);
          }
          if (state === 'failed') {
            setIsStreaming(false);
            setStreamStatus('Failed');
          }
        },
        onError: (e) => {
          Alert.alert('WebRTC Error', e.message);
          setIsStreaming(false);
        },
      });

      connRef.current = conn;

      // STEP 1 — Connect producer tracks to mediasoup
      await conn.connect(localStream, { sessionId });

      // STEP 2 — tell backend to start FFmpeg + RTMP
      const response = await startLive(sessionId);
      console.log('startLive', response);

      setStreamStatus('Live');
      setIsStreaming(true);
    } catch (err) {
      console.log('Stream error', err);
      Alert.alert('Stream Error', String(err));
      setStreamStatus('Error');
    }
  };

  /* ----------------------------------
      STOP STREAMING
  -----------------------------------*/
  const stopStreaming = async () => {
    try {
      setStreamStatus('Stopping...');
      setIsStreaming(false);
      await connRef.current?.stop();
      connRef.current = null;

      setTimeout(() => router.back(), 500);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  /* ----------------------------------
      SWITCH CAMERA
  -----------------------------------*/
  const switchCamera = async () => {
    try {
      const newFacing = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacing);

      const newStream = await getLocalStream(newFacing, true);

      // replace local preview
      localStream?.getVideoTracks()?.forEach((t: MediaStreamTrack) => t.stop());
      setLocalStream(newStream);

      // replace track in WebRTC
      const videoTrack = newStream.getVideoTracks()[0];
      await connRef.current?.replaceVideoTrack(videoTrack);
    } catch (err) {
      Alert.alert('Error switching camera', String(err));
    }
  };

  /* ----------------------------------
      MUTE / UNMUTE
  -----------------------------------*/
  const toggleMute = async () => {
    try {
      const newMuted = !isMuted;
      setIsMuted(newMuted);

      localStream?.getAudioTracks()?.forEach((t: MediaStreamTrack) => {
        t.enabled = !newMuted;
      });

      await connRef.current?.replaceAudioEnabled(!newMuted);
    } catch (err) {
      Alert.alert('Mute Error', String(err));
    }
  };

  /* ----------------------------------
      PERMISSION UI BLOCK
  -----------------------------------*/
  if (!cameraPermission || !micPermission)
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );

  if (!cameraPermission.granted || !micPermission.granted)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: 'white', padding: 20 }}>We need permissions</Text>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}>
          <Text style={styles.btnText}>Grant</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  /* ----------------------------------
      MAIN UI
  -----------------------------------*/
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* WebRTC Preview */}
      <View style={styles.previewContainer}>
        {localStream ? (
          <RTCView streamURL={localStream.toURL()} style={styles.preview} objectFit="cover" />
        ) : (
          <Text style={{ color: 'white' }}>Loading camera...</Text>
        )}

        {isStreaming && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>
        )}

        <View style={styles.statusIndicator}>
          <Text style={styles.statusText}>{streamStatus}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isStreaming ? (
          <>
            <Text style={styles.liveText}>LIVE • {formatSeconds(secs)}</Text>
            <TouchableOpacity style={[styles.btn, styles.stopBtn]} onPress={stopStreaming}>
              <Text style={styles.btnText}>Stop Stream</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={startStreaming}>
            <Text style={styles.btnText}>Go Live</Text>
          </TouchableOpacity>
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.smallBtn} onPress={toggleMute}>
            <Text style={styles.smallBtnText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn} onPress={switchCamera}>
            <Text style={styles.smallBtnText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* Keep all your existing styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  previewContainer: { flex: 1, position: 'relative' },
  preview: { flex: 1 },
  liveIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(255,0,0,0.8)',
    padding: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  liveIndicatorText: { color: 'white', fontWeight: 'bold' },
  statusIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 10,
  },
  statusText: { color: 'white', fontWeight: '600' },
  controls: { padding: 12, backgroundColor: '#0007' },
  btn: { paddingVertical: 14, borderRadius: 10, marginBottom: 10 },
  startBtn: { backgroundColor: 'green' },
  stopBtn: { backgroundColor: 'red' },
  btnText: { color: 'white', textAlign: 'center', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  smallBtnText: { color: 'white', textAlign: 'center' },
  liveText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  urlContainer: { marginTop: 12, padding: 12, backgroundColor: '#222', borderRadius: 8 },
  urlLabel: { color: '#888', fontSize: 10, marginBottom: 6 },
  hintText: { color: '#ddd', fontSize: 11 },
});
