"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Users, Settings, LogOut, Loader2, Phone, ShieldCheck, Edit3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { useCallEvents } from "@/hooks/useCallEvents";
import { IncomingCallModal } from "@/components/calls/IncomingCallModal";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const [showProfileCard, setShowProfileCard] = useState(false);
  const { isOnline } = usePresence();

  // Initialize websocket connection for authenticated user
  useSocket();

  // Wire WebSocket call events → Zustand call store
  useCallEvents();

  const navItems = [
    { name: "Chats", href: "/", icon: MessageSquare },
    { name: "Calls", href: "/calls", icon: Phone },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full h-screen h-[100dvh] w-full bg-zinc-950 overflow-hidden text-zinc-100 relative">
      {/* Desktop Navigation Rail */}
      <nav className="hidden md:flex w-16 flex-col items-center py-4 bg-zinc-900/90 border-r border-zinc-800/80 z-30 shrink-0 select-none h-full">
        {/* App Logo Mark */}
        <Link
          href="/"
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-6 border border-emerald-400/30 hover:scale-105 transition-transform"
          title="ONE Messaging"
        >
          <ShieldCheck className="w-5 h-5" />
        </Link>

        {/* Navigation Items */}
        <div className="flex-1 space-y-3 w-full px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/chats")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "relative group flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                )}
                title={item.name}
              >
                <item.icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom User Actions */}
        <div className="mt-auto space-y-3 w-full px-2 pt-4 border-t border-zinc-800/60 relative">
          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="flex items-center justify-center h-11 w-11 mx-auto rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Log out"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="group flex items-center justify-center focus:outline-none"
            title={user?.displayName || "Profile"}
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName || user?.username}
              size="md"
              showPresence
              isOnline={isOnline(user?.id)}
              className="group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all"
            />
          </button>

          {/* User Profile Popover */}
          {showProfileCard && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileCard(false)}
              />
              <div className="absolute bottom-2 left-16 z-50 ml-3 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="flex items-center gap-3.5 pb-3 border-b border-zinc-800/80">
                  <Avatar
                    src={user?.avatarUrl}
                    name={user?.displayName || user?.username}
                    size="lg"
                    showPresence
                    isOnline={isOnline(user?.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {user?.displayName}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      @{user?.username}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {user?.bio && (
                  <p className="text-xs text-zinc-300 italic line-clamp-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
                    "{user.bio}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Encrypted Session
                  </span>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileCard(false)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white font-medium hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    Edit Profile
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex h-full min-w-0 overflow-hidden relative">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 z-30 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/chats")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-16 py-1 text-xs font-medium transition-colors",
                isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Incoming call overlay — rendered above everything */}
      <IncomingCallModal />
    </div>
  );
}
