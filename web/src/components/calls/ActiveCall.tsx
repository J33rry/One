"use client";

import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  RoomAudioRenderer,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Loader2,
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
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
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

  // Call timer
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

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [localParticipant, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  }, [localParticipant, isVideoOn]);

  // Handle end call
  const handleEndCall = useCallback(async () => {
    room.disconnect();
    await endCall();
  }, [room, endCall]);

  // Separate local and remote tracks
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
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative p-4 overflow-hidden">
        {remoteVideoTracks.length > 0 ? (
          <div
            className={clsx(
              "grid gap-3 w-full h-full",
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
          /* Audio-only or waiting for remote participants */
          <div className="flex flex-col items-center gap-6">
            {remoteParticipants.length > 0 ? (
              <div className="flex -space-x-4">
                {remoteParticipants.map((p) => (
                  <div
                    key={p.sid}
                    className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold text-emerald-500">
                      {(p.name || p.identity)?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">
                {remoteParticipants.length > 0
                  ? callType === "audio"
                    ? "Audio Call"
                    : "Video Call"
                  : "Waiting for others..."}
              </h2>
              <p className="text-zinc-400 tabular-nums text-lg font-mono">
                {formatTime(elapsed)}
              </p>
            </div>
          </div>
        )}

        {/* Local video PiP */}
        {isVideoOn && localVideoTracks.length > 0 && (
          <div className="absolute bottom-4 right-4 shadow-2xl rounded-xl overflow-hidden border-2 border-zinc-700/50">
            <CallParticipantTile
              trackRef={localVideoTracks[0]}
              displayName="You"
              isLocal
            />
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="h-20 bg-zinc-900/80 backdrop-blur-lg border-t border-zinc-800 flex items-center justify-center gap-5">
        <button
          onClick={toggleMute}
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
            isMuted
              ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40 hover:bg-red-500/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
            !isVideoOn
              ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40 hover:bg-red-500/30"
              : "bg-zinc-800 text-white hover:bg-zinc-700"
          )}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {!isVideoOn ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-500/40 hover:scale-105"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
