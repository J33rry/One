"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesApi, Message } from "@/lib/api/messages";
import { callsApi, Call } from "@/lib/api/calls";
import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocket";
import { useTyping } from "@/hooks/useTyping";
import { Loader2, MoreVertical, Trash2, Edit2, Smile, Phone, Video, PhoneMissed, Reply } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import { useCallStore } from "@/hooks/useCall";
import { useMessageActions } from "@/hooks/useMessageActions";
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface MessageListProps {
  chatId: string;
}

type TimelineItem = 
  | { type: 'message', data: Message, timestamp: number }
  | { type: 'call', data: Call, timestamp: number };

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageBubble({ msg, isMe, showAvatar, chatId, prevMsgMap }: { msg: Message, isMe: boolean, showAvatar: boolean, chatId: string, prevMsgMap: Map<string, Message> }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { setEditingMessage, setReplyingToMessage } = useMessageActions();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  
  const handleReact = (emoji: string) => {
    messagesApi.addReaction(chatId, msg.id, emoji).then(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }).catch(console.error);
    setShowReactionsMenu(false);
    setShowEmojiPicker(false);
  };

  const handleToggleReaction = (emoji: string) => {
    const hasReacted = msg.reactions?.some(r => r.userId === currentUser?.id && r.reaction === emoji);
    if (hasReacted) {
      messagesApi.removeReaction(chatId, msg.id, emoji).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      }).catch(console.error);
    } else {
      handleReact(emoji);
    }
  };

  const repliedTo = msg.replyToMessageId ? prevMsgMap.get(msg.replyToMessageId) : null;

  // Group reactions by emoji
  const reactionsMap = new Map<string, { count: number, me: boolean }>();
  msg.reactions?.forEach(r => {
    const curr = reactionsMap.get(r.reaction) || { count: 0, me: false };
    if (r.userId === currentUser?.id) curr.me = true;
    curr.count++;
    reactionsMap.set(r.reaction, curr);
  });

  return (
    <div className={clsx("flex gap-2 max-w-[85%]", isMe ? "self-end" : "self-start")}>
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 mt-auto overflow-hidden">
          {showAvatar && msg.sender?.avatarUrl && (
            <img src={msg.sender.avatarUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      
      <div className={clsx("flex flex-col relative", isMe ? "items-end" : "items-start")}>
        {!isMe && showAvatar && (
          <span className="text-xs text-zinc-400 ml-1 mb-1">{msg.sender?.displayName}</span>
        )}
        
        <div className={clsx(
          "px-4 py-2 rounded-2xl group relative",
          msg.isDeleted ? "bg-zinc-800 border border-zinc-700 italic text-zinc-500" :
          isMe ? "bg-emerald-600 text-white rounded-br-none" : "bg-zinc-800 text-zinc-100 rounded-bl-none"
        )}>
          {msg.isDeleted ? (
            "This message was deleted."
          ) : (
            <>
              {/* Replied Message Preview */}
              {repliedTo && (
                <div className={clsx(
                  "mb-2 p-2 rounded-lg text-sm border-l-2 max-h-16 overflow-hidden relative",
                  isMe ? "bg-emerald-700/50 border-emerald-300" : "bg-zinc-700/50 border-emerald-500"
                )}>
                  <p className={clsx("text-xs font-semibold mb-0.5", isMe ? "text-emerald-200" : "text-emerald-400")}>
                    {repliedTo.sender?.displayName || "User"}
                  </p>
                  <p className="truncate opacity-80">{repliedTo.content || "Media message"}</p>
                </div>
              )}

              {msg.type === 'image' && msg.media && (
                <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-xl">
                  <img src={msg.media.url} alt="Attachment" className="max-w-xs max-h-64 object-cover" />
                </div>
              )}
              {msg.type === 'file' && msg.media && (
                <a href={msg.media.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-2 p-2 rounded bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-sm truncate max-w-[200px]">{msg.media.filename}</span>
                </a>
              )}
              {msg.type === 'video' && msg.media && (
                <div className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-xl">
                  <video src={msg.media.url} controls className="max-w-xs max-h-64" />
                </div>
              )}
              {msg.type === 'audio' && msg.media && (
                <div className="mb-2">
                  <audio src={msg.media.url} controls className="max-w-xs h-10" />
                </div>
              )}
              
              {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
              {msg.isEdited && <span className="text-[10px] opacity-70 ml-2">(edited)</span>}
              
              {/* Message Actions Menu */}
              {!msg.isDeleted && (
                <div className={clsx(
                  "absolute top-1 hidden group-hover:flex items-center gap-1 bg-zinc-900 shadow-xl rounded-lg p-1 border border-zinc-700 z-10 before:content-[''] before:absolute before:top-0 before:bottom-0 before:w-4",
                  isMe ? "right-full mr-2 before:-right-4" : "left-full ml-2 before:-left-4"
                )}>
                  <div className="relative">
                    <button 
                      onClick={() => setShowReactionsMenu(!showReactionsMenu)}
                      className="p-1.5 hover:text-emerald-400 text-zinc-400 rounded-md hover:bg-zinc-800 transition-colors" 
                      title="React"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Reaction Popover */}
                    {(showReactionsMenu || showEmojiPicker) && (
                      <div className={clsx(
                        "absolute top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 flex gap-1 z-50",
                        isMe ? "right-0" : "left-0"
                      )}>
                        {showEmojiPicker ? (
                          <div className="relative z-50" onClick={(e) => e.stopPropagation()}>
                            <EmojiPicker 
                              theme={Theme.DARK} 
                              onEmojiClick={(e) => handleReact(e.emoji)}
                              lazyLoadEmojis={true}
                              searchDisabled={false}
                            />
                          </div>
                        ) : (
                          <>
                            {QUICK_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(emoji)}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-800 rounded-full transition-colors hover:-translate-y-1 transform duration-200"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => setShowEmojiPicker(true)}
                              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-full transition-colors"
                            >
                              +
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setReplyingToMessage(msg)}
                    className="p-1.5 hover:text-blue-400 text-zinc-400 rounded-md hover:bg-zinc-800 transition-colors" 
                    title="Reply"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                  
                  {isMe && (
                    <>
                      <button 
                        onClick={() => setEditingMessage(msg)}
                        className="p-1.5 hover:text-blue-400 text-zinc-400 rounded-md hover:bg-zinc-800 transition-colors" 
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1.5 hover:text-red-400 text-zinc-400 rounded-md hover:bg-zinc-800 transition-colors" title="Delete"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this message?")) {
                            messagesApi.deleteMessage(chatId, msg.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reaction Badges */}
        {reactionsMap.size > 0 && !msg.isDeleted && (
          <div className="flex flex-wrap gap-1 mt-1 z-0 relative">
            {Array.from(reactionsMap.entries()).map(([emoji, { count, me }]) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={clsx(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-colors border",
                  me ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/80 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700"
                )}
              >
                <span>{emoji}</span>
                {count > 1 && <span>{count}</span>}
              </button>
            ))}
          </div>
        )}
        
        <div className={clsx("flex items-center gap-1 px-1", reactionsMap.size > 0 ? "mt-0.5" : "mt-1")}>
          <span className="text-[10px] text-zinc-500">{format(new Date(msg.createdAt), "HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}

export function MessageList({ chatId }: MessageListProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { typingUsers } = useTyping(chatId);
  const { startCall } = useCallStore();
  
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isMessagesLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: ({ pageParam }) => messagesApi.getMessages(chatId, pageParam, 50),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pageMsgs = lastPage?.messages || [];
      if (pageMsgs.length < 50) return undefined;
      return pageMsgs[pageMsgs.length - 1].id;
    },
  });

  const { data: callsData } = useQuery({
    queryKey: ['calls', chatId],
    queryFn: () => callsApi.getChatCallHistory(chatId),
  });

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isMessagesLoading || isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [isMessagesLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Read receipts logic (simplified)
  useEffect(() => {
    const firstPageMsgs = messagesData?.pages[0]?.messages || [];
    if (firstPageMsgs.length) {
      const unreadMessages = firstPageMsgs.filter(
        m => m.senderId !== currentUser?.id && 
        (!m.status || !m.status.some(s => s.userId === currentUser?.id && s.readAt))
      );
      if (unreadMessages.length > 0) {
        const idsToMark = unreadMessages.slice(0, 100).map(m => m.id);
        messagesApi.markAsRead(chatId, idsToMark).catch(console.error);
      }
    }
  }, [messagesData, chatId, currentUser?.id]);

  // Realtime updates
  useSocketEvent('message:new', (payload: Message) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });

  useSocketEvent('message:new:ack', (payload: Message) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  useSocketEvent('message:edit', (payload: Message) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  useSocketEvent('message:delete', (payload: { id: string, chatId: string }) => {
    if (payload.chatId === chatId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  useSocketEvent('message:reaction', (payload: { messageId: string, chatId: string }) => {
    // We don't check chatId strictly if it's not sent, but the backend sends it in the broadcast wrapper
    // Wait, let's just invalidate messages for the current chatId
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
  });

  // Call realtime updates
  useSocketEvent('call:ended', (payload: { callId: string }) => {
    queryClient.invalidateQueries({ queryKey: ['calls', chatId] });
  });

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Combine and sort
  const messagesList = messagesData?.pages.flatMap(page => page.messages || []) || [];
  const callsList = callsData?.calls || [];

  const prevMsgMap = new Map<string, Message>();
  messagesList.forEach(m => prevMsgMap.set(m.id, m));

  const timelineItems: TimelineItem[] = [
    ...messagesList.map(m => ({ type: 'message' as const, data: m, timestamp: new Date(m.createdAt).getTime() })),
    ...callsList.map(c => ({ type: 'call' as const, data: c, timestamp: new Date(c.startedAt).getTime() }))
  ];

  timelineItems.sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col" ref={scrollRef}>
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" /> : <div className="h-5" />}
        </div>
      )}

      {timelineItems.length === 0 && !hasNextPage ? (
        <div className="mt-auto text-center text-sm text-zinc-500 py-8">
          This is the start of your chat history.
        </div>
      ) : (
        <div className="flex flex-col justify-end min-h-full space-y-4">
          {timelineItems.map((item, index) => {
            if (item.type === 'call') {
              const call = item.data as Call;
              const isOutgoing = call.initiatorId === currentUser?.id;
              const isMissed = !call.endedAt && Date.now() - new Date(call.startedAt).getTime() > 5 * 60 * 1000;
              const isOngoing = !call.endedAt && !isMissed;

              return (
                <div key={`call-${call.id}`} className="flex justify-center my-2">
                  <div 
                    onClick={() => {
                        if (!isOngoing) {
                           startCall(chatId, call.type);
                        }
                    }}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-2 rounded-2xl border cursor-pointer hover:bg-zinc-800 transition-colors bg-zinc-900 shadow-sm",
                      isMissed ? "border-red-500/50" : "border-zinc-800"
                    )}
                  >
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      isMissed ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {isMissed ? <PhoneMissed className="w-5 h-5" /> : (call.type === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />)}
                    </div>
                    <div>
                      <p className={clsx("text-sm font-medium", isMissed ? "text-red-400" : "text-white")}>
                        {isOutgoing ? "Outgoing" : "Incoming"} {call.type === 'video' ? 'Video' : 'Audio'} Call
                      </p>
                      <p className="text-xs text-zinc-500">
                        {isOngoing ? "Ongoing..." : isMissed ? "Missed" : "Ended"} • {format(new Date(call.startedAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            const msg = item.data as Message;
            const isMe = msg.senderId === currentUser?.id;
            
            // To determine if we should show the avatar, we must find the previous MESSAGE (ignoring calls)
            let prevMsg: Message | null = null;
            for (let i = index - 1; i >= 0; i--) {
                if (timelineItems[i].type === 'message') {
                    prevMsg = timelineItems[i].data as Message;
                    break;
                }
            }
            const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

            return (
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                isMe={isMe} 
                showAvatar={showAvatar} 
                chatId={chatId} 
                prevMsgMap={prevMsgMap} 
              />
            );
          })}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex gap-2 self-start items-end mt-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
