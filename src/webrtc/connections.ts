// import { RTCPeerConnection, RTCIceCandidate, MediaStream } from 'react-native-webrtc';
//
// import { iceServers } from './helpers';
// import { startLive, stopLive } from '../api';
//
// type ConnectionEvents = {
//   onIceCandidate?: (c: RTCIceCandidate) => void;
//   onConnectionState?: (state: RTCPeerConnectionState) => void;
//   onLocalStreamReady?: (stream: MediaStream) => void;
//   onError?: (e: Error) => void;
// };
//
// export class StreamConnection {
//   pc: RTCPeerConnection | null = null;
//   localStream: MediaStream | null = null;
//   senders: RTCRtpSender[] = [];
//   streamId?: string;
//   reconnectAttempts = 0;
//   maxReconnect = 5;
//   pingTimer?: number;
//
//   private events: ConnectionEvents;
//
//   constructor(events: ConnectionEvents = {}) {
//     this.events = events;
//   }
//
//   async connect(localStream: MediaStream, setupPayload: any = {}) {
//     this.localStream = localStream;
//
//     await this.cleanupPC();
//
//     console.log('Creating RTCPeerConnection...');
//     const pc = (this.pc = new RTCPeerConnection({ iceServers }));
//
//     pc.onicecandidate = (ev) => {
//       if (ev.candidate && this.events.onIceCandidate) {
//         this.events.onIceCandidate(ev.candidate);
//       }
//     };
//
//     pc.onconnectionstatechange = () => {
//       this.events.onConnectionState?.(pc.connectionState);
//       if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
//         this._attemptReconnect();
//       }
//     };
//
//     // Add tracks
//     localStream.getTracks().forEach((track: any) => {
//       const sender = pc.addTrack(track, localStream);
//       this.senders.push(sender);
//     });
//
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//
//     const offerSdp = pc.localDescription?.sdp!;
//     const startResp = await startLive(setupPayload.sessionId, offerSdp);
//
//     if (!startResp?.sdp) throw new Error('No answer SDP from server');
//
//     const answer = {
//       type: 'answer',
//       sdp: startResp.sdp,
//     };
//
//     await pc.setRemoteDescription(answer);
//     this.streamId = startResp.streamId || this.streamId;
//
//     this._startPing();
//     return { streamId: this.streamId };
//   }
//
//   async replaceVideoTrack(newTrack: MediaStreamTrack) {
//     for (const sender of this.senders) {
//       if (sender.track && sender.track.kind === 'video') {
//         await sender.replaceTrack(newTrack);
//         return;
//       }
//     }
//
//     if (this.pc) {
//       const sender = this.pc.addTrack(newTrack);
//       this.senders.push(sender);
//     }
//   }
//
//   async replaceAudioEnabled(enabled: boolean) {
//     if (!this.localStream) return;
//     const audioTracks = this.localStream.getAudioTracks();
//     audioTracks.forEach((t) => (t.enabled = enabled));
//   }
//
//   async stop() {
//     try {
//       if (this.streamId) await stopLive(this.streamId);
//     } catch (e) {
//       console.warn('stopLive error', e);
//     }
//
//     this._stopPing();
//     await this.cleanupPC();
//
//     if (this.localStream) {
//       this.localStream.getTracks().forEach((t: any) => t.stop());
//       this.localStream = null;
//     }
//   }
//
//   private async cleanupPC() {
//     if (this.pc) {
//       try {
//         this.pc.getSenders().forEach((s) => s.track?.stop());
//       } catch {}
//
//       try {
//         this.pc.close();
//       } catch {}
//
//       this.pc = null;
//       this.senders = [];
//     }
//   }
//
//   private _attemptReconnect() {
//     this.reconnectAttempts++;
//     if (this.reconnectAttempts > this.maxReconnect) {
//       this.events.onError?.(new Error(`Max reconnect attempts reached: ${this.reconnectAttempts}`));
//       return;
//     }
//
//     const delay = Math.min(2000 * this.reconnectAttempts, 30000);
//
//     setTimeout(async () => {
//       try {
//         if (!this.localStream) return;
//         await this.connect(this.localStream, {});
//       } catch (e) {
//         console.warn('Reconnect failed', e);
//         this._attemptReconnect();
//       }
//     }, delay);
//   }
//
//   private _startPing() {
//     this._stopPing();
//     this.pingTimer = setInterval(() => {}, 10000) as unknown as number;
//   }
//
//   private _stopPing() {
//     if (this.pingTimer) clearInterval(this.pingTimer);
//     this.pingTimer = undefined;
//   }
// }

