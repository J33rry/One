"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Phone, Video, ArrowLeft, Settings, ShieldCheck } from "lucide-react";
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
import clsx from "clsx";

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
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-muted text-sm">
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
  const otherUserLastSeen = !isGroup && otherParticipant ? (getLastSeen(otherParticipant.id) || otherParticipant.lastSeenAt) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
      {isInCall && livekitToken && livekitUrl && (
        <ActiveCall
          token={livekitToken}
          serverUrl={livekitUrl}
          callType={activeCall!.type}
        />
      )}

      {/* Conversation Top Header Bar - Glassmorphic */}
      <header className="h-[72px] flex items-center justify-between px-6 border-b border-border glass-panel-subtle shrink-0 z-20">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity group"
          onClick={() => setShowSettings(true)}
        >
          <Link
            href="/"
            className="md:hidden p-2 -ml-2 text-muted hover:text-fg transition-colors"
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
            className="group-hover:ring-2 group-hover:ring-accent/30 transition-all shadow-md"
          />

          <div>
            <h2 className="text-base font-bold text-fg leading-tight flex items-center gap-2 tracking-tight">
              {title}
            </h2>
            <p className="text-[11px] font-medium mt-0.5">
              {isGroup ? (
                <span className="text-muted">{chat.participants?.length || 0} members</span>
              ) : otherUserOnline ? (
                <span className="text-accent font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]" />
                  Online
                </span>
              ) : (
                <span className="text-muted">{formatLastSeen(otherUserLastSeen)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => startCall(chatId, "audio")}
            disabled={callState !== "idle" || chat.isBlocked}
            className="p-2.5 rounded-xl text-muted hover:text-accent hover:bg-accent/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => startCall(chatId, "video")}
            disabled={callState !== "idle" || chat.isBlocked}
            className="p-2.5 rounded-xl text-muted hover:text-accent hover:bg-accent/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl text-muted hover:text-fg hover:bg-surface-3/50 transition-all duration-300"
            title="Chat Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={clsx(
              "p-2.5 rounded-xl transition-all duration-300",
              showInfo ? "text-accent bg-accent/10 border border-accent/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-muted hover:text-fg hover:bg-surface-3/50"
            )}
            title="Chat Info Drawer"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Message List Area */}
      <MessageList chatId={chatId} />

      {/* Composer Area */}
      {chat.isBlocked ? (
        <div className="p-4 border-t border-border bg-surface-2/30 shrink-0 flex items-center justify-center backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted text-xs italic bg-surface-3/30 px-4 py-2 rounded-full border border-border">
            <ShieldCheck className="w-4 h-4 text-faint" />
            You cannot reply to this conversation.
          </div>
        </div>
      ) : (
        <MessageComposer chatId={chatId} />
      )}

      {/* Info Slide-Over Panel - Glassmorphic */}
      {showInfo && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 glass-panel border-l border-border flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="h-[72px] flex items-center justify-between px-6 border-b border-border shrink-0">
            <h3 className="text-base font-bold text-fg tracking-tight">Chat Info</h3>
            <button
              onClick={() => setShowInfo(false)}
              className="text-xs text-muted hover:text-fg px-3 py-1.5 rounded-lg bg-surface-3/40 hover:bg-surface-3 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="text-center">
              <Avatar
                src={isGroup ? chat.avatarUrl : otherParticipant?.avatarUrl}
                name={title}
                size="xl"
                isGroup={isGroup}
                showPresence={!isGroup}
                isOnline={otherUserOnline}
                className="mx-auto mb-4 shadow-xl ring-4 ring-surface-2"
              />
              <h2 className="text-xl font-bold text-fg tracking-tight">{title}</h2>
              {chat.description && (
                <p className="text-xs text-muted mt-3 leading-relaxed bg-black/20 p-4 rounded-2xl border border-border shadow-inner">
                  {chat.description}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                Participants 
                <span className="bg-surface-3/50 text-fg px-2 py-0.5 rounded-full">{chat.participants?.length || 0}</span>
              </h4>
              <ul className="space-y-2">
                {chat.participants?.map((p) => {
                  const pUser = p.user;
                  const isUserOnline = isOnline(p.userId);

                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-3/30 transition-colors border border-transparent hover:border-border"
                    >
                      <Avatar
                        src={pUser?.avatarUrl}
                        name={pUser?.displayName || pUser?.username}
                        size="sm"
                        showPresence
                        isOnline={isUserOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">
                          {p.userId === currentUser?.id ? "You" : pUser?.displayName}
                        </p>
                        <p className="text-[11px] text-muted truncate">
                          @{pUser?.username}
                        </p>
                      </div>
                      {p.role === "admin" && (
                        <Badge className="bg-accent/10 text-accent border-accent/20">Admin</Badge>
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
