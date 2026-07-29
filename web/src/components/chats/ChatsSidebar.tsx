"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatsApi, Chat } from "@/lib/api/chats";
import { Message } from "@/lib/api/messages";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Plus, Search, MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { NewChatModal } from "./NewChatModal";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import { useSocketEvent } from "@/hooks/useSocket";
import { ChatListSkeleton } from "@/components/ui/Skeleton";

export function ChatsSidebar() {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const { isOnline } = usePresence();
  const queryClient = useQueryClient();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "dm" | "group">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatsApi.getChats(),
  });

  useSocketEvent<Message>("message:new", (newMessage) => {
    queryClient.setQueryData(["chats"], (oldData: { chats: Chat[] } | undefined) => {
      if (!oldData?.chats) return oldData;
      let found = false;
      const updatedChats = oldData.chats.map((c: Chat) => {
        if (c.id === newMessage.chatId) {
          found = true;
          return {
            ...c,
            latestMessage: newMessage,
            updatedAt: newMessage.createdAt || new Date().toISOString(),
          };
        }
        return c;
      });

      if (!found) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        return oldData;
      }

      updatedChats.sort(
        (a: Chat, b: Chat) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
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

  // Filter chats by tab & search query
  const filteredChats = chats.filter((chat) => {
    if (activeTab === "dm" && chat.type !== "dm") return false;
    if (activeTab === "group" && chat.type !== "group") return false;

    if (!searchQuery.trim()) return true;
    const title = renderChatTitle(chat).toLowerCase();
    const latestMsg = (getMessagePreview(chat.latestMessage) || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || latestMsg.includes(query);
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

      {/* Search Input & Tabs */}
      <div className="p-4 shrink-0 space-y-4 z-10 bg-surface/40 backdrop-blur-md">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-surface-2 border border-border text-fg placeholder-muted text-sm rounded-full pl-10 pr-4 py-2.5 transition-all duration-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 shadow-inner"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted group-focus-within:text-accent transition-colors pointer-events-none" />
        </div>

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

              return (
                <li key={chat.id}>
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
                          "text-sm font-semibold truncate transition-colors",
                          isActive ? "text-fg" : "text-fg group-hover:text-fg"
                        )}>
                          {title}
                        </p>
                        <span className="text-[10px] font-mono whitespace-nowrap ml-2 opacity-70">
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-xs truncate opacity-80">
                        {getMessagePreview(chat.latestMessage) || (
                          <span className="italic opacity-50">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center space-y-4 animate-in-slide mt-10">
                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mx-auto text-muted">
                  <MessageSquarePlus className="w-8 h-8" />
                </div>
                <p className="text-sm text-faint font-medium">
                  {searchQuery ? "No matching conversations found." : "No chats yet. Start a conversation!"}
                </p>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
