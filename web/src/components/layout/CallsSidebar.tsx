"use client";

import { useQuery } from "@tanstack/react-query";
import { callsApi } from "@/lib/api/calls";
import { format } from "date-fns";
import { Phone, PhoneMissed, Video, PhoneCall } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";

export function CallsSidebar() {
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();

  const { data, isLoading } = useQuery({
    queryKey: ["calls", "history"],
    queryFn: () => callsApi.getUserCallHistory(),
  });

  const calls = data?.calls || [];

  return (
    <div className="w-80 bg-zinc-950/80 border-r border-zinc-800/80 flex flex-col shrink-0 overflow-hidden select-none">
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
        <h2 className="text-xl font-bold text-white tracking-tight">Call History</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatListSkeleton />
        ) : calls.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <PhoneCall className="w-6 h-6" />
            </div>
            <p className="text-xs text-zinc-500">No recent calls.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {calls.map((call) => {
              const isMissed =
                !call.endedAt &&
                Date.now() - new Date(call.startedAt).getTime() > 5 * 60 * 1000;
              const isOutgoing = call.initiatorId === currentUser?.id;

              let displayName = call.chatName;
              if (call.chatType === "dm") {
                displayName =
                  call.initiatorId === currentUser?.id
                    ? "Outgoing Call"
                    : call.initiator?.displayName || call.initiator?.username;
              }

              const initiatorOnline = call.initiator ? isOnline(call.initiator.id) : false;

              return (
                <div
                  key={call.id}
                  className="p-3.5 hover:bg-zinc-900/40 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <Avatar
                    src={call.initiator?.avatarUrl}
                    name={call.initiator?.displayName}
                    size="lg"
                    showPresence
                    isOnline={initiatorOnline}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3
                        className={clsx(
                          "font-semibold truncate text-xs",
                          isMissed && !isOutgoing ? "text-red-400" : "text-zinc-100"
                        )}
                      >
                        {displayName || "Unknown Chat"}
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {format(new Date(call.startedAt), "MMM d")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      {isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : call.type === "video" ? (
                        <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>
                        {isOutgoing ? "Outgoing" : "Incoming"}{" "}
                        {call.type === "video" ? "Video" : "Audio"} Call
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
