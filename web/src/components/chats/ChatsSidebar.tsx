"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { chatsApi, Chat, ChatPreferences } from "@/lib/api/chats";
import { Message } from "@/lib/api/messages";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  MessageSquarePlus,
  SquarePen,
  Search,
  ChevronDown,
  CheckCheck,
  Mic,
  Image as ImageIcon,
  Video,
  Paperclip,
  Phone,
  Clock,
  Mail,
  User as UserIcon,
  Users,
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
import { useChatFolder } from "@/hooks/useChatFolder";
import { shortAgo } from "@/lib/utils/time";

type ChatView = "recent" | "unread" | "dm" | "group" | "archived";

const VIEWS: { value: ChatView; label: string; title: string; icon: typeof Clock }[] = [
  { value: "recent", label: "Recent", title: "Chats", icon: Clock },
  { value: "unread", label: "Unread", title: "Unread", icon: Mail },
  { value: "dm", label: "Direct", title: "Direct", icon: UserIcon },
  { value: "group", label: "Groups", title: "Groups", icon: Users },
  { value: "archived", label: "Archived", title: "Archived", icon: Archive },
];

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
  const [view, setView] = useState<ChatView>("recent");
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const { folderId, setFolderId } = useChatFolder();
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);

  const showArchived = view === "archived";

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

  // Preview line: who said it (in groups / when it was you), then what.
  const renderPreview = (chat: Chat, sentByMe: boolean) => {
    const msg = chat.latestMessage;
    if (!msg) return <span className="italic text-faint">No messages yet</span>;

    let body: React.ReactNode = msg.content || "Message";
    if (msg.isDeleted) body = <span className="italic">Message deleted</span>;
    else if (msg.type === "audio") body = <span className="inline-flex items-center gap-1 text-accent"><Mic className="w-4 h-4" />Voice message</span>;
    else if (msg.type === "image") body = <span className="inline-flex items-center gap-1"><ImageIcon className="w-4 h-4" />{msg.content || "Photo"}</span>;
    else if (msg.type === "video") body = <span className="inline-flex items-center gap-1"><Video className="w-4 h-4" />{msg.content || "Video"}</span>;
    else if (msg.type === "file") body = <span className="inline-flex items-center gap-1"><Paperclip className="w-4 h-4" />{msg.content || "Attachment"}</span>;
    else if ((msg.type as string) === "call") body = <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4" />Call</span>;

    const who = sentByMe
      ? "You"
      : chat.type === "group"
        ? msg.sender?.displayName?.split(" ")[0]
        : null;

    return (
      <>
        {who && <span className="text-accent">{who}: </span>}
        {body}
      </>
    );
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

  const query = search.trim().toLowerCase();

  // Filter chats by view, folder & search
  const filteredChats = chats.filter((chat) => {
    if (view === "dm" && chat.type !== "dm") return false;
    if (view === "group" && chat.type !== "group") return false;
    if (view === "unread" && !(chat.unreadCount || 0)) return false;
    // The archived view queries its own list, so no extra filtering here.
    if (!showArchived && folderId && !(chat.folderIds || []).includes(folderId)) {
      return false;
    }
    if (query) {
      const haystack = `${renderChatTitle(chat)} ${chat.latestMessage?.content || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const activeView = VIEWS.find((v) => v.value === view)!;

  return (
    <div className="flex flex-col h-full select-none">
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <FolderManagerModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />

      <div className="px-5 pt-5 shrink-0 space-y-5">
        <label className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-muted focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
          <Search className="h-5 w-5 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-[15px] text-fg placeholder:text-muted focus:outline-none"
          />
        </label>

        {/* Folder pills — on desktop the nav rail carries folders */}
        {!showArchived && (
          <div className="md:hidden">
            <ChatFoldersRail
              activeFolderId={folderId}
              onSelect={setFolderId}
              onManage={() => setIsFoldersOpen(true)}
              totalUnread={chats.reduce((s, c) => s + (c.unreadCount || 0), 0)}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-semibold text-fg tracking-tight">{activeView.title}</h2>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setIsViewMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] text-muted hover:text-fg hover:bg-surface-2 transition-colors"
              >
                {activeView.label}
                <ChevronDown className={clsx("h-4 w-4 transition-transform", isViewMenuOpen && "rotate-180")} />
              </button>
              {isViewMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsViewMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-30 w-40 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
                    {VIEWS.map((v) => (
                      <button
                        key={v.value}
                        onClick={() => {
                          setView(v.value);
                          setIsViewMenuOpen(false);
                        }}
                        className={clsx(
                          "w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors",
                          view === v.value ? "text-accent font-medium" : "text-muted hover:text-fg hover:bg-surface-2"
                        )}
                      >
                        <v.icon className="h-4 w-4" />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-accent hover:bg-surface-3 transition-colors"
              title="New conversation"
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {isLoading ? (
          <div className="pt-2"><ChatListSkeleton /></div>
        ) : (
          <ul className="space-y-0.5">
            {filteredChats.map((chat) => {
              const isActive = pathname === `/chats/${chat.id}`;
              const title = renderChatTitle(chat);
              const isGroup = chat.type === "group";
              const otherUser = getOtherParticipant(chat);
              const unread = chat.unreadCount || 0;
              const mentions = chat.mentionCount || 0;
              const isPinned = !!chat.pinnedAt;
              const isArchived = !!chat.archivedAt;
              const latest = chat.latestMessage;
              const sentByMe = !!latest && latest.senderId === currentUser?.id;
              const seen = sentByMe && !!latest?.status?.some((st) => st.readAt);

              return (
                <li key={chat.id} className="relative group">
                  <Link
                    href={`/chats/${chat.id}`}
                    className={clsx(
                      "flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-colors",
                      isActive ? "bg-surface-2" : "hover:bg-surface-2/60"
                    )}
                  >
                    <Avatar
                      src={isGroup ? chat.avatarUrl : otherUser?.avatarUrl}
                      name={title}
                      size="xl"
                      isGroup={isGroup}
                      showPresence={!isGroup}
                      isOnline={isOnline(otherUser?.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="flex-1 min-w-0 flex items-center gap-1.5 text-[17px] font-semibold text-fg">
                          {chat.isMuted && <BellOff className="w-3.5 h-3.5 shrink-0 text-faint" />}
                          <span className="truncate">{title}</span>
                          {seen && <CheckCheck className="w-4 h-4 shrink-0 text-accent" aria-label="Read" />}
                        </p>
                        <span className="text-[13px] text-muted whitespace-nowrap">
                          {shortAgo(chat.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={clsx("text-[14px] truncate flex-1", unread > 0 ? "text-fg" : "text-muted")}>
                          {renderPreview(chat, sentByMe)}
                        </p>
                        {/* A mention cuts through a muted chat, so it gets its
                            own accent marker regardless of mute state. */}
                        {mentions > 0 && (
                          <span
                            className="shrink-0 w-[22px] h-[22px] rounded-full bg-accent text-accent-fg text-[12px] font-semibold flex items-center justify-center"
                            title={`${mentions} mention${mentions === 1 ? "" : "s"}`}
                          >
                            @
                          </span>
                        )}
                        {unread > 0 && (
                          <span
                            className={clsx(
                              "shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-semibold flex items-center justify-center",
                              chat.isMuted && mentions === 0
                                ? "bg-surface-3 text-muted"
                                : "bg-danger text-danger-fg"
                            )}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                        {isPinned && <Pin className="w-4 h-4 shrink-0 text-accent fill-accent" aria-label="Pinned" />}
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
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-surface shadow-[var(--shadow-sm)] transition-opacity z-10",
                      "text-muted hover:text-fg",
                      menuChatId === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    )}
                    title="Chat options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuChatId === chat.id && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setMenuChatId(null)}
                      />
                      <div className="absolute right-2 top-[calc(50%+20px)] z-30 w-44 py-1.5 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] text-sm">
                        <button
                          onClick={() => setPref(chat.id, { pinned: !isPinned })}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                        >
                          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          {isPinned ? "Unpin" : "Pin to top"}
                        </button>
                        <button
                          onClick={() => setPref(chat.id, { muted: !chat.isMuted })}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                        >
                          {chat.isMuted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                          {chat.isMuted ? "Unmute" : "Mute"}
                        </button>
                        <button
                          onClick={() => setPref(chat.id, { archived: !isArchived })}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-muted hover:text-fg hover:bg-surface-2 transition-colors"
                        >
                          {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          {isArchived ? "Unarchive" : "Archive"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center space-y-4 mt-10">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-accent">
                  <MessageSquarePlus className="w-7 h-7" />
                </div>
                <p className="text-sm text-muted">
                  {query
                    ? `No conversations match “${search.trim()}”.`
                    : showArchived
                      ? "No archived chats."
                      : "No chats here yet. Start a conversation!"}
                </p>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
