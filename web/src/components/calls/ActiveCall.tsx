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
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col select-none">
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
      {/* Top Header */}
      <div className="h-16 px-6 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold text-white tracking-wide">
            End-to-End Encrypted Call
          </span>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-zinc-800/60 px-3 py-1 rounded-full border border-zinc-700/60">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative p-6 overflow-hidden">
        {remoteVideoTracks.length > 0 ? (
          <div
            className={clsx(
              "grid gap-4 w-full h-full max-w-6xl",
              remoteVideoTracks.length === 1
                ? "grid-cols-1"
                : remoteVideoTracks.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            )}
          >
            {remoteVideoTracks.map((trackRef) => (
              <CallParticipantTile
                key={trackRef.participant.sid}
                trackRef={trackRef}
                displayName={
                  trackRef.participant.name || trackRef.participant.identity
                }
                isMuted={!trackRef.participant.isMicrophoneEnabled}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {remoteParticipants.length > 0 ? (
              <div className="flex -space-x-4">
                {remoteParticipants.map((p) => (
                  <div
                    key={p.sid}
                    className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-emerald-500/40 flex items-center justify-center shadow-2xl"
                  >
                    <span className="text-2xl font-bold text-emerald-400">
                      {(p.name || p.identity)?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              </div>
            )}

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">
                {remoteParticipants.length > 0
                  ? callType === "audio"
                    ? "Audio Conversation"
                    : "Video Conversation"
                  : "Connecting room..."}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {formatTime(elapsed)}
              </p>
            </div>
          </div>
        )}

        {/* Local video PIP */}
        {isVideoOn && localVideoTracks.length > 0 && (
          <div className="absolute bottom-6 right-6 shadow-2xl rounded-2xl overflow-hidden border-2 border-zinc-700/80">
            <CallParticipantTile
              trackRef={localVideoTracks[0]}
              displayName="You"
              isLocal
            />
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800/80 flex items-center justify-center gap-6 shrink-0">
        <button
          onClick={toggleMute}
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
          )}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            !isVideoOn
              ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
          )}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-600/30 hover:scale-105"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
