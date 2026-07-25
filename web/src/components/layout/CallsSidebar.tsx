"use client";

import { useQuery } from "@tanstack/react-query";
import { callsApi } from "@/lib/api/calls";
import { format } from "date-fns";
import { Phone, PhoneMissed, Video, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

export function CallsSidebar() {
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['calls', 'history'],
    queryFn: () => callsApi.getUserCallHistory(),
  });

  if (isLoading) {
    return (
      <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const calls = data?.calls || [];

  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold text-white">Calls</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="text-center p-8 text-zinc-500">
            No recent calls.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {calls.map((call) => {
              const isMissed = !call.endedAt && Date.now() - new Date(call.startedAt).getTime() > 5 * 60 * 1000; // rough missed logic if no endedAt and older than 5 mins
              const isOutgoing = call.initiatorId === currentUser?.id;
              
              // If it's a DM, display the other user's info, else display group name
              let displayName = call.chatName;
              if (call.chatType === 'dm') {
                  displayName = call.initiatorId === currentUser?.id ? "Outgoing Call" : call.initiator?.displayName || call.initiator?.username;
              }

              return (
                <div key={call.id} className="p-4 hover:bg-zinc-900 transition-colors cursor-pointer flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {call.initiator?.avatarUrl ? (
                      <img src={call.initiator.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-emerald-900/50 flex items-center justify-center text-emerald-500 font-medium">
                        {call.initiator?.displayName?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={clsx("font-medium truncate text-sm", isMissed && !isOutgoing ? "text-red-500" : "text-zinc-100")}>
                        {displayName || "Unknown Chat"}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(call.startedAt), "MMM d")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      {isMissed ? (
                         <PhoneMissed className="w-3 h-3 text-red-500" />
                      ) : (
                         call.type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />
                      )}
                      <span>
                        {isOutgoing ? "Outgoing" : "Incoming"} {call.type === 'video' ? 'Video' : 'Audio'} Call
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
