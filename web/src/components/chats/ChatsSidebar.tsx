"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatsApi, Chat } from "@/lib/api/chats";
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

  useSocketEvent("message:new", (newMessage: any) => {
    queryClient.setQueryData(["chats"], (oldData: any) => {
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

  const getMessagePreview = (msg: any) => {
    if (!msg) return null;
    if (msg.isDeleted) return "Message deleted";
    if (msg.type === "image") return "📷 Photo";
    if (msg.type === "audio") return "🎵 Voice message";
    if (msg.type === "file") return "📁 Attachment";
    if (msg.type === "call") return "📞 Call";
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
    <div className="flex flex-col h-full bg-zinc-950/80 border-r border-zinc-800/80 select-none">
      {/* Header Bar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/80 shrink-0">
        <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
        <button
          onClick={() => setIsNewChatOpen(true)}
          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 flex items-center justify-center"
          title="New Conversation"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />

      {/* Search Input */}
      <div className="p-3 border-b border-zinc-800/60 shrink-0 space-y-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-xl pl-9 pr-3 py-2 transition-all focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        </div>

        {/* Segmented Tabs */}
        <div className="flex bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800/80 text-[11px] font-medium">
          <button
            onClick={() => setActiveTab("all")}
            className={clsx(
              "flex-1 py-1 rounded-md transition-colors",
              activeTab === "all" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("dm")}
            className={clsx(
              "flex-1 py-1 rounded-md transition-colors",
              activeTab === "dm" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Direct
          </button>
          <button
            onClick={() => setActiveTab("group")}
            className={clsx(
              "flex-1 py-1 rounded-md transition-colors",
              activeTab === "group" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatListSkeleton />
        ) : (
          <ul className="divide-y divide-zinc-800/30">
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
                      "flex items-center gap-3.5 p-3.5 transition-all duration-150 relative group",
                      isActive
                        ? "bg-zinc-900/90 text-white border-l-2 border-emerald-500"
                        : "hover:bg-zinc-900/40 text-zinc-300"
                    )}
                  >
                    <Avatar
                      src={isGroup ? chat.avatarUrl : otherUser?.avatarUrl}
                      name={title}
                      size="lg"
                      isGroup={isGroup}
                      showPresence={!isGroup}
                      isOnline={isOnline(otherUser?.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="text-sm font-semibold truncate text-zinc-100 group-hover:text-white">
                          {title}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: false })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {getMessagePreview(chat.latestMessage) || (
                          <span className="italic text-zinc-500">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <p className="text-xs text-zinc-500">
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
