"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { chatsApi, Chat, ChatPreferences } from "@/lib/api/chats";
import { Message } from "@/lib/api/messages";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Plus,
  MessageSquarePlus,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { NewChatModal } from "./NewChatModal";
import { ChatFoldersRail } from "./ChatFoldersRail";
import { FolderManagerModal } from "./FolderManagerModal";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import { useSocketEvent } from "@/hooks/useSocket";
import { ChatListSkeleton } from "@/components/ui/Skeleton";

// Mirrors the server's ordering: pinned first, then most recently active.
function byPinnedThenRecent(a: Chat, b: Chat) {
  const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : null;
  const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : null;
  if (ap !== bp) {
    if (ap === null) return 1;
    if (bp === null) return -1;
    return bp - ap;
  }
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function ChatsSidebar() {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();
  const queryClient = useQueryClient();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "dm" | "group" | "archived">("all");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);

  const showArchived = activeTab === "archived";

  const { data, isLoading } = useQuery({
    queryKey: showArchived ? ["chats", { archived: true }] : ["chats"],
    queryFn: () => chatsApi.getChats(showArchived ? { archived: true } : undefined),
  });

  const prefsMutation = useMutation({
    mutationFn: ({ chatId, prefs }: { chatId: string; prefs: ChatPreferences }) =>
      chatsApi.updateChatPreferences(chatId, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  const setPref = (chatId: string, prefs: ChatPreferences) => {
    setMenuChatId(null);
    prefsMutation.mutate({ chatId, prefs });
  };

  // Other devices of this user changed a chat's pin/archive/mute state.
  useSocketEvent("chat:preferences", () => {
    queryClient.invalidateQueries({ queryKey: ["chats"] });
  });

  // Opening a chat marks it read server-side (MessageList), so clear the badge
  // straight away rather than waiting for the next list refetch.
  const openChatId = pathname.startsWith("/chats/")
    ? pathname.slice("/chats/".length)
    : null;

  useEffect(() => {
    if (!openChatId) return;
    queryClient.setQueryData(["chats"], (oldData: { chats: Chat[] } | undefined) => {
      if (!oldData?.chats) return oldData;
      if (!oldData.chats.some((c) => c.id === openChatId && (c.unreadCount || 0) > 0)) {
        return oldData;
      }
      return {
        ...oldData,
        chats: oldData.chats.map((c) =>
          c.id === openChatId ? { ...c, unreadCount: 0 } : c,
        ),
      };
    });
  }, [openChatId, queryClient, data]);

  useSocketEvent<Message>("message:new", (newMessage) => {
    queryClient.setQueryData(["chats"], (oldData: { chats: Chat[] } | undefined) => {
      if (!oldData?.chats) return oldData;
      let found = false;
      const isOpen = pathname === `/chats/${newMessage.chatId}`;
      const updatedChats = oldData.chats.map((c: Chat) => {
        if (c.id === newMessage.chatId) {
          found = true;
          return {
            ...c,
            latestMessage: newMessage,
            updatedAt: newMessage.createdAt || new Date().toISOString(),
            // The open chat marks itself read, so only bump the others.
            unreadCount: isOpen
              ? c.unreadCount || 0
              : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });

      if (!found) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        return oldData;
      }

      updatedChats.sort(byPinnedThenRecent);
      return { ...oldData, chats: updatedChats };
    });
  });

  const getMessagePreview = (msg: Message | undefined | null) => {
    if (!msg) return null;
    if (msg.isDeleted) return "Message deleted";
    if (msg.type === "image") return "📷 Photo";
    if (msg.type === "audio") return "🎵 Voice message";
    if (msg.type === "file") return "📁 Attachment";
    if ((msg.type as string) === "call") return "📞 Call";
    return msg.content || "Message";
  };

  const chats = data?.chats || [];

  const renderChatTitle = (chat: Chat) => {
    if (chat.type === "group") return chat.name || "Unnamed Group";
    const otherParticipant = chat.participants?.find(
      (p) => p.userId !== currentUser?.id
    );
    return otherParticipant?.user?.displayName || "Unknown User";
  };

  const getOtherParticipant = (chat: Chat) => {
    if (chat.type === "group") return null;
    return chat.participants?.find((p) => p.userId !== currentUser?.id)?.user;
  };

  // Filter chats by tab & folder
  const filteredChats = chats.filter((chat) => {
    if (activeTab === "dm" && chat.type !== "dm") return false;
    if (activeTab === "group" && chat.type !== "group") return false;
    // The archived tab queries its own list, so no extra filtering here.
    if (activeFolderId && !(chat.folderIds || []).includes(activeFolderId)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-transparent select-none">
      {/* Header Bar */}
      <div className="h-[72px] flex items-center justify-between px-6 shrink-0 glass-panel-subtle border-0 border-b border-border z-10">
        <h2 className="text-2xl font-bold text-fg tracking-tight font-display">Messages</h2>
        <button
          onClick={() => setIsNewChatOpen(true)}
          className="p-2.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all duration-300 active:scale-95 flex items-center justify-center shadow-lg hover:shadow-[0_0_15px_rgba(211,161,94,0.4)]"
          title="New Conversation"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <FolderManagerModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />

      {/* Folders & Tabs */}
      <div className="p-4 shrink-0 space-y-4 z-10 bg-surface/40 backdrop-blur-md">
        {/* Folder rail — a second filter dimension above the type tabs */}
        {!showArchived && (
          <ChatFoldersRail
            activeFolderId={activeFolderId}
            onSelect={setActiveFolderId}
            onManage={() => setIsFoldersOpen(true)}
            totalUnread={chats.reduce((s, c) => s + (c.unreadCount || 0), 0)}
          />
        )}

        {/* Segmented Tabs */}
        <div className="flex bg-surface-2/60 p-1 rounded-xl border border-border text-xs font-medium backdrop-blur-lg">
          <button
            onClick={() => setActiveTab("all")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg transition-all duration-300",
              activeTab === "all" ? "bg-surface text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("dm")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg transition-all duration-300",
              activeTab === "dm" ? "bg-surface text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
            )}
          >
            Direct
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg transition-all duration-300",
              activeTab === "group" ? "bg-surface text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
            )}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            title="Archived chats"
            className={clsx(
              "flex-1 py-1.5 rounded-lg transition-all duration-300 flex items-center justify-center",
              activeTab === "archived" ? "bg-surface text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
            )}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 relative z-0">
        {isLoading ? (
          <div className="pt-2"><ChatListSkeleton /></div>
        ) : (
          <ul className="space-y-1">
            {filteredChats.map((chat) => {
              const isActive = pathname === `/chats/${chat.id}`;
              const title = renderChatTitle(chat);
              const isGroup = chat.type === "group";
              const otherUser = getOtherParticipant(chat);
              const unread = chat.unreadCount || 0;
              const mentions = chat.mentionCount || 0;
              const isPinned = !!chat.pinnedAt;
              const isArchived = !!chat.archivedAt;

              return (
                <li key={chat.id} className="relative group">
                  <Link
                    href={`/chats/${chat.id}`}
                    className={clsx(
                      "flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300 relative group",
                      isActive
                        ? "bg-accent/10 text-fg shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-accent before:rounded-r-full"
                        : "hover:bg-surface-2/40 text-muted hover:text-fg"
                    )}
                  >
                    <Avatar
                      src={isGroup ? chat.avatarUrl : otherUser?.avatarUrl}
                      name={title}
                      size="lg"
                      isGroup={isGroup}
                      showPresence={!isGroup}
                      isOnline={isOnline(otherUser?.id)}
                      className={clsx("transition-transform duration-300 group-hover:scale-105", isActive && "ring-2 ring-accent/30")}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className={clsx(
                          "text-sm truncate transition-colors flex items-center gap-1.5",
                          unread > 0 ? "font-bold text-fg" : "font-semibold text-fg"
                        )}>
                          {isPinned && (
                            <Pin className="w-3 h-3 shrink-0 text-accent rotate-45" />
                          )}
                          {chat.isMuted && (
                            <BellOff className="w-3 h-3 shrink-0 opacity-50" />
                          )}
                          <span className="truncate">{title}</span>
                        </p>
                        <span className="text-[10px] font-mono whitespace-nowrap ml-2 opacity-70">
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={clsx(
                          "text-xs truncate flex-1",
                          unread > 0 ? "opacity-100 font-medium" : "opacity-80"
                        )}>
                          {getMessagePreview(chat.latestMessage) || (
                            <span className="italic opacity-50">No messages yet</span>
                          )}
                        </p>
                        {/* A mention cuts through a muted chat, so it gets its
                            own accent marker regardless of mute state. */}
                        {mentions > 0 && (
                          <span
                            className="shrink-0 w-5 h-5 rounded-full bg-accent text-black text-[11px] font-bold flex items-center justify-center shadow-sm"
                            title={`${mentions} mention${mentions === 1 ? "" : "s"}`}
                          >
                            @
                          </span>
                        )}
                        {unread > 0 && (
                          <span
                            className={clsx(
                              "shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold font-mono",
                              "flex items-center justify-center",
                              chat.isMuted && mentions === 0
                                ? "bg-surface-3 text-muted"
                                : "bg-accent text-black shadow-sm"
                            )}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Pin / archive / mute. Outside the Link so clicks don't navigate. */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuChatId(menuChatId === chat.id ? null : chat.id);
                    }}
                    className={clsx(
                      "absolute right-2 top-2 p-1.5 rounded-lg transition-all z-10",
                      "text-muted hover:text-fg hover:bg-surface-3/60",
                      menuChatId === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    )}
                    title="Chat options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {menuChatId === chat.id && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setMenuChatId(null)}
                      />
                      <div className="absolute right-2 top-9 z-30 w-44 py-1 rounded-xl glass-panel border border-border shadow-2xl text-xs">
                        <button
                          onClick={() => setPref(chat.id, { pinned: !isPinned })}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-muted hover:text-fg hover:bg-surface-3/40 transition-colors"
                        >
                          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          {isPinned ? "Unpin" : "Pin to top"}
                        </button>
                        <button
                          onClick={() => setPref(chat.id, { muted: !chat.isMuted })}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-muted hover:text-fg hover:bg-surface-3/40 transition-colors"
                        >
                          {chat.isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                          {chat.isMuted ? "Unmute" : "Mute"}
                        </button>
                        <button
                          onClick={() => setPref(chat.id, { archived: !isArchived })}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-muted hover:text-fg hover:bg-surface-3/40 transition-colors"
                        >
                          {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                          {isArchived ? "Unarchive" : "Archive"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center space-y-4 animate-in-slide mt-10">
                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mx-auto text-muted">
                  <MessageSquarePlus className="w-8 h-8" />
                </div>
                <p className="text-sm text-faint font-medium">
                  No chats yet. Start a conversation!
                </p>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
