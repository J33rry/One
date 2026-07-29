"use client";

import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Loader2,
  ShieldCheck,
  MoreVertical,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import clsx from "clsx";
import { useCallStore } from "@/hooks/useCall";
import { CallParticipantTile } from "./CallParticipantTile";

interface ActiveCallProps {
  token: string;
  serverUrl: string;
  callType: "audio" | "video";
}

export function ActiveCall({ token, serverUrl, callType }: ActiveCallProps) {
  const { endCall, setConnected } = useCallStore();

  const handleConnected = useCallback(() => {
    setConnected();
  }, [setConnected]);

  const handleDisconnected = useCallback(() => {
    endCall();
  }, [endCall]);

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col select-none animate-in fade-in duration-300">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        audio={true}
        video={callType === "video"}
        connect={true}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        className="flex flex-col h-full"
      >
        <RoomAudioRenderer />
        <CallContent callType={callType} />
      </LiveKitRoom>
    </div>
  );
}

function CallContent({ callType }: { callType: "audio" | "video" }) {
  const { endCall } = useCallStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const remoteTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [localParticipant, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  }, [localParticipant, isVideoOn]);

  const handleEndCall = useCallback(async () => {
    room.disconnect();
    await endCall();
  }, [room, endCall]);

  const remoteVideoTracks = remoteTracks.filter(
    (t) =>
      t.participant.sid !== localParticipant?.sid &&
      t.source === Track.Source.Camera
  );

  const localVideoTracks = remoteTracks.filter(
    (t) =>
      t.participant.sid === localParticipant?.sid &&
      t.source === Track.Source.Camera
  );

  const remoteParticipants = participants.filter(
    (p) => p.sid !== localParticipant?.sid
  );

  return (
    <>
      {/* Floating Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
        <div className="glass-pill px-4 py-2 flex items-center gap-2 pointer-events-auto">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-fg">
            Encrypted
          </span>
        </div>
        <div className="glass-pill px-4 py-2 pointer-events-auto">
          <span className="text-[13px] font-mono text-fg font-bold tracking-wider">
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative p-4 md:p-12 overflow-hidden w-full h-full">
        {remoteVideoTracks.length > 0 ? (
          <div
            className={clsx(
              "grid gap-4 w-full h-full max-w-[1400px] mx-auto",
              remoteVideoTracks.length === 1
                ? "grid-cols-1"
                : remoteVideoTracks.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            )}
          >
            {remoteVideoTracks.map((trackRef) => (
              <div key={trackRef.participant.sid} className="rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface-2 relative group">
                <CallParticipantTile
                  trackRef={trackRef}
                  displayName={
                    trackRef.participant.name || trackRef.participant.identity
                  }
                  isMuted={!trackRef.participant.isMicrophoneEnabled}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
            {remoteParticipants.length > 0 ? (
              <div className="flex -space-x-4">
                {remoteParticipants.map((p, i) => (
                  <div
                    key={p.sid}
                    className="w-32 h-32 rounded-full glass-panel border-2 border-accent/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)] relative z-10"
                    style={{ zIndex: 10 - i }}
                  >
                    <span className="text-4xl font-bold text-accent font-display">
                      {(p.name || p.identity)?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="w-32 h-32 rounded-full glass-panel border border-accent/30 flex items-center justify-center shadow-2xl relative z-10">
                  <Loader2 className="w-10 h-10 text-accent animate-spin" />
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-fg tracking-tight font-display">
                {remoteParticipants.length > 0
                  ? callType === "audio"
                    ? "Audio Conversation"
                    : "Video Conversation"
                  : "Connecting..."}
              </h2>
              <p className="text-sm text-accent font-mono tracking-widest uppercase font-bold">
                {remoteParticipants.length > 0 ? formatTime(elapsed) : "Waiting for others"}
              </p>
            </div>
          </div>
        )}

        {/* Local video PIP */}
        {isVideoOn && localVideoTracks.length > 0 && (
          <div className="absolute bottom-32 right-6 md:bottom-8 md:right-8 w-40 md:w-56 aspect-[3/4] shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden border border-border z-20 transition-all duration-300 hover:scale-105">
            <CallParticipantTile
              trackRef={localVideoTracks[0]}
              displayName="You"
              isLocal
            />
          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="glass-pill px-6 py-4 flex items-center gap-4 md:gap-6 shadow-2xl border border-border">
          <button
            onClick={toggleMute}
            className={clsx(
              "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300",
              isMuted
                ? "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
                : "bg-surface-3/50 text-fg hover:bg-surface-3 hover:text-white"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={clsx(
              "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300",
              !isVideoOn
                ? "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
                : "bg-surface-3/50 text-fg hover:bg-surface-3 hover:text-white"
            )}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {!isVideoOn ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
          </button>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-danger hover:bg-danger-fg hover:text-danger text-white flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-105 mx-2"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7 md:w-8 md:h-8" />
          </button>

          <button
            className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-surface-3/50 text-fg hover:bg-surface-3 transition-all duration-300"
            title="More Options"
          >
            <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </>
  );
}
