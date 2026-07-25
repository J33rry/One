"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi, Chat } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Info, Users, User, Phone, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { ActiveCall } from "../calls/ActiveCall";
import { useCallStore } from "@/hooks/useCall";
import { ChatSettingsModal } from "./ChatSettingsModal";

interface ChatMainProps {
  chatId: string;
}

export function ChatMain({ chatId }: ChatMainProps) {
  const { user: currentUser } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { callState, activeCall, livekitToken, livekitUrl, startCall } = useCallStore();

  const isInCall = (callState === 'connecting' || callState === 'connected') && activeCall?.chatId === chatId;
  
  const { data, isLoading } = useQuery({
    queryKey: ['chats', chatId],
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
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-400">
        Chat not found
      </div>
    );
  }

  const isGroup = chat.type === 'group';
  const otherParticipant = !isGroup ? chat.participants?.find(p => p.userId !== currentUser?.id) : null;
  const title = isGroup ? chat.name || "Unnamed Group" : otherParticipant?.user?.displayName || "Unknown User";
  
  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 relative">
      {isInCall && livekitToken && livekitUrl && (
        <ActiveCall 
          token={livekitToken}
          serverUrl={livekitUrl}
          callType={activeCall!.type}
        />
      )}

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shrink-0">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowSettings(true)}
        >
          <Link href="/" className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white" onClick={(e) => e.stopPropagation()}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
            {isGroup ? (
              chat.avatarUrl ? <img src={chat.avatarUrl} alt={title} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-zinc-400" />
            ) : (
              otherParticipant?.user?.avatarUrl ? <img src={otherParticipant.user.avatarUrl} alt={title} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-zinc-400" />
            )}
          </div>
          
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            {isGroup && (
              <p className="text-xs text-emerald-500">
                {chat.participants?.length || 0} participants
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => startCall(chatId, 'audio')}
            disabled={callState !== 'idle' || chat.isBlocked}
            className="p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Audio Call">
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => startCall(chatId, 'video')}
            disabled={callState !== 'idle' || chat.isBlocked}
            className="p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Video Call">
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 transition-colors ${showInfo ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
            title="Chat Info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Message List Area */}
      <MessageList chatId={chatId} />

      {/* Composer Area */}
      {chat.isBlocked ? (
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">You cannot reply to this conversation.</p>
        </div>
      ) : (
        <MessageComposer chatId={chatId} />
      )}

      {/* Info Sidebar Overlay (Mobile) / Slide out (Desktop) */}
      {showInfo && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-10 shadow-2xl">
          <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
            <h3 className="text-white font-medium">Chat Info</h3>
            <button onClick={() => setShowInfo(false)} className="text-zinc-400 hover:text-white text-sm">Close</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden mb-4">
                {isGroup ? (
                  chat.avatarUrl ? <img src={chat.avatarUrl} alt={title} className="w-full h-full object-cover" /> : <Users className="w-10 h-10 text-zinc-400" />
                ) : (
                  otherParticipant?.user?.avatarUrl ? <img src={otherParticipant.user.avatarUrl} alt={title} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-zinc-400" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {chat.description && <p className="text-sm text-zinc-400 mt-2">{chat.description}</p>}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Participants</h4>
              <ul className="space-y-3">
                {chat.participants?.map(p => (
                  <li key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {p.user?.avatarUrl ? <img src={p.user.avatarUrl} alt={p.user.displayName} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {p.userId === currentUser?.id ? "You" : p.user?.displayName}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{p.user?.username}</p>
                    </div>
                    {p.role === 'admin' && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">Admin</span>
                    )}
                  </li>
                ))}
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
