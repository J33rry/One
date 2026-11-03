"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Phone,
  PhoneMissed,
  Video,
  PhoneCall,
  Search,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { callsApi, Call } from "@/lib/api/calls";
import { chatsApi, Chat } from "@/lib/api/chats";
import { User } from "@/lib/api/users";
import { useAuth } from "@/hooks/useAuth";
import { useCallStore } from "@/hooks/useCall";
import { Avatar } from "@/components/ui/Avatar";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { dayLabel, formatDuration } from "@/lib/utils/time";
import { format } from "date-fns";

type CallFilter = "all" | "incoming" | "outgoing" | "missed" | "audio" | "video";

const FILTERS: { value: CallFilter; label: string }[] = [
  { value: "all", label: "All calls" },
  { value: "incoming", label: "Incoming" },
  { value: "outgoing", label: "Outgoing" },
  { value: "missed", label: "Missed" },
  { value: "audio", label: "Voice" },
  { value: "video", label: "Video" },
];

// A call that never ended and is older than this was never picked up.
const MISSED_AFTER_MS = 5 * 60 * 1000;

export interface CallEntry {
  call: Call;
  name: string;
  avatarUrl: string | null | undefined;
  isGroup: boolean;
  /** The other person in a DM, for presence/favorites. */
  peer: User | null;
  isOutgoing: boolean;
  isMissed: boolean;
}

/** Resolves who each call was with, using the chat list for DMs. */
export function useCallEntries() {
  const { user: currentUser } = useAuth();
  // Fixed at mount: a call only needs re-judging as missed on the next visit.
  const [now] = useState(Date.now);

  const { data, isLoading } = useQuery({
    queryKey: ["calls", "history"],
    queryFn: () => callsApi.getUserCallHistory(),
  });
  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatsApi.getChats(),
  });

  const chatsById = new Map<string, Chat>((chatsData?.chats || []).map((c) => [c.id, c]));

  const entries: CallEntry[] = (data?.calls || []).map((call) => {
    const chat = chatsById.get(call.chatId);
    const isGroup = (chat?.type ?? call.chatType) === "group";
    const isOutgoing = call.initiatorId === currentUser?.id;
    const isMissed = !call.endedAt && now - new Date(call.startedAt).getTime() > MISSED_AFTER_MS;

    const peer = isGroup
      ? null
      : chat?.participants?.find((p) => p.userId !== currentUser?.id)?.user ??
        (isOutgoing ? null : (call.initiator ?? null));

    return {
      call,
      isGroup,
      isOutgoing,
      isMissed,
      peer,
      name: isGroup ? chat?.name || call.chatName || "Group call" : peer?.displayName || "Unknown",
      avatarUrl: isGroup ? chat?.avatarUrl : peer?.avatarUrl,
    };
  });

  return { entries, isLoading };
}

export function CallsSidebar() {
  const router = useRouter();
  const { entries, isLoading } = useCallEntries();
  const { startCall, callState } = useCallStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CallFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  const call = (chatId: string, type: "audio" | "video") => {
    router.push(`/chats/${chatId}`);
    startCall(chatId, type);
  };

  const query = search.trim().toLowerCase();
  const visible = entries.filter(({ call, name, isOutgoing, isMissed }) => {
    if (query && !name.toLowerCase().includes(query)) return false;
    switch (filter) {
      case "incoming": return !isOutgoing;
      case "outgoing": return isOutgoing;
      case "missed": return isMissed;
      case "audio":
      case "video": return call.type === filter;
      default: return true;
    }
  });

  return (
    <div className="flex flex-col h-full select-none">
      <div className="px-5 pt-5 shrink-0 space-y-5">
        <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-muted focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
          <Search className="h-5 w-5 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls"
            className="w-full bg-transparent text-[15px] text-fg placeholder:text-muted focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-semibold text-fg tracking-tight">Recent calls</h2>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {FILTERS.find((f) => f.value === filter)!.label}
              <ChevronDown className={clsx("h-4 w-4 transition-transform", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 w-36 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
                  {FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => {
                        setFilter(f.value);
                        setMenuOpen(false);
                      }}
                      className={clsx(
                        "w-full px-3.5 py-2 text-left transition-colors",
                        filter === f.value ? "text-accent font-medium" : "text-muted hover:text-fg hover:bg-surface-2"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {isLoading ? (
          <ChatListSkeleton />
        ) : visible.length === 0 ? (
          <div className="p-8 mt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-accent">
              <PhoneCall className="w-7 h-7" />
            </div>
            <p className="text-sm text-muted">
              {entries.length === 0 ? "No calls yet." : "No calls match this filter."}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {visible.map(({ call: c, name, avatarUrl, isGroup, isOutgoing, isMissed }) => {
              const seconds = c.endedAt
                ? (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000
                : null;
              const Direction = isMissed ? PhoneMissed : isOutgoing ? ArrowUpRight : ArrowDownLeft;

              return (
                <li
                  key={c.id}
                  onClick={() => router.push(`/chats/${c.chatId}`)}
                  className="group flex items-center gap-3.5 rounded-2xl px-3 py-2.5 cursor-pointer hover:bg-surface-2/70 transition-colors"
                >
                  <Avatar src={avatarUrl} name={name} size="lg" isGroup={isGroup} className="[&>div]:!w-14 [&>div]:!h-14" />

                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-[17px] font-semibold truncate", isMissed ? "text-danger" : "text-fg")}>
                      {name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted">
                      <Direction
                        className={clsx(
                          "h-4 w-4 shrink-0",
                          isMissed ? "text-danger" : isOutgoing ? "text-warning" : "text-success"
                        )}
                      />
                      {isMissed ? "Missed" : isOutgoing ? "Outgoing" : "Incoming"}{" "}
                      {c.type === "video" ? "video" : "voice"}
                    </p>
                  </div>

                  <div className="text-right text-[14px] text-muted leading-6 shrink-0">
                    <p>{dayLabel(c.startedAt)}</p>
                    <p className="tabular-nums">
                      {seconds !== null ? formatDuration(seconds) : isMissed ? format(new Date(c.startedAt), "HH:mm") : "Live"}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => call(c.chatId, "audio")}
                      disabled={callState !== "idle"}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                      title="Voice call"
                    >
                      <Phone className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      onClick={() => call(c.chatId, "video")}
                      disabled={callState !== "idle"}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent hover:bg-surface-3 transition-colors disabled:opacity-40"
                      title="Video call"
                    >
                      <Video className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
