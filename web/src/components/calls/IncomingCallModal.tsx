"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/hooks/useCall";
import { Avatar } from "@/components/ui/Avatar";

export function IncomingCallModal() {
  const { incomingCall, callState, acceptCall, rejectCall } = useCallStore();

  if (callState !== "ringing-incoming" || !incomingCall) return null;

  const isVideo = incomingCall.type === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200" />

      {/* Modal Card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 py-10 rounded-3xl bg-zinc-900/95 border border-zinc-800 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300">
        {/* Caller Avatar with Pulsing Rings */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-full border-2 border-emerald-500/30 animate-ping" />
          <div className="absolute -inset-2 rounded-full border border-emerald-500/20 animate-pulse" />
          <Avatar
            src={incomingCall.initiator.avatarUrl}
            name={incomingCall.initiator.displayName || incomingCall.initiator.username}
            size="xl"
            className="shadow-2xl"
          />
        </div>

        {/* Caller Info */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {incomingCall.initiator.displayName || incomingCall.initiator.username}
          </h2>
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-1.5 font-medium">
            {isVideo ? (
              <Video className="w-4 h-4 text-emerald-400" />
            ) : (
              <Phone className="w-4 h-4 text-emerald-400" />
            )}
            Incoming {isVideo ? "video" : "audio"} call...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-8 pt-2">
          <button
            onClick={rejectCall}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-xl shadow-red-600/30 group-hover:scale-105">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">Decline</span>
          </button>

          <button
            onClick={acceptCall}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all duration-200 shadow-xl shadow-emerald-600/30 group-hover:scale-105">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
