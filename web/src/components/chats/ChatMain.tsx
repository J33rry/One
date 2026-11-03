"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Phone, Video, ArrowLeft, Settings, ShieldCheck, MoreVertical, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { formatLastSeen } from "@/lib/utils/presence";
import { MessageList } from "./MessageList";
import { ChatWater, ChatWaterHandle } from "./ChatWater";
import { MessageComposer } from "./MessageComposer";
import { ActiveCall } from "../calls/ActiveCall";
import { useCallStore } from "@/hooks/useCall";
import { ChatSettingsModal } from "./ChatSettingsModal";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import { ChatMediaPanel } from "./ChatMediaPanel";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import clsx from "clsx";

interface ChatMainProps {
  chatId: string;
}

export function ChatMain({ chatId }: ChatMainProps) {
  const { user: currentUser } = useAuth();
  const { isOnline, getLastSeen } = usePresence();
  // The info column sits beside the chat on wide screens, so start with it
  // open there; narrower layouts overlay it and only show it on request.
  const [showInfo, setShowInfo] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const waterRef = useRef<ChatWaterHandle | null>(null);
  const [infoLightbox, setInfoLightbox] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);
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

  const memberCount = chat.participants?.length || 0;
  const onlineCount = chat.participants?.filter((p) => isOnline(p.userId)).length || 0;

  // Online members first, then admins, then by name.
  const sortedParticipants = [...(chat.participants || [])].sort((a, b) => {
    const aOnline = isOnline(a.userId);
    const bOnline = isOnline(b.userId);
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    if ((a.role === "admin") !== (b.role === "admin")) return a.role === "admin" ? -1 : 1;
    return (a.user?.displayName || "").localeCompare(b.user?.displayName || "");
  });

  const infoPanel = (
    <aside
      className={clsx(
        "flex flex-col gap-3 overflow-y-auto p-3 bg-bg xl:bg-surface-2/50",
        "absolute inset-y-0 right-0 z-30 w-full sm:w-[360px] shadow-[var(--shadow-lg)] xl:static xl:z-auto xl:w-[340px] xl:shrink-0 xl:shadow-none xl:border-l xl:border-border"
      )}
    >
      <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[26px] font-semibold text-fg tracking-tight">
            {isGroup ? "Group Info" : "Info"}
          </h3>
          <button
            onClick={() => setShowInfo(false)}
            className="p-1.5 rounded-lg text-accent hover:bg-surface-2 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(!isGroup || chat.description) && (
          <div className="mt-4 flex items-center gap-3">
            {!isGroup && (
              <Avatar
                src={otherParticipant?.avatarUrl}
                name={title}
                size="lg"
                showPresence
                isOnline={otherUserOnline}
              />
            )}
            <div className="min-w-0">
              {!isGroup && (
                <>
                  <p className="font-semibold text-fg truncate">{title}</p>
                  <p className="text-sm text-muted truncate">@{otherParticipant?.username}</p>
                </>
              )}
              {(isGroup ? chat.description : otherParticipant?.bio) && (
                <p className="mt-1 text-sm text-muted leading-relaxed">
                  {isGroup ? chat.description : otherParticipant?.bio}
                </p>
              )}
            </div>
          </div>
        )}

        <h4 className="mt-5 mb-2 text-lg font-semibold text-fg">Files</h4>
        <ChatMediaPanel
          chatId={chatId}
          enabled={showInfo}
          onOpenMedia={(url, type) => setInfoLightbox({ url, type })}
        />
      </section>

      {isGroup && (
        <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-[22px] font-semibold text-fg tracking-tight mb-3">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </h3>
          <ul className="space-y-1">
            {sortedParticipants.map((p) => {
              const pUser = p.user;
              return (
                <li key={p.id} className="flex items-center gap-3.5 py-1.5">
                  <Avatar
                    src={pUser?.avatarUrl}
                    name={pUser?.displayName || pUser?.username}
                    size="md"
                    showPresence
                    isOnline={isOnline(p.userId)}
                  />
                  <p className="flex-1 min-w-0 text-[16px] font-medium text-fg truncate">
                    {p.userId === currentUser?.id ? "You" : pUser?.displayName}
                  </p>
                  {p.role === "admin" && <span className="text-sm text-accent">admin</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );

  return (
    <div className="flex-1 flex h-full relative overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col h-full relative isolate">
        <ChatWater handleRef={waterRef} />
        {isInCall && livekitToken && livekitUrl && (
          <ActiveCall
            token={livekitToken}
            serverUrl={livekitUrl}
            callType={activeCall!.type}
          />
        )}

        <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="md:hidden p-2 -ml-2 text-muted hover:text-fg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button onClick={() => setShowInfo(true)} className="min-w-0 text-left">
              <h2 className="text-[22px] md:text-[28px] font-semibold text-fg leading-tight tracking-tight truncate">
                {title}
              </h2>
              <p className="text-[16px] text-muted truncate">
                {isGroup ? (
                  <>
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                    {onlineCount > 0 && `, ${onlineCount} online`}
                  </>
                ) : otherUserOnline ? (
                  <span className="text-success">Online</span>
                ) : (
                  formatLastSeen(otherUserLastSeen)
                )}
              </p>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-muted">
            <button
              onClick={() => startCall(chatId, "audio")}
              disabled={callState !== "idle" || chat.isBlocked}
              className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Start voice call"
            >
              <Phone className="w-6 h-6" strokeWidth={1.8} />
            </button>
            <button
              onClick={() => startCall(chatId, "video")}
              disabled={callState !== "idle" || chat.isBlocked}
              className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Start video call"
            >
              <Video className="w-6 h-6" strokeWidth={1.8} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="p-2.5 rounded-xl hover:text-fg hover:bg-surface-2 transition-colors"
                title="More"
              >
                <MoreVertical className="w-6 h-6" strokeWidth={1.8} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-48 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
                    <button
                      onClick={() => {
                        setShowInfo((v) => !v);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      {showInfo ? "Hide info" : isGroup ? "Group info" : "Contact info"}
                    </button>
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Chat settings
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Message List Area */}
        <MessageList chatId={chatId} water={waterRef} />

        {/* Composer Area */}
        {chat.isBlocked ? (
          <div className="p-4 shrink-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted text-sm bg-surface-2 px-4 py-2.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              You cannot reply to this conversation.
            </div>
          </div>
        ) : (
          <MessageComposer chatId={chatId} />
        )}
      </div>

      {showInfo && infoPanel}

      {/* Settings Modal */}
      {showSettings && (
        <ChatSettingsModal chatId={chatId} onClose={() => setShowSettings(false)} />
      )}

      {/* Lightbox for media opened from the Shared panel */}
      <MediaLightbox
        src={infoLightbox?.url || null}
        type={infoLightbox?.type || "image"}
        onClose={() => setInfoLightbox(null)}
      />
    </div>
  );
}
