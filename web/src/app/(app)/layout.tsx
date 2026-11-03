"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageCircle,
  Users,
  Phone,
  Contact,
  User as UserIcon,
  SlidersHorizontal,
  LogOut,
  Loader2,
  Folder,
  FolderPlus,
  Edit3,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { useCallEvents } from "@/hooks/useCallEvents";
import { useUnread } from "@/hooks/useUnread";
import { useChatFolder } from "@/hooks/useChatFolder";
import { foldersApi } from "@/lib/api/folders";
import { IncomingCallModal } from "@/components/calls/IncomingCallModal";
import { FolderManagerModal } from "@/components/chats/FolderManagerModal";
import { Avatar } from "@/components/ui/Avatar";
import { PebbleMark } from "@/components/ui/PebbleMark";
import { usePresence } from "@/hooks/usePresence";

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={clsx(
        "absolute min-w-[22px] h-[22px] px-1.5 rounded-full bg-danger text-danger-fg text-[11px] font-semibold flex items-center justify-center ring-2 ring-rail",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RailItem({
  label,
  icon: Icon,
  active,
  count = 0,
  href,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  count?: number;
  href?: string;
  onClick?: () => void;
}) {
  const className = clsx(
    "relative flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[13px] font-medium transition-colors",
    active ? "bg-white/12 text-rail-fg" : "text-rail-fg/70 hover:bg-white/6 hover:text-rail-fg"
  );
  const content = (
    <>
      <span className="relative">
        <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
        <CountBadge count={count} className="-top-2.5 left-3.5" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [isFoldersOpen, setIsFoldersOpen] = useState(false);
  const { isOnline } = usePresence();
  const { folderId, setFolderId } = useChatFolder();

  // Initialize websocket connection for authenticated user
  useSocket();

  // Wire WebSocket call events → Zustand call store
  useCallEvents();

  // Derived from the chat list the sidebar already loads — no extra request.
  const { totalUnread } = useUnread();

  const { data: foldersData } = useQuery({
    queryKey: ["folders"],
    queryFn: () => foldersApi.getFolders(),
  });
  const folders = foldersData?.folders || [];

  const onChats = pathname === "/" || pathname.startsWith("/chats");

  const openFolder = (id: string | null) => {
    setFolderId(id);
    if (!onChats) router.push("/");
  };

  const mobileNav = [
    { name: "Chats", href: "/", icon: MessageCircle, active: onChats },
    { name: "Calls", href: "/calls", icon: Phone, active: pathname.startsWith("/calls") },
    { name: "Contacts", href: "/contacts", icon: Contact, active: pathname.startsWith("/contacts") },
    { name: "Settings", href: "/settings", icon: SlidersHorizontal, active: pathname.startsWith("/settings") },
  ];

  return (
    <div className="flex h-full h-screen h-[100dvh] w-full bg-surface md:bg-rail overflow-hidden text-fg relative">
      {/* Desktop navigation rail */}
      <nav className="hidden md:flex w-[108px] shrink-0 flex-col items-center py-6 select-none h-full relative z-30">
        <Link href="/" onClick={() => setFolderId(null)} className="flex flex-col items-center gap-1 mb-6" title="Pebble">
          <PebbleMark className="h-9 w-12" />
          <span className="text-[19px] font-semibold tracking-tight text-rail-fg">Pebble</span>
        </Link>

        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1.5 [scrollbar-width:none]">
          <RailItem
            label={folders.length ? "All chats" : "Chats"}
            icon={MessageCircle}
            active={onChats && folderId === null}
            count={totalUnread}
            onClick={() => openFolder(null)}
          />
          {folders.map((f) => (
            <RailItem
              key={f.id}
              label={f.name}
              icon={Folder}
              active={onChats && folderId === f.id}
              count={f.unreadCount}
              onClick={() => openFolder(f.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsFoldersOpen(true)}
            className="flex h-8 w-[84px] shrink-0 items-center justify-center rounded-xl text-rail-fg/45 hover:bg-white/6 hover:text-rail-fg transition-colors"
            title="Manage folders"
          >
            <FolderPlus className="h-4 w-4" />
          </button>

          <div className="my-2 h-px w-10 shrink-0 bg-rail-fg/25" />

          <RailItem label="Calls" icon={Phone} href="/calls" active={pathname.startsWith("/calls")} />
          <RailItem label="Contacts" icon={Users} href="/contacts" active={pathname.startsWith("/contacts")} />
          <RailItem label="Profile" icon={UserIcon} active={showProfileCard} onClick={() => setShowProfileCard((v) => !v)} />
          <RailItem label="Settings" icon={SlidersHorizontal} href="/settings" active={pathname.startsWith("/settings")} />
        </div>

        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="mt-4 flex w-[84px] flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] font-medium text-rail-fg/70 hover:bg-white/6 hover:text-rail-fg transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogOut className="h-6 w-6" strokeWidth={1.8} />}
          Log out
        </button>

        {/* Profile popover */}
        {showProfileCard && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileCard(false)} />
            <div className="absolute bottom-24 left-[116px] z-50 w-80 rounded-3xl bg-surface p-5 space-y-4 shadow-[var(--shadow-lg)] border border-border animate-in-slide">
              <div className="flex items-center gap-4">
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.displayName || user?.username}
                  size="xl"
                  showPresence
                  isOnline={isOnline(user?.id)}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-semibold text-fg truncate tracking-tight">{user?.displayName}</h4>
                  <p className="text-sm text-muted truncate">@{user?.username}</p>
                  <p className="text-xs text-faint truncate mt-0.5">{user?.email}</p>
                </div>
              </div>

              {user?.bio && (
                <p className="text-sm text-muted line-clamp-3 bg-surface-2 p-3 rounded-2xl">{user.bio}</p>
              )}

              <Link
                href="/settings"
                onClick={() => setShowProfileCard(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-accent hover:bg-surface-3 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit profile
              </Link>
            </div>
          </>
        )}
      </nav>

      <FolderManagerModal isOpen={isFoldersOpen} onClose={() => setIsFoldersOpen(false)} />

      {/* Main panel */}
      <main className="flex-1 flex h-full min-w-0 overflow-hidden relative md:py-3 md:pr-3">
        <div className="flex-1 flex bg-surface md:rounded-[28px] overflow-hidden relative pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-center pointer-events-none">
        <div className="flex items-center justify-around w-full max-w-sm px-2 py-1.5 rounded-3xl bg-rail shadow-[var(--shadow-lg)] pointer-events-auto">
          {mobileNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center w-16 py-1.5 rounded-2xl transition-colors",
                item.active ? "text-rail-fg bg-white/12" : "text-rail-fg/60 hover:text-rail-fg"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.href === "/" && <CountBadge count={totalUnread} className="-top-1 right-1.5 !h-[18px] !min-w-[18px] !text-[10px]" />}
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Incoming call overlay — rendered above everything */}
      <IncomingCallModal />
    </div>
  );
}
