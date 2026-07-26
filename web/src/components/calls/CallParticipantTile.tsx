"use client";

import { TrackReferenceOrPlaceholder, VideoTrack, isTrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff, User } from "lucide-react";
import clsx from "clsx";

interface CallParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  isMuted?: boolean;
  displayName?: string;
  isLocal?: boolean;
}

export function CallParticipantTile({
  trackRef,
  isMuted = false,
  displayName,
  isLocal = false,
}: CallParticipantTileProps) {
  const isVideo = trackRef.source === Track.Source.Camera;
  const hasTrack = isTrackReference(trackRef);

  return (
    <div
      className={clsx(
        "relative rounded-2xl overflow-hidden bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center shadow-xl transition-all",
        isLocal ? "w-40 h-52 shadow-2xl border-emerald-500/30" : "w-full h-full min-h-[220px]"
      )}
    >
      {isVideo && hasTrack ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700/60 flex items-center justify-center shadow-inner">
            <User className="w-10 h-10 text-emerald-400" />
          </div>
          {displayName && (
            <span className="text-xs text-zinc-300 font-semibold">{displayName}</span>
          )}
        </div>
      )}

      {/* Overlay Badge */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
        {displayName && (
          <span className="text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg truncate max-w-[70%] font-medium border border-white/10">
            {isLocal ? "You" : displayName}
          </span>
        )}
        {isMuted && (
          <span className="bg-red-500/80 p-1.5 rounded-full ml-auto shadow-md">
            <MicOff className="w-3.5 h-3.5 text-white" />
          </span>
        )}
      </div>
    </div>
  );
}
