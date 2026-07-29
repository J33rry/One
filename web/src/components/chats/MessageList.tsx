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
                "flex gap-3 max-w-[85%] sm:max-w-[75%] min-w-0 group/row relative my-1 animate-in-slide",
                isMe ? "self-end" : "self-start",
            )}
        >
            {!isMe && (
                <div className="w-8 shrink-0 flex items-end mb-1">
                    {showAvatar ? (
                        <Avatar
                            src={msg.sender?.avatarUrl}
                            name={msg.sender?.displayName}
                            size="sm"
                            className="shadow-md"
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
                    <span className="text-[11px] font-semibold text-muted ml-2 mb-1.5">
                        {msg.sender?.displayName}
                    </span>
                )}

                <div
                    className={clsx(
                        "px-5 py-3 rounded-[24px] group relative text-[15px] shadow-sm transition-all duration-300 min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
                        msg.isDeleted
                            ? "bg-surface-2 border border-border italic text-faint"
                            : isMe
                              ? "bg-accent text-accent-fg rounded-br-sm shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
                              : "glass-panel text-fg rounded-bl-sm",
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
                                        "mb-3 p-3 rounded-2xl text-xs border-l-[3px] max-h-20 overflow-hidden relative",
                                        isMe
                                            ? "bg-accent-hover/20 border-accent-fg/40 text-accent-fg/90"
                                            : "bg-surface-3/30 border-accent text-muted",
                                    )}
                                >
                                    <p
                                        className={clsx(
                                            "font-bold text-[11px] mb-1 tracking-wide",
                                            isMe
                                                ? "text-accent-fg"
                                                : "text-accent",
                                        )}
                                    >
                                        {repliedTo.sender?.displayName ||
                                            "User"}
                                    </p>
                                    <p className="truncate opacity-90 font-medium">
                                        {repliedTo.content ||
                                            "Media attachment"}
                                    </p>
                                </div>
                            )}

                            {/* Image Media Attachment */}
                            {msg.type === "image" && msg.media && (
                                <div
                                    className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-2xl cursor-pointer relative group/img shadow-sm"
                                    onClick={() =>
                                        onOpenMedia(msg.media!.url, "image")
                                    }
                                >
                                    <img
                                        src={msg.media.url}
                                        alt="Attachment"
                                        className="max-w-xs max-h-72 object-cover rounded-2xl transition-transform duration-500 group-hover/img:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white backdrop-blur-[2px]">
                                        <Eye className="w-8 h-8 drop-shadow-md" />
                                    </div>
                                </div>
                            )}

                            {/* Video Media Attachment */}
                            {msg.type === "video" && msg.media && (
                                <div
                                    className="mb-2 -mx-2 -mt-1 overflow-hidden rounded-2xl cursor-pointer relative group/vid shadow-sm"
                                    onClick={() =>
                                        onOpenMedia(msg.media!.url, "video")
                                    }
                                >
                                    <video
                                        src={msg.media.url}
                                        className="max-w-xs max-h-64 rounded-2xl"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 transition-colors flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Audio Media Attachment */}
                            {msg.type === "audio" && msg.media && (
                                <div className="mb-2 min-w-[220px]">
                                    <audio
                                        src={msg.media.url}
                                        controls
                                        className="w-full h-10 rounded-xl outline-none"
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
                                        "flex items-center gap-3 mb-2 p-3 rounded-2xl transition-colors shadow-sm",
                                        isMe
                                            ? "bg-accent-hover/30 border border-accent-fg/20 hover:bg-accent-hover/40 text-accent-fg"
                                            : "bg-surface-3/50 border border-border hover:bg-surface-3/70 text-fg",
                                    )}
                                >
                                    <div className={clsx(
                                        "p-2.5 rounded-xl shrink-0",
                                        isMe ? "bg-accent-fg/20 text-accent-fg" : "bg-accent/10 text-accent"
                                    )}>
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate max-w-[180px]">
                                            {msg.media.filename}
                                        </p>
                                        <p className="text-[11px] opacity-70 font-medium mt-0.5">
                                            Download file
                                        </p>
                                    </div>
                                    <Download className="w-4 h-4 shrink-0 opacity-70" />
                                </a>
                            )}

                            {/* Text content */}
                            {msg.content && (
                                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-relaxed font-medium">
                                    {msg.content}
                                </p>
                            )}

                            {msg.isEdited && (
                                <span className="text-[10px] opacity-70 ml-2 font-mono uppercase tracking-widest inline-block mt-1">
                                    (edited)
                                </span>
                            )}

                            {/* Hover Actions Bar */}
                            {!msg.isDeleted && (
                                <div
                                    className={clsx(
                                        "absolute top-2 hidden group-hover/row:flex items-center gap-1 glass-pill p-1.5 z-20 shadow-xl",
                                        isMe
                                            ? "right-full translate-x-3"
                                            : "left-full -translate-x-3",
                                    )}
                                >
                                    <div className="relative">
                                        <button
                                            onClick={() =>
                                                setShowReactionsMenu(
                                                    !showReactionsMenu,
                                                )
                                            }
                                            className="p-2 hover:text-accent text-muted rounded-full hover:bg-surface-3/50 transition-colors"
                                            title="React"
                                        >
                                            <Smile className="w-4 h-4" />
                                        </button>

                                        {/* Reaction Popover */}
                                        {(showReactionsMenu ||
                                            showEmojiPicker) && (
                                            <div
                                                className={clsx(
                                                    "absolute top-full mt-3 glass-panel rounded-3xl p-2.5 flex gap-1 z-50 animate-in fade-in zoom-in-95 duration-200",
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
                                                                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-surface-3/50 rounded-full transition-all hover:scale-125"
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
                                                            className="w-10 h-10 flex items-center justify-center text-muted hover:bg-surface-3/50 hover:text-fg rounded-full transition-colors text-sm font-bold ml-1"
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
                                        className="p-2 hover:text-blue-400 text-muted rounded-full hover:bg-surface-3/50 transition-colors"
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
                                                className="p-2 hover:text-accent text-muted rounded-full hover:bg-surface-3/50 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-2 hover:text-danger text-muted rounded-full hover:bg-surface-3/50 transition-colors"
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
                    <div className={clsx(
                        "flex flex-wrap gap-1 mt-1.5 z-0 relative",
                        isMe ? "pr-1" : "pl-1"
                    )}>
                        {Array.from(reactionsMap.entries()).map(
                            ([emoji, { count, me }]) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(emoji)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm",
                                        me
                                            ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                            : "glass-pill text-muted hover:text-fg hover:bg-surface-3/30 border border-border",
                                    )}
                                >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="opacity-80">{count}</span>}
                                </button>
                            ),
                        )}
                    </div>
                )}

                <div
                    className={clsx(
                        "flex items-center gap-1 px-2 mt-1.5 text-[10px] text-faint font-mono tracking-wider",
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

    useSocketEvent("message:reaction", () => {
        queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    });

    useSocketEvent("call:ended", () => {
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
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 flex flex-col min-w-0 max-w-full relative z-0"
            ref={scrollRef}
        >
            {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-4 shrink-0">
                    {isFetchingNextPage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    ) : (
                        <div className="h-6" />
                    )}
                </div>
            )}

            {timelineItems.length === 0 && !hasNextPage ? (
                <div className="mt-auto text-center text-sm text-faint py-10 font-mono tracking-widest uppercase flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center border-dashed border-border text-muted">
                        <Smile className="w-5 h-5 opacity-50" />
                    </div>
                    Beginning of conversation
                </div>
            ) : (
                <div className="flex flex-col mt-auto space-y-4">
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
                                    <div className="sticky top-2 z-10 flex justify-center my-4 pointer-events-none">
                                        <span className="glass-pill px-4 py-1.5 text-[11px] font-bold font-mono tracking-widest uppercase text-muted shadow-md">
                                            {format(itemDate, "MMM d, yyyy")}
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
                                              <div className="flex justify-center my-3">
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
                                                          "flex items-center gap-4 px-5 py-3.5 rounded-3xl cursor-pointer hover:bg-surface-3/30 transition-all glass-panel shadow-md",
                                                          isMissed
                                                              ? "border-danger/30 hover:border-danger/50"
                                                              : "border-border hover:border-accent/30",
                                                      )}
                                                  >
                                                      <div
                                                          className={clsx(
                                                              "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                                                              isMissed
                                                                  ? "bg-danger/15 text-danger"
                                                                  : "bg-accent/15 text-accent",
                                                          )}
                                                      >
                                                          {isMissed ? (
                                                              <PhoneMissed className="w-5 h-5" />
                                                          ) : call.type ===
                                                            "video" ? (
                                                              <Video className="w-5 h-5" />
                                                          ) : (
                                                              <Phone className="w-5 h-5" />
                                                          )}
                                                      </div>
                                                      <div>
                                                          <p
                                                              className={clsx(
                                                                  "text-sm font-bold tracking-tight",
                                                                  isMissed
                                                                      ? "text-danger"
                                                                      : "text-fg",
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
                                                          <p className="text-[11px] text-muted font-mono mt-0.5 tracking-wider">
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
                        <div className="flex gap-3 self-start items-center mt-3 animate-in-slide">
                            <Avatar size="sm" className="opacity-70" />
                            <div className="glass-panel text-muted rounded-[24px] rounded-bl-sm px-5 py-3.5 flex items-center gap-2 shadow-sm">
                                <span
                                    className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
                                    style={{ animationDelay: "0ms" }}
                                />
                                <span
                                    className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
                                    style={{ animationDelay: "150ms" }}
                                />
                                <span
                                    className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
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
