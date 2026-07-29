"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/hooks/useCall";
import { Avatar } from "@/components/ui/Avatar";
import clsx from "clsx";

export function IncomingCallModal() {
  const { incomingCall, callState, acceptCall, rejectCall } = useCallStore();

  if (callState !== "ringing-incoming" || !incomingCall) return null;

  const isVideo = incomingCall.type === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300" />

      {/* Modal Card - Glassmorphic Pill/Card */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-10 py-12 rounded-[2.5rem] glass-panel shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-full animate-in zoom-in-95 duration-500 border border-border">
        {/* Caller Avatar with Premium Glowing Rings */}
        <div className="relative">
          <div className="absolute -inset-8 rounded-full border border-accent/20 animate-ping shadow-[0_0_20px_rgba(211,161,94,0.1)]" style={{ animationDuration: '2s' }} />
          <div className="absolute -inset-4 rounded-full border-2 border-accent/40 animate-pulse shadow-[0_0_20px_rgba(211,161,94,0.2)]" />
          <div className="relative z-10 bg-surface rounded-full p-2">
             <Avatar
              src={incomingCall.initiator.avatarUrl}
              name={incomingCall.initiator.displayName || incomingCall.initiator.username}
              size="xl"
              className="shadow-2xl ring-4 ring-accent/30"
            />
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-fg tracking-tight font-display">
            {incomingCall.initiator.displayName || incomingCall.initiator.username}
          </h2>
          <p className="text-sm text-accent flex items-center justify-center gap-2 font-mono tracking-widest uppercase font-bold">
            {isVideo ? (
              <Video className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            Incoming {isVideo ? "video" : "audio"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-10 pt-4">
          <button
            onClick={rejectCall}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-surface-3/50 group-hover:bg-danger flex items-center justify-center transition-all duration-300 border border-border group-hover:border-danger group-hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] group-hover:scale-110">
              <PhoneOff className={clsx("w-7 h-7 transition-colors", "text-muted group-hover:text-white")} />
            </div>
            <span className="text-xs text-muted font-bold tracking-widest uppercase transition-colors group-hover:text-danger">Decline</span>
          </button>

          <button
            onClick={acceptCall}
            className="group flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(211,161,94,0.4)] group-hover:shadow-[0_0_40px_rgba(211,161,94,0.6)] group-hover:scale-110">
              <Phone className="w-7 h-7 text-accent-fg" />
            </div>
            <span className="text-xs text-accent font-bold tracking-widest uppercase transition-colors">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
