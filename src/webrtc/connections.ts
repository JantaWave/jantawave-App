// src/webrtc/connection.ts
import { iceServers } from "./helpers";
import { startLive, stopLive } from "../api";
import type { MediaStream } from "react-native-webrtc";

/**
 * StreamConnection: manages RTCPeerConnection lifecycle for publisher.
 *
 * Usage:
 *  const conn = new StreamConnection({ onIceCandidate, onConnectionState, onRemoteTrack });
 *  await conn.connect(localStream, { youtubeKey, facebookKey, instagramKey, title, overlayText, logoUrl });
 *  await conn.stop();
 */

type ConnectionEvents = {
  onIceCandidate?: (c: RTCIceCandidate) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onLocalStreamReady?: (stream: MediaStream) => void;
  onError?: (e: Error) => void;
};

export class StreamConnection {
  pc: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  senders: RTCRtpSender[] = [];
  streamId?: string;
  reconnectAttempts = 0;
  maxReconnect = 5;
  pingTimer?: number;

  private events: ConnectionEvents;

  constructor(events: ConnectionEvents = {}) {
    this.events = events;
  }

  async connect(localStream: MediaStream, setupPayload: any = {}) {
    this.localStream = localStream;

    await this.cleanupPC();

    const pc = (this.pc = new RTCPeerConnection({ iceServers }));

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.events.onIceCandidate) {
        this.events.onIceCandidate(ev.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.events.onConnectionState?.(state);
      if (state === "failed" || state === "disconnected") {
        this._attemptReconnect();
      }
    };

    // add tracks
    if (localStream && localStream.getTracks) {
      localStream.getTracks().forEach((track: any) => {
        const sender = pc.addTrack(track, localStream as any);
        this.senders.push(sender);
      });
    }

    // create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // send offer to backend, expect answer
    const offerSdp = pc.localDescription?.sdp!;
    const startResp = await startLive(offerSdp, this.streamId, setupPayload);
    if (!startResp?.sdp) {
      throw new Error("No answer SDP from server");
    }

    const answer = { type: "answer", sdp: startResp.sdp } as RTCSessionDescriptionInit;
    await pc.setRemoteDescription(answer);
    this.streamId = startResp.streamId || this.streamId;

    // optional keepalive / ping (depending on server)
    this._startPing();

    return { streamId: this.streamId };
  }

  async replaceVideoTrack(newTrack: MediaStreamTrack) {
    try {
      for (const sender of this.senders) {
        if (sender.track && sender.track.kind === "video") {
          await sender.replaceTrack(newTrack);
          return;
        }
      }
      // if no video sender, try addTrack
      if (this.pc && newTrack) {
        const sender = this.pc.addTrack(newTrack);
        this.senders.push(sender);
      }
    } catch (e) {
      console.warn("replaceVideoTrack failed", e);
    }
  }

  async replaceAudioEnabled(enabled: boolean) {
    if (!this.localStream) return;
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach((t) => (t.enabled = enabled));
  }

  async stop() {
    try {
      if (this.streamId) {
        await stopLive(this.streamId);
      }
    } catch (e) {
      console.warn("stopLive error", e);
    }
    this._stopPing();
    await this.cleanupPC();
    if (this.localStream) {
      (this.localStream.getTracks() || []).forEach((t: any) => t.stop());
      this.localStream = null;
    }
  }

  private async cleanupPC() {
    if (this.pc) {
      try {
        this.pc.getSenders().forEach((s) => {
          try {
            if (s.track) s.track.stop();
          } catch {}
        });
      } catch {}
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
      this.senders = [];
    }
  }

  private async _attemptReconnect() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnect) {
      this.events.onError?.(
        new Error(`Max reconnect attempts reached: ${this.reconnectAttempts}`)
      );
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    setTimeout(async () => {
      try {
        if (!this.localStream) return;
        await this.connect(this.localStream, {}); // attempt reconnect with same localStream
      } catch (e) {
        console.warn("reconnect failed", e);
        this._attemptReconnect();
      }
    }, delay);
  }

  private _startPing() {
    this._stopPing();
    // optional: ping backend every 10s so backend knows connection alive
    this.pingTimer = setInterval(async () => {
      try {
        // implement a small ping if your server supports it; otherwise no-op
        // fetch(`${BACKEND_BASE}/api/live/ping`, { method: "POST", body: JSON.stringify({ streamId: this.streamId })});
      } catch {}
    }, 10000) as unknown as number;
  }

  private _stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = undefined;
  }
}

