"use client";

import {
    useInfiniteQuery,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { messagesApi, Message } from "@/lib/api/messages";
import { callsApi, Call } from "@/lib/api/calls";
import { chatsApi } from "@/lib/api/chats";
import React, {
    RefObject,
    useEffect,
    useLayoutEffect,
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
    Check,
    CheckCheck,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import clsx from "clsx";
import { useCallStore } from "@/hooks/useCall";
import { useMessageActions } from "@/hooks/useMessageActions";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Avatar } from "@/components/ui/Avatar";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { renderMessageText } from "@/lib/utils/mentions";
import { VoiceNote } from "./VoiceNote";
import type { ChatWaterHandle } from "./ChatWater";

interface MessageListProps {
    chatId: string;
    water?: RefObject<ChatWaterHandle | null>;
}

// How long a new message takes to slide up from the composer.
const SLIDE_MS = 520;

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
    isGroup,
}: {
    msg: Message;
    isMe: boolean;
    showAvatar: boolean;
    chatId: string;
    prevMsgMap: Map<string, Message>;
    onOpenMedia: (url: string, type: "image" | "video") => void;
    isGroup: boolean;
}) {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const { setEditingMessage, setReplyingToMessage } = useMessageActions();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showReactionsMenu, setShowReactionsMenu] = useState(false);

    // Senders never mark their own message read, so every status row with a
    // readAt belongs to someone else: this is the "seen by" count.
    const readCount =
        msg.status?.filter((s) => s.readAt).length ?? 0;

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
                "flex items-center gap-3 sm:gap-4 max-w-[90%] sm:max-w-[80%] min-w-0 group/row relative animate-in-slide",
                isMe ? "self-end flex-row-reverse" : "self-start",
            )}
            data-msg-id={msg.id}
        >
            <div className="hidden sm:block w-14 shrink-0">
                {showAvatar && (
                    <Avatar
                        src={msg.sender?.avatarUrl}
                        name={msg.sender?.displayName}
                        size="xl"
                        className="[&>div]:!w-14 [&>div]:!h-14"
                    />
                )}
            </div>

            <div
                className={clsx(
                    "flex flex-col relative min-w-0 max-w-full",
                    isMe ? "items-end" : "items-start",
                )}
            >
                <div
                    data-bubble
                    className={clsx(
                        "px-4 py-2.5 rounded-[18px] group relative text-[16px] min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
                        msg.isDeleted
                            ? "bg-surface-2 italic text-muted"
                            : isMe
                              ? "bg-accent text-accent-fg shadow-[0_10px_24px_-14px_var(--accent)]"
                              : "bg-surface-2 text-fg",
                    )}
                >
                    {!isMe && showAvatar && isGroup && !msg.isDeleted && (
                        <p className="text-[15px] font-semibold text-accent leading-tight mb-0.5">
                            {msg.sender?.displayName}
                        </p>
                    )}
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
                                            ? "bg-white/15 border-white/60 text-accent-fg/90"
                                            : "bg-surface border-accent text-muted",
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
                                <VoiceNote
                                    src={msg.media.url}
                                    seed={msg.id}
                                    isMe={isMe}
                                />
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
                                            ? "bg-white/15 hover:bg-white/25 text-accent-fg"
                                            : "bg-surface hover:bg-surface-3 text-fg",
                                    )}
                                >
                                    <div className={clsx(
                                        "p-2.5 rounded-xl shrink-0",
                                        isMe ? "bg-white/20 text-accent-fg" : "bg-accent-muted text-accent"
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
                                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] leading-snug">
                                    {renderMessageText(
                                        msg.content,
                                        msg.mentions,
                                        currentUser?.id,
                                        isMe,
                                    )}
                                </p>
                            )}

                            {msg.isEdited && (
                                <span className="text-xs opacity-70 inline-block mt-0.5">
                                    edited
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
                                                            theme={Theme.AUTO}
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

                    {/* Footer: reactions on the left, seen-count + time on the right */}
                    {!msg.isDeleted && (
                        <div className="flex items-end justify-between gap-4 mt-1.5">
                            <div className="flex flex-wrap gap-1.5">
                                {Array.from(reactionsMap.entries()).map(
                                    ([emoji, { count, me }]) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleToggleReaction(emoji)}
                                            className={clsx(
                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[14px] font-medium transition-colors",
                                                isMe
                                                    ? me ? "bg-white/30" : "bg-white/15 hover:bg-white/25"
                                                    : me
                                                      ? "bg-surface text-accent ring-1 ring-accent/50"
                                                      : "bg-surface text-fg hover:ring-1 hover:ring-border-strong",
                                            )}
                                        >
                                            <span>{emoji}</span>
                                            <span>{count}</span>
                                        </button>
                                    ),
                                )}
                            </div>

                            <div
                                className={clsx(
                                    "flex items-center gap-1.5 text-[13px] whitespace-nowrap ml-auto",
                                    isMe ? "text-accent-fg/85" : "text-muted",
                                )}
                            >
                                {/* Read count — only members other than the sender get a
                                    message_status row, so this is "how many have seen it". */}
                                {isGroup && readCount > 0 && (
                                    <span
                                        className="flex items-center gap-1 mr-1.5"
                                        title={`Seen by ${readCount}`}
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        {readCount}
                                    </span>
                                )}

                                <span>{format(new Date(msg.createdAt), "HH:mm")}</span>

                                {isMe && !isGroup &&
                                    (readCount > 0 ? (
                                        <CheckCheck className="w-4 h-4" aria-label="Read" />
                                    ) : (
                                        <Check className="w-4 h-4 opacity-70" aria-label="Sent" />
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function MessageList({ chatId, water }: MessageListProps) {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isInitialLoadRef = useRef(true);
    const prevScrollHeightRef = useRef<number>(0);

    const { typingUsers } = useTyping(chatId);
    const { startCall } = useCallStore();

    // Already warm in the cache — ChatMain fetches this on the same key.
    const { data: chatData } = useQuery({
        queryKey: ["chats", chatId],
        queryFn: () => chatsApi.getChatDetails(chatId),
    });
    const isGroup = chatData?.chat?.type === "group";

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

    // Someone else read our messages — refresh so the ticks and seen-count update.
    useSocketEvent(
        "message:status",
        (payload: { chatId?: string; messageIds?: string[] }) => {
            if (!payload.chatId || payload.chatId === chatId) {
                queryClient.invalidateQueries({
                    queryKey: ["messages", chatId],
                });
            }
        },
    );

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

    // Messages that arrive while the chat is open slide up from the composer,
    // rippling the water along the way. Whatever was there on open, and
    // older pages loaded by scrolling up, just appear.
    const seenRef = useRef<{ chatId: string; ids: Set<string>; latest: number } | null>(null);
    useLayoutEffect(() => {
        if (isMessagesLoading || !messagesData) return;
        const msgs = messagesData.pages.flatMap((page) => page.messages || []);
        const stamp = (m: Message) => new Date(m.createdAt).getTime();
        const latest = msgs.reduce((max, m) => Math.max(max, stamp(m)), 0);
        const seen = seenRef.current;
        if (!seen || seen.chatId !== chatId) {
            seenRef.current = { chatId, ids: new Set(msgs.map((m) => m.id)), latest };
            return;
        }
        const fresh = msgs.filter((m) => !seen.ids.has(m.id) && stamp(m) >= seen.latest);
        msgs.forEach((m) => seen.ids.add(m.id));
        seen.latest = Math.max(seen.latest, latest);
        if (!fresh.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        for (const m of fresh) {
            const row = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${m.id}"]`);
            if (!row) continue;
            // Hidden until the next frame, by when the list has scrolled to the
            // bubble's final spot, so the slide can be measured from there.
            row.style.visibility = "hidden";
            requestAnimationFrame(() => {
                row.style.visibility = "";
                const list = scrollRef.current;
                if (!row.isConnected || !list) return;
                const bubble = row.querySelector<HTMLElement>("[data-bubble]") ?? row;
                // Slide up from the composer, entering under the list's bottom edge.
                const from = Math.max(list.getBoundingClientRect().bottom - bubble.getBoundingClientRect().top + 16, 48);
                row.animate(
                    [{ transform: `translateY(${from}px)` }, { transform: "translateY(0)" }],
                    { duration: SLIDE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
                );
                row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });

                // It drags a wake across the water as it travels, strongest at the
                // start, then a last ring where it comes to rest.
                const start = performance.now();
                let lastDrop = -Infinity;
                const wake = (now: number) => {
                    if (!row.isConnected) return;
                    const t = (now - start) / SLIDE_MS;
                    if (t >= 1) {
                        water?.current?.surface(bubble.getBoundingClientRect(), 0.7);
                        return;
                    }
                    if (now - lastDrop > 55) {
                        lastDrop = now;
                        water?.current?.surface(bubble.getBoundingClientRect(), 0.25 + 0.6 * (1 - t));
                    }
                    requestAnimationFrame(wake);
                };
                requestAnimationFrame(wake);
            });
        }
    }, [messagesData, chatId, isMessagesLoading, water]);

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
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-3 flex flex-col min-w-0 max-w-full relative z-0"
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
                                    <div className="sticky top-2 z-10 flex justify-center my-4 pointer-events-none">
                                        <span className="rounded-full bg-surface px-4 py-1.5 text-[13px] font-medium text-muted shadow-[var(--shadow-sm)] border border-border">
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
                                              !prevMsg ||
                                              prevMsg.senderId !== msg.senderId;

                                          return (
                                              <MessageBubble
                                                  msg={msg}
                                                  isMe={isMe}
                                                  showAvatar={showAvatar}
                                                  chatId={chatId}
                                                  prevMsgMap={prevMsgMap}
                                                  onOpenMedia={handleOpenMedia}
                                                  isGroup={isGroup}
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
                            <div className="bg-surface-2 text-muted rounded-[18px] px-5 py-3.5 flex items-center gap-2">
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
