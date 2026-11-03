"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  chatsApi,
  ChatMediaItem,
  ChatMediaCounts,
  MediaKind,
} from "@/lib/api/chats";
import {
  Image as ImageIcon,
  Video,
  FileIcon,
  Music,
  Link2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

interface ChatMediaPanelProps {
  chatId: string;
  /** Only fetch while the info drawer is open — this is not on the chat-open path. */
  enabled: boolean;
  onOpenMedia: (url: string, type: "image" | "video") => void;
}

const KINDS: { kind: MediaKind; label: string; plural: string; icon: typeof ImageIcon }[] = [
  { kind: "image", label: "photo", plural: "photos", icon: ImageIcon },
  { kind: "video", label: "video", plural: "videos", icon: Video },
  { kind: "file", label: "file", plural: "files", icon: FileIcon },
  { kind: "audio", label: "audio file", plural: "audio files", icon: Music },
  { kind: "link", label: "shared link", plural: "shared links", icon: Link2 },
];

function formatSize(bytes?: number | null) {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`;
}

export function ChatMediaPanel({ chatId, enabled, onOpenMedia }: ChatMediaPanelProps) {
  const [expanded, setExpanded] = useState<MediaKind | null>("image");

  const { data: countsData, isLoading: countsLoading } = useQuery({
    queryKey: ["chat-media-counts", chatId],
    queryFn: () => chatsApi.getChatMediaCounts(chatId),
    enabled,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["chat-media", chatId, expanded],
    queryFn: () => chatsApi.getChatMedia(chatId, expanded as MediaKind),
    enabled: enabled && !!expanded,
  });

  const counts: ChatMediaCounts =
    countsData?.counts || { image: 0, video: 0, audio: 0, file: 0, link: 0 };
  const items: ChatMediaItem[] = itemsData?.items || [];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (countsLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <p className="text-sm text-muted py-2">
        No shared media yet.
      </p>
    );
  }

  return (
    <div className="space-y-0.5 -mx-2">
      {KINDS.map(({ kind, label, plural, icon: Icon }) => {
        const count = counts[kind];
        if (count === 0) return null;
        const isOpen = expanded === kind;

        return (
          <div key={kind}>
            <button
              onClick={() => setExpanded(isOpen ? null : kind)}
              className={clsx(
                "w-full flex items-center gap-3.5 px-2 py-2 rounded-xl transition-colors text-left text-fg hover:bg-surface-2",
              )}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
              <span className="flex-1 text-[16px] font-medium">
                {count} {count === 1 ? label : plural}
              </span>
              <ChevronDown
                className={clsx(
                  "w-5 h-5 shrink-0 transition-transform duration-300",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            {isOpen && (
              <div className="px-2 pb-2 pt-1">
                {itemsLoading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted" />
                  </div>
                ) : kind === "image" || kind === "video" ? (
                  // media has no width/height, so fixed-aspect tiles avoid layout shift
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => onOpenMedia(it.url, kind)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-surface-3 group"
                        title={it.fileName}
                      >
                        {kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.url}
                            alt={it.fileName || "Shared image"}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <>
                            <video
                              src={it.url}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="w-5 h-5 text-white" />
                            </span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ) : kind === "link" ? (
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it.id}>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors group"
                        >
                          <p className="text-sm font-medium text-accent truncate">
                            {it.host || it.url}
                          </p>
                          <p className="text-xs text-muted truncate">{it.url}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-1">
                    {items.map((it) => (
                      <li key={it.id}>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors"
                        >
                          <Icon className="w-4 h-4 shrink-0 text-muted" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-fg truncate">
                              {it.fileName || "Attachment"}
                            </span>
                            <span className="block text-xs text-muted">
                              {[
                                formatSize(it.fileSize),
                                format(new Date(it.createdAt), "d MMM"),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
