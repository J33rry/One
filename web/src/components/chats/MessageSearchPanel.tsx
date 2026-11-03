"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi, SearchResult } from "@/lib/api/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Avatar } from "@/components/ui/Avatar";
import { Search, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface MessageSearchPanelProps {
  /** Omit to search across every chat the user is in. */
  chatId?: string;
  onClose: () => void;
}

/**
 * The server wraps matches in « » rather than HTML, so highlighting is a
 * plain string split — no dangerouslySetInnerHTML.
 */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/«([^»]*)»/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-accent/25 text-accent rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function MessageSearchPanel({ chatId, onClose }: MessageSearchPanelProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const enabled = debounced.trim().length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["search", chatId ?? "global", debounced],
    queryFn: () => searchApi.messages(debounced.trim(), { chatId }),
    enabled,
  });

  const results: SearchResult[] = data?.results || [];

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-80 glass-panel border-l border-border flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="h-[72px] flex items-center justify-between px-6 border-b border-border shrink-0">
        <h3 className="text-base font-bold text-fg tracking-tight">
          {chatId ? "Search in chat" : "Search messages"}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-muted hover:text-fg px-3 py-1.5 rounded-lg bg-surface-3/40 hover:bg-surface-3 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="p-4 shrink-0">
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full bg-surface-2 border border-border text-fg placeholder-muted text-sm rounded-full pl-10 pr-9 py-2.5 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted pointer-events-none" />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-2.5 p-0.5 rounded-full text-muted hover:text-fg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {!enabled ? (
          <p className="text-xs text-faint italic text-center py-8">
            Type at least two characters.
          </p>
        ) : isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-xs text-faint italic text-center py-8">
            No messages found.
          </p>
        ) : (
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/chats/${r.chatId}`}
                  onClick={onClose}
                  className="flex gap-3 p-3 rounded-2xl hover:bg-surface-3/30 transition-colors"
                >
                  <Avatar
                    src={r.sender.avatarUrl}
                    name={r.sender.displayName}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-fg truncate">
                        {r.sender.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-faint shrink-0">
                        {format(new Date(r.createdAt), "d MMM")}
                      </span>
                    </div>
                    {!chatId && (
                      <p className="text-[10px] text-accent truncate mb-0.5">
                        {r.chatName || "Direct message"}
                      </p>
                    )}
                    <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                      <Snippet text={r.snippet || r.content || ""} />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
