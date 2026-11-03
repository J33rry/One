"use client";

import { useQuery } from "@tanstack/react-query";
import { foldersApi, ChatFolder } from "@/lib/api/folders";
import { Inbox, Plus, FolderOpen } from "lucide-react";
import clsx from "clsx";

interface ChatFoldersRailProps {
  activeFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onManage: () => void;
  /** Unread across every non-archived chat, for the "All" pill. */
  totalUnread: number;
}

export function ChatFoldersRail({
  activeFolderId,
  onSelect,
  onManage,
  totalUnread,
}: ChatFoldersRailProps) {
  const { data } = useQuery({
    queryKey: ["folders"],
    queryFn: () => foldersApi.getFolders(),
  });

  const folders: ChatFolder[] = data?.folders || [];

  // Nothing to switch between until the user makes a folder — keep the
  // sidebar uncluttered and expose folder creation from the manage button.
  if (folders.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="flex-1 text-[10px] font-mono uppercase tracking-widest text-faint">
          Folders
        </span>
        <button
          onClick={onManage}
          className="flex items-center gap-1 text-[10px] text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-surface-3/30"
        >
          <Plus className="w-3 h-3" />
          New folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <FolderPill
        label="All chats"
        icon={<Inbox className="w-3 h-3" />}
        count={totalUnread}
        active={activeFolderId === null}
        onClick={() => onSelect(null)}
      />

      {folders.map((f) => (
        <FolderPill
          key={f.id}
          label={f.name}
          icon={<FolderOpen className="w-3 h-3" />}
          count={f.unreadCount}
          active={activeFolderId === f.id}
          onClick={() => onSelect(f.id)}
        />
      ))}

      <button
        onClick={onManage}
        title="Manage folders"
        className="shrink-0 p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface-3/30 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FolderPill({
  label,
  icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-300 border",
        active
          ? "bg-accent/15 text-accent border-accent/30"
          : "bg-surface-2/40 text-muted border-border hover:text-fg hover:bg-surface-3/40",
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
      {count > 0 && (
        <span
          className={clsx(
            "min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold font-mono flex items-center justify-center",
            active ? "bg-accent text-black" : "bg-surface-3 text-fg",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
