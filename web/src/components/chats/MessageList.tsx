"use client";

import {
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { messagesApi, Message } from "@/lib/api/messages";
import { callsApi, Call } from "@/lib/api/calls";
import React, {
    useEffect,
    useRef,
    useCallback,
    useState,
    Fragment,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocketEvent } from "@/hooks/useSocket";
import { useTyping } from "@/hooks/useTyping";
import {
    Loader2,
    Trash2,
    Edit2,
    Smile,
    Phone,
    Video,
    PhoneMissed,
    Reply,
    FileIcon,
    Download,
    Eye,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import clsx from "clsx";
import { useCallStore } from "@/hooks/useCall";
import { useMessageActions } from "@/hooks/useMessageActions";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Avatar } from "@/components/ui/Avatar";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import { MessageListSkeleton } from "@/components/ui/Skeleton";

interface MessageListProps {
    chatId: string;
}

type TimelineItem =
    | { type: "message"; data: Message; timestamp: number }
    | { type: "call"; data: Call; timestamp: number };

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function MessageBubble({
    msg,
    isMe,
    showAvatar,
    chatId,
    prevMsgMap,
    onOpenMedia,
}: {
    msg: Message;
    isMe: boolean;
    showAvatar: boolean;
    chatId: string;
    prevMsgMap: Map<string, Message>;
    onOpenMedia: (url: string, type: "image" | "video") => void;
}) {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const { setEditingMessage, setReplyingToMessage } = useMessageActions();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactionsMenu, setShowReactionsMenu] = useState(false);

    const handleReact = (emoji: string) => {
        messagesApi
            .addReaction(chatId, msg.id, emoji)
            .then(() => {
                queryClient.invalidateQueries({
                    queryKey: ["messages", chatId],
                });
            })
            .catch(console.error);
        setShowReactionsMenu(false);
        setShowEmojiPicker(false);
    };

    const handleToggleReaction = (emoji: string) => {
        const hasReacted = msg.reactions?.some(
            (r) => r.userId === currentUser?.id && r.reaction === emoji,
        );
        if (hasReacted) {
            messagesApi
                .removeReaction(chatId, msg.id, emoji)
                .then(() => {
                    queryClient.invalidateQueries({
                        queryKey: ["messages", chatId],
                    });
                })
                .catch(console.error);
        } else {
            handleReact(emoji);
        }
    };

    const repliedTo = msg.replyToMessageId
        ? prevMsgMap.get(msg.replyToMessageId)
        : null;

    // Group reactions by emoji
    const reactionsMap = new Map<string, { count: number; me: boolean }>();
    msg.reactions?.forEach((r) => {
        const curr = reactionsMap.get(r.reaction) || { count: 0, me: false };
        if (r.userId === currentUser?.id) curr.me = true;
        curr.count++;
        reactionsMap.set(r.reaction, curr);
    });

    return (
        <div
            className={clsx(
                "flex gap-2.5 max-w-[85%] sm:max-w-[75%] min-w-0 group/row relative my-0.5",
                isMe ? "self-end" : "self-start",
            )}
        >
            {!isMe && (
                <div className="w-8 shrink-0 flex items-end">
                    {showAvatar ? (
                        <Avatar
                            src={msg.sender?.avatarUrl}
                            name={msg.sender?.displayName}
                            size="sm"
                        />
                    ) : (
                        <div className="w-8" />
                    )}
                </div>
            )}

            <div
                className={clsx(
                    "flex flex-col relative min-w-0 max-w-full",
                    isMe ? "items-end" : "items-start",
                )}
            >
                {!isMe && showAvatar && (
                    <span className="text-[11px] font-semibold text-zinc-400 ml-1 mb-1">
                        {msg.sender?.displayName}
                    </span>
                )}

                <div
                    className={clsx(
                        "px-4 py-2.5 rounded-2xl group relative text-sm shadow-sm transition-all duration-150 min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
                        msg.isDeleted
                            ? "bg-zinc-900 border border-zinc-800 italic text-zinc-500"
                            : isMe
                              ? "bg-emerald-600 text-white rounded-br-xs shadow-emerald-950/20"
                              : "bg-zinc-850 bg-zinc-900/90 text-zinc-100 border border-zinc-800/80 rounded-bl-xs shadow-black/40",
                    )}
                >
                    {msg.isDeleted ? (
                        "This message was deleted."
                    ) : (
                        <>
                            {/* Replied Message Preview */}
                            {repliedTo && (
                                <div
                                    className={clsx(
                                        "mb-2 p-2 rounded-xl text-xs border-l-2 max-h-16 overflow-hidden relative",
                                        isMe
                                            ? "bg-emerald-700/50 border-emerald-300 text-emerald-100"
                                            : "bg-zinc-800/80 border-emerald-500 text-zinc-300",
                                    )}
                                >
                                    <p
                                        className={clsx(
                                            "font-semibold text-[11px] mb-0.5",
                                            isMe
                                                ? "text-emerald-200"
                                                : "text-emerald-400",
                                        )}
                                    >
                                        {repliedTo.sender?.displayName ||
                                            "User"}
                                    </p>
                                    <p className="truncate opacity-90">
                                        {repliedTo.content ||
                                            "Media attachment"}
                                    </p>
                                </div>
                            )}

                            {/* Image Media Attachment */}
                            {msg.type === "image" && msg.media && (
                                <div
                                    className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-xl cursor-pointer relative group/img"
                                    onClick={() =>
                                        onOpenMedia(msg.media!.url, "image")
                                    }
                                >
                                    <img
                                        src={msg.media.url}
                                        alt="Attachment"
                                        className="max-w-xs max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Eye className="w-6 h-6" />
                                    </div>
                                </div>
                            )}

                            {/* Video Media Attachment */}
                            {msg.type === "video" && msg.media && (
                                <div
                                    className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-xl cursor-pointer relative group/vid"
                                    onClick={() =>
                                        onOpenMedia(msg.media!.url, "video")
                                    }
                                >
                                    <video
                                        src={msg.media.url}
                                        className="max-w-xs max-h-64 rounded-xl"
                                    />
                                </div>
                            )}

                            {/* Audio Media Attachment */}
                            {msg.type === "audio" && msg.media && (
                                <div className="mb-2 min-w-[200px]">
                                    <audio
                                        src={msg.media.url}
                                        controls
                                        className="w-full h-9 rounded-lg"
                                    />
                                </div>
                            )}

                            {/* Document/File Media Attachment */}
                            {msg.type === "file" && msg.media && (
                                <a
                                    href={msg.media.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={clsx(
                                        "flex items-center gap-3 mb-2 p-2.5 rounded-xl border transition-colors",
                                        isMe
                                            ? "bg-emerald-700/50 border-emerald-500/40 hover:bg-emerald-700/70 text-white"
                                            : "bg-zinc-800/80 border-zinc-700/60 hover:bg-zinc-800 text-zinc-100",
                                    )}
                                >
                                    <div className="p-2 rounded-lg bg-black/20 shrink-0">
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate max-w-[180px]">
                                            {msg.media.filename}
                                        </p>
                                        <p className="text-[10px] opacity-70">
                                            Download file
                                        </p>
                                    </div>
                                    <Download className="w-4 h-4 shrink-0 opacity-70" />
                                </a>
                            )}

                            {/* Text content */}
                            {msg.content && (
                                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed">
                                    {msg.content}
                                </p>
                            )}

                            {msg.isEdited && (
                                <span className="text-[10px] opacity-70 ml-1.5 font-mono">
                                    (edited)
                                </span>
                            )}

                            {/* Hover Actions Bar */}
                            {!msg.isDeleted && (
                                <div
                                    className={clsx(
                                        "absolute top-1 hidden group-hover/row:flex items-center gap-0.5 bg-zinc-900 shadow-xl rounded-xl p-1 border border-zinc-800 z-20",
                                        isMe
                                            ? "right-full mr-2"
                                            : "left-full ml-2",
                                    )}
                                >
                                    <div className="relative">
                                        <button
                                            onClick={() =>
                                                setShowReactionsMenu(
                                                    !showReactionsMenu,
                                                )
                                            }
                                            className="p-1.5 hover:text-emerald-400 text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors"
                                            title="React"
                                        >
                                            <Smile className="w-4 h-4" />
                                        </button>

                                        {/* Reaction Popover */}
                                        {(showReactionsMenu ||
                                            showEmojiPicker) && (
                                            <div
                                                className={clsx(
                                                    "absolute top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 flex gap-1 z-50 animate-in fade-in zoom-in-95 duration-150",
                                                    isMe ? "right-0" : "left-0",
                                                )}
                                            >
                                                {showEmojiPicker ? (
                                                    <div
                                                        className="relative z-50"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <EmojiPicker
                                                            theme={Theme.DARK}
                                                            onEmojiClick={(e) =>
                                                                handleReact(
                                                                    e.emoji,
                                                                )
                                                            }
                                                            lazyLoadEmojis={
                                                                true
                                                            }
                                                            searchDisabled={
                                                                false
                                                            }
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {QUICK_REACTIONS.map(
                                                            (emoji) => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() =>
                                                                        handleReact(
                                                                            emoji,
                                                                        )
                                                                    }
                                                                    className="w-8 h-8 flex items-center justify-center text-base hover:bg-zinc-800 rounded-full transition-all hover:scale-125"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ),
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                setShowEmojiPicker(
                                                                    true,
                                                                )
                                                            }
                                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-full transition-colors text-xs font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() =>
                                            setReplyingToMessage(msg)
                                        }
                                        className="p-1.5 hover:text-blue-400 text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors"
                                        title="Reply"
                                    >
                                        <Reply className="w-4 h-4" />
                                    </button>

                                    {isMe && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setEditingMessage(msg)
                                                }
                                                className="p-1.5 hover:text-emerald-400 text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1.5 hover:text-red-400 text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors"
                                                title="Delete"
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            "Are you sure you want to delete this message?",
                                                        )
                                                    ) {
                                                        messagesApi
                                                            .deleteMessage(
                                                                chatId,
                                                                msg.id,
                                                            )
                                                            .then(() => {
                                                                queryClient.invalidateQueries(
                                                                    {
                                                                        queryKey:
                                                                            [
                                                                                "messages",
                                                                                chatId,
                                                                            ],
                                                                    },
                                                                );
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
                        {Array.from(reactionsMap.entries()).map(
                            ([emoji, { count, me }]) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(emoji)}
                                    className={clsx(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border shadow-xs",
                                        me
                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                            : "bg-zinc-800/90 text-zinc-300 border-zinc-700/60 hover:bg-zinc-700",
                                    )}
                                >
                                    <span>{emoji}</span>
                                    {count > 1 && <span>{count}</span>}
                                </button>
                            ),
                        )}
                    </div>
                )}

                <div
                    className={clsx(
                        "flex items-center gap-1 px-1 mt-0.5 text-[10px] text-zinc-500 font-mono",
                    )}
                >
                    <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
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
    const isInitialLoadRef = useRef(true);
    const prevScrollHeightRef = useRef<number>(0);

    const { typingUsers } = useTyping(chatId);
    const { startCall } = useCallStore();

    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxType, setLightboxType] = useState<"image" | "video">(
        "image",
    );

    const handleOpenMedia = (url: string, type: "image" | "video") => {
        setLightboxSrc(url);
        setLightboxType(type);
    };

    const {
        data: messagesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isMessagesLoading,
    } = useInfiniteQuery({
        queryKey: ["messages", chatId],
        queryFn: ({ pageParam }) =>
            messagesApi.getMessages(chatId, pageParam, 50),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => {
            const pageMsgs = lastPage?.messages || [];
            if (pageMsgs.length < 50) return undefined;
            return pageMsgs[pageMsgs.length - 1].id;
        },
    });

    const { data: callsData } = useQuery({
        queryKey: ["calls", chatId],
        queryFn: () => callsApi.getChatCallHistory(chatId),
    });

    const loadMoreRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isMessagesLoading || isFetchingNextPage) return;
            if (observerRef.current) observerRef.current.disconnect();

            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    fetchNextPage();
                }
            });

            if (node) observerRef.current.observe(node);
        },
        [isMessagesLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
    );

    // Read receipts
    useEffect(() => {
        const firstPageMsgs = messagesData?.pages[0]?.messages || [];
        if (firstPageMsgs.length) {
            const unreadMessages = firstPageMsgs.filter(
                (m) =>
                    m.senderId !== currentUser?.id &&
                    (!m.status ||
                        !m.status.some(
                            (s) => s.userId === currentUser?.id && s.readAt,
                        )),
            );
            if (unreadMessages.length > 0) {
                const idsToMark = unreadMessages.slice(0, 100).map((m) => m.id);
                messagesApi.markAsRead(chatId, idsToMark).catch(console.error);
            }
        }
    }, [messagesData, chatId, currentUser?.id]);

    // Realtime updates
    useSocketEvent("message:new", (payload: Message) => {
        if (payload.chatId === chatId) {
            queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
            queryClient.invalidateQueries({ queryKey: ["chats"] });
        }
    });

    useSocketEvent("message:new:ack", (payload: Message) => {
        if (payload.chatId === chatId) {
            queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        }
    });

    useSocketEvent("message:edit", (payload: Message) => {
        if (payload.chatId === chatId) {
            queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        }
    });

    useSocketEvent(
        "message:delete",
        (payload: { id: string; chatId: string }) => {
            if (payload.chatId === chatId) {
                queryClient.invalidateQueries({
                    queryKey: ["messages", chatId],
                });
            }
        },
    );

    useSocketEvent(
        "message:reaction",
        (payload: { messageId: string; chatId: string }) => {
            queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
        },
    );

    useSocketEvent("call:ended", (payload: { callId: string }) => {
        queryClient.invalidateQueries({ queryKey: ["calls", chatId] });
    });

    const messagesList =
        messagesData?.pages.flatMap((page) => page.messages || []) || [];
    const callsList = callsData?.calls || [];

    const timelineItems: TimelineItem[] = [
        ...messagesList.map((m) => ({
            type: "message" as const,
            data: m,
            timestamp: new Date(m.createdAt).getTime(),
        })),
        ...callsList.map((c) => ({
            type: "call" as const,
            data: c,
            timestamp: new Date(c.startedAt).getTime(),
        })),
    ];

    timelineItems.sort((a, b) => a.timestamp - b.timestamp);

    // Initial scroll to bottom & scroll on new message
    useEffect(() => {
        if (scrollRef.current && timelineItems.length > 0) {
            if (isInitialLoadRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                isInitialLoadRef.current = false;
            } else {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
                if (isNearBottom) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }
        }
    }, [chatId, timelineItems.length]);

    // Reset initial load flag when switching chats
    useEffect(() => {
        isInitialLoadRef.current = true;
    }, [chatId]);

    // Preserve scroll position when loading older pages
    useEffect(() => {
        if (isFetchingNextPage && scrollRef.current) {
            prevScrollHeightRef.current = scrollRef.current.scrollHeight;
        }
    }, [isFetchingNextPage]);

    useEffect(() => {
        if (!isFetchingNextPage && prevScrollHeightRef.current && scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            if (diff > 0) {
                scrollRef.current.scrollTop += diff;
            }
            prevScrollHeightRef.current = 0;
        }
    }, [isFetchingNextPage]);

    if (isMessagesLoading) {
        return <MessageListSkeleton />;
    }

    const prevMsgMap = new Map<string, Message>();
    messagesList.forEach((m) => prevMsgMap.set(m.id, m));

    return (
        <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col min-w-0 max-w-full"
            ref={scrollRef}
        >
            {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-4 shrink-0">
                    {isFetchingNextPage ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    ) : (
                        <div className="h-5" />
                    )}
                </div>
            )}

            {timelineItems.length === 0 && !hasNextPage ? (
                <div className="mt-auto text-center text-xs text-zinc-500 py-8 font-mono">
                    Beginning of conversation history
                </div>
            ) : (
                <div className="flex flex-col mt-auto space-y-3">
                    {timelineItems.map((item, index) => {
                        const itemDate = new Date(item.timestamp);
                        const prevItemDate =
                            index > 0
                                ? new Date(timelineItems[index - 1].timestamp)
                                : null;
                        const showDateDivider =
                            !prevItemDate || !isSameDay(itemDate, prevItemDate);

                        return (
                            <Fragment
                                key={
                                    item.type === "message"
                                        ? (item.data as Message).id
                                        : `call-${(item.data as Call).id}`
                                }
                            >
                                {/* Sticky Date Divider */}
                                {showDateDivider && (
                                    <div className="sticky top-2 z-10 flex justify-center my-3">
                                        <span className="px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-[10px] font-mono text-zinc-400 shadow-md backdrop-blur-md">
                                            {format(itemDate, "MMMM d, yyyy")}
                                        </span>
                                    </div>
                                )}

                                {item.type === "call"
                                    ? (() => {
                                          const call = item.data as Call;
                                          const isOutgoing =
                                              call.initiatorId ===
                                              currentUser?.id;
                                          const isMissed =
                                              !call.endedAt &&
                                              Date.now() -
                                                  new Date(
                                                      call.startedAt,
                                                  ).getTime() >
                                                  5 * 60 * 1000;
                                          const isOngoing =
                                              !call.endedAt && !isMissed;

                                          return (
                                              <div className="flex justify-center my-2">
                                                  <div
                                                      onClick={() => {
                                                          if (!isOngoing) {
                                                              startCall(
                                                                  chatId,
                                                                  call.type,
                                                              );
                                                          }
                                                      }}
                                                      className={clsx(
                                                          "flex items-center gap-3 px-4 py-2.5 rounded-2xl border cursor-pointer hover:bg-zinc-850 transition-all bg-zinc-900 shadow-md",
                                                          isMissed
                                                              ? "border-red-500/40"
                                                              : "border-zinc-800",
                                                      )}
                                                  >
                                                      <div
                                                          className={clsx(
                                                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                                                              isMissed
                                                                  ? "bg-red-500/15 text-red-400"
                                                                  : "bg-emerald-500/15 text-emerald-400",
                                                          )}
                                                      >
                                                          {isMissed ? (
                                                              <PhoneMissed className="w-4 h-4" />
                                                          ) : call.type ===
                                                            "video" ? (
                                                              <Video className="w-4 h-4" />
                                                          ) : (
                                                              <Phone className="w-4 h-4" />
                                                          )}
                                                      </div>
                                                      <div>
                                                          <p
                                                              className={clsx(
                                                                  "text-xs font-semibold",
                                                                  isMissed
                                                                      ? "text-red-400"
                                                                      : "text-zinc-100",
                                                              )}
                                                          >
                                                              {isOutgoing
                                                                  ? "Outgoing"
                                                                  : "Incoming"}{" "}
                                                              {call.type ===
                                                              "video"
                                                                  ? "Video"
                                                                  : "Audio"}{" "}
                                                              Call
                                                          </p>
                                                          <p className="text-[10px] text-zinc-500 font-mono">
                                                              {isOngoing
                                                                  ? "Ongoing..."
                                                                  : isMissed
                                                                    ? "Missed"
                                                                    : "Ended"}{" "}
                                                              •{" "}
                                                              {format(
                                                                  new Date(
                                                                      call.startedAt,
                                                                  ),
                                                                  "HH:mm",
                                                              )}
                                                          </p>
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })()
                                    : (() => {
                                          const msg = item.data as Message;
                                          const isMe =
                                              msg.senderId === currentUser?.id;

                                          let prevMsg: Message | null = null;
                                          for (let i = index - 1; i >= 0; i--) {
                                              if (
                                                  timelineItems[i].type ===
                                                  "message"
                                              ) {
                                                  prevMsg = timelineItems[i]
                                                      .data as Message;
                                                  break;
                                              }
                                          }
                                          const showAvatar =
                                              !isMe &&
                                              (!prevMsg ||
                                                  prevMsg.senderId !==
                                                      msg.senderId);

                                          return (
                                              <MessageBubble
                                                  msg={msg}
                                                  isMe={isMe}
                                                  showAvatar={showAvatar}
                                                  chatId={chatId}
                                                  prevMsgMap={prevMsgMap}
                                                  onOpenMedia={handleOpenMedia}
                                              />
                                          );
                                      })()}
                            </Fragment>
                        );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="flex gap-2.5 self-start items-center mt-2">
                            <Avatar size="sm" />
                            <div className="bg-zinc-900 border border-zinc-800/80 text-zinc-400 rounded-2xl rounded-bl-xs px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
                                <span
                                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                                    style={{ animationDelay: "0ms" }}
                                />
                                <span
                                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                                    style={{ animationDelay: "150ms" }}
                                />
                                <span
                                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                                    style={{ animationDelay: "300ms" }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Fullscreen Media Lightbox Overlay */}
            <MediaLightbox
                src={lightboxSrc}
                type={lightboxType}
                onClose={() => setLightboxSrc(null)}
            />
        </div>
    );
}