// src/webrtc/connections.ts
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import { registerGlobals } from 'react-native-webrtc';
import { startLive, stopLive } from '../api';

// Ensure WebRTC globals are registered for mediasoup-client
registerGlobals();
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ EXPO_PUBLIC_BACKEND_URL is missing in .env file!');
}

export class StreamConnection {
  socket: Socket | null = null;
  device: Device | null = null;
  producerTransport: any = null;
  audioProducer: any = null;
  videoProducer: any = null;
  screenProducer: any = null;
  sessionId: string | null = null;

  constructor() {}

  async connect(localStream: MediaStream, { sessionId }: { sessionId: string }) {
    this.sessionId = sessionId;

    console.log('Connecting to Socket at:', BACKEND_URL);

    // ✅ Connect using the variable
    this.socket = io(BACKEND_URL!, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => console.log('Socket connected:', this.socket?.id));
    this.socket.on('connect_error', (err) => console.error('Socket connection error:', err));

    // Wait for socket connection
    await new Promise<void>((resolve) => {
      if (this.socket?.connected) resolve();
      else this.socket?.once('connect', resolve);
    });

    // 2. Load Mediasoup Device
    this.device = new Device();
    const routerRtpCapabilities = await this.request('getRouterRtpCapabilities');
    await this.device.load({ routerRtpCapabilities });

    // 3. Create Send Transport
    const transportInfo = await this.request('createWebRtcTransport', {
      forceTcp: false,
      producing: true,
      consuming: false,
    });

    this.producerTransport = this.device.createSendTransport(transportInfo);

    // 4. Handle Transport Events (Connect & Produce)
    this.producerTransport.on(
      'connect',
      async ({ dtlsParameters }: any, callback: any, errback: any) => {
        try {
          await this.request('connectTransport', {
            transportId: this.producerTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error);
        }
      }
    );

    this.producerTransport.on(
      'produce',
      async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
        try {
          const { id } = await this.request('produce', {
            transportId: this.producerTransport.id,
            kind,
            rtpParameters,
            appData,
            sessionId: this.sessionId, // IMPORTANT: Link producer to session here
          });
          callback({ id });
        } catch (error) {
          errback(error);
        }
      }
    );

    // 5. Produce Media (Publish Tracks)
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    if (videoTrack) {
      this.videoProducer = await this.producerTransport.produce({ track: videoTrack });
    }
    if (audioTrack) {
      this.audioProducer = await this.producerTransport.produce({ track: audioTrack });
    }

    console.log('Mediasoup producers created. Notifying backend...');

    // 6. Call the API to Start FFmpeg (Now the backend will find the producers!)
    // Note: We don't send SDP here anymore. The backend finds streams via sessionId.
    await startLive(this.sessionId);

    return { streamId: this.sessionId };
  }

  //Start Screen Share
  async startScreenShare(screenStream: MediaStream) {
    if (!this.producerTransport) return;
    const track = screenStream.getVideoTracks()[0];
    if (track) {
      this.screenProducer = await this.producerTransport.produce({
        track,
        appData: { source: 'screen' }, // ✅ Tag as screen
      });
    }
  }

  //Stop Screen Share
  async stopScreenShare() {
    if (this.screenProducer) {
      this.screenProducer.close();
      this.screenProducer = null;
    }
  }

  async stop() {
    // Stop API (Stops FFmpeg & RTP forwarding)
    if (this.sessionId) {
      try {
        await stopLive(this.sessionId);
      } catch (e) {
        console.warn('Stop live API failed', e);
      }
    }

    // Close Transports
    this.producerTransport?.close();
    this.socket?.disconnect();

    // Cleanup
    this.audioProducer = null;
    this.videoProducer = null;
    this.producerTransport = null;
    this.device = null;
    this.socket = null;
  }

  async replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (this.videoProducer) {
      await this.videoProducer.replaceTrack({ track: newTrack });
    }
  }

  // Helper to wrap socket.emit in a Promise
  private request(type: string, data: any = null): Promise<any> {
    return new Promise((resolve, reject) => {
      const cb = (resp: any) => (resp?.error ? reject(resp.error) : resolve(resp));
      data ? this.socket?.emit(type, data, cb) : this.socket?.emit(type, cb);
    });
  }
}
