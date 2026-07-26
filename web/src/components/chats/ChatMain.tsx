"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Phone, Video, ArrowLeft, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatLastSeen } from "@/lib/utils/presence";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { ActiveCall } from "../calls/ActiveCall";
import { useCallStore } from "@/hooks/useCall";
import { ChatSettingsModal } from "./ChatSettingsModal";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import { Badge } from "@/components/ui/Badge";

interface ChatMainProps {
  chatId: string;
}

export function ChatMain({ chatId }: ChatMainProps) {
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { callState, activeCall, livekitToken, livekitUrl, startCall } = useCallStore();

  const isInCall = (callState === "connecting" || callState === "connected") && activeCall?.chatId === chatId;

  const { data, isLoading } = useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => chatsApi.getChatDetails(chatId),
  });
  const chat = data?.chat;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        Conversation not found
      </div>
    );
  }

  const isGroup = chat.type === "group";
  const otherParticipant = !isGroup
    ? chat.participants?.find((p) => p.userId !== currentUser?.id)?.user
    : null;
  const title = isGroup
    ? chat.name || "Unnamed Group"
    : otherParticipant?.displayName || "Unknown User";

  const otherUserOnline = !isGroup && otherParticipant ? isOnline(otherParticipant.id) : false;
  const otherUserLastSeen = !isGroup && otherParticipant ? (getLastSeen(otherParticipant.id) || (otherParticipant as any)?.lastSeenAt) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 relative overflow-hidden">
      {isInCall && livekitToken && livekitUrl && (
        <ActiveCall
          token={livekitToken}
          serverUrl={livekitUrl}
          callType={activeCall!.type}
        />
      )}

      {/* Conversation Top Header Bar */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-lg shrink-0 z-20">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowSettings(true)}
        >
          <Link
            href="/"
            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <Avatar
            src={isGroup ? chat.avatarUrl : otherParticipant?.avatarUrl}
            name={title}
            size="md"
            isGroup={isGroup}
            showPresence={!isGroup}
            isOnline={otherUserOnline}
          />

          <div>
            <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
              {title}
            </h2>
            <p className="text-[11px] text-zinc-400 font-medium">
              {isGroup ? (
                <span>{chat.participants?.length || 0} members</span>
              ) : otherUserOnline ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span>{formatLastSeen(otherUserLastSeen)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => startCall(chatId, "audio")}
            disabled={callState !== "idle" || chat.isBlocked}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => startCall(chatId, "video")}
            disabled={callState !== "idle" || chat.isBlocked}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Chat Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2.5 rounded-xl transition-colors ${
              showInfo ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
            }`}
            title="Chat Info Drawer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message List Area */}
      <MessageList chatId={chatId} />

      {/* Composer Area */}
      {chat.isBlocked ? (
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 shrink-0 flex items-center justify-center">
          <p className="text-zinc-500 text-xs italic">
            You cannot reply to this conversation.
          </p>
        </div>
      ) : (
        <MessageComposer chatId={chatId} />
      )}

      {/* Info Slide-Over Panel */}
      {showInfo && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/80 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800/80 shrink-0">
            <h3 className="text-sm font-bold text-white">Chat Info</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800/60"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="text-center">
              <Avatar
                src={isGroup ? chat.avatarUrl : otherParticipant?.avatarUrl}
                name={title}
                size="xl"
                isGroup={isGroup}
                showPresence={!isGroup}
                isOnline={otherUserOnline}
                className="mx-auto mb-3"
              />
              <h2 className="text-base font-bold text-white">{title}</h2>
              {chat.description && (
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                  {chat.description}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-[11px] font-mono font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Participants ({chat.participants?.length || 0})
              </h4>
              <ul className="space-y-2.5">
                {chat.participants?.map((p) => {
                  const pUser = p.user;
                  const isUserOnline = isOnline(p.userId);

                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <Avatar
                        src={pUser?.avatarUrl}
                        name={pUser?.displayName || pUser?.username}
                        size="sm"
                        showPresence
                        isOnline={isUserOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {p.userId === currentUser?.id ? "You" : pUser?.displayName}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          @{pUser?.username}
                        </p>
                      </div>
                      {p.role === "admin" && (
                        <Badge variant="emerald">Admin</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettingsModal chatId={chatId} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
