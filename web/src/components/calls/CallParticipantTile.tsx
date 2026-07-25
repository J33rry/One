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
        "relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center",
        isLocal ? "w-36 h-48" : "w-full h-full min-h-[200px]"
      )}
    >
      {isVideo && hasTrack ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <User className="w-10 h-10 text-zinc-500" />
          </div>
          {displayName && (
            <span className="text-sm text-zinc-400 font-medium">{displayName}</span>
          )}
        </div>
      )}

      {/* Name badge + mute indicator */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        {displayName && (
          <span className="text-xs text-white/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md truncate max-w-[70%]">
            {isLocal ? "You" : displayName}
          </span>
        )}
        {isMuted && (
          <span className="bg-red-500/80 p-1 rounded-full ml-auto">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
    </div>
  );
}
