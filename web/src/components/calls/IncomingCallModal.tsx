"use client";

import { Phone, PhoneOff, Video, User } from "lucide-react";
import { useCallStore, IncomingCallPayload } from "@/hooks/useCall";
import { useEffect, useRef } from "react";

export function IncomingCallModal() {
  const { incomingCall, callState, acceptCall, rejectCall } = useCallStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone effect (visual pulse only — no actual audio file needed)
  useEffect(() => {
    if (callState !== "ringing-incoming") return;

    // We could add a ringtone audio file here if desired
    return () => {
      // Cleanup
    };
  }, [callState]);

  if (callState !== "ringing-incoming" || !incomingCall) return null;

  const isVideo = incomingCall.type === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-10 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Caller avatar with pulsing ring */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full border-2 border-emerald-500/30 animate-ping" />
          <div className="absolute -inset-2 rounded-full border border-emerald-500/20 animate-pulse" />
          <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden">
            {incomingCall.initiator.avatarUrl ? (
              <img
                src={incomingCall.initiator.avatarUrl}
                alt={incomingCall.initiator.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">
            {incomingCall.initiator.displayName || incomingCall.initiator.username}
          </h2>
          <p className="text-sm text-zinc-400 flex items-center justify-center gap-1.5">
            {isVideo ? (
              <Video className="w-4 h-4 text-emerald-500" />
            ) : (
              <Phone className="w-4 h-4 text-emerald-500" />
            )}
            Incoming {isVideo ? "video" : "audio"} call
          </p>
        </div>

        {/* Accept / Reject buttons */}
        <div className="flex items-center gap-8">
          <button
            onClick={rejectCall}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-600/30 group-hover:shadow-red-500/40 group-hover:scale-105">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">Decline</span>
          </button>

          <button
            onClick={acceptCall}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all duration-200 shadow-lg shadow-emerald-600/30 group-hover:shadow-emerald-500/40 group-hover:scale-105">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
