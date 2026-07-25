"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi, Chat } from "@/lib/api/chats";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Loader2, Plus, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import { useState } from "react";
import { NewChatModal } from "./NewChatModal";

export function ChatsSidebar() {
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatsApi.getChats(),
  });
  
  const chats = data?.chats;

  const renderChatTitle = (chat: Chat) => {
    if (chat.type === 'group') return chat.name || 'Unnamed Group';
    
    // For DMs, find the other participant
    const otherParticipant = chat.participants?.find(p => p.userId !== currentUser?.id);
    return otherParticipant?.user?.displayName || 'Unknown User';
  };

  const renderAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return (
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Users className="w-6 h-6 text-zinc-400" />
        </div>
      );
    }
    const otherParticipant = chat.participants?.find(p => p.userId !== currentUser?.id);
    const avatarUrl = otherParticipant?.user?.avatarUrl;
    
    return avatarUrl ? (
      <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
    ) : (
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-zinc-400" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <h2 className="text-xl font-bold text-white">Chats</h2>
        <button 
          onClick={() => setIsNewChatOpen(true)}
          className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/50">
            {chats?.map((chat) => {
              const isActive = pathname === `/chats/${chat.id}`;
              const title = renderChatTitle(chat);
              
              return (
                <li key={chat.id}>
                  <Link 
                    href={`/chats/${chat.id}`}
                    className={clsx(
                      "flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors",
                      isActive && "bg-zinc-800/80"
                    )}
                  >
                    {renderAvatar(chat)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="text-sm font-medium text-white truncate">{title}</p>
                        <span className="text-xs text-zinc-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 truncate">
                        {chat.latestMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
            {chats?.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No chats yet. Start a conversation!
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
