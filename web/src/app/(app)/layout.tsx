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
    <div className="flex h-full h-screen h-[100dvh] w-full bg-[var(--bg)] overflow-hidden text-fg relative">
      
      {/* Desktop Floating Navigation Rail */}
      <nav className="hidden md:flex w-20 flex-col items-center py-6 bg-transparent z-30 shrink-0 select-none h-full relative">
        <div className="flex flex-col items-center h-full w-14 bg-surface-2/40 backdrop-blur-3xl border border-border rounded-full py-4 shadow-xl">
          
          {/* App Logo Mark */}
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white shadow-[0_0_20px_rgba(211,161,94,0.3)] mb-6 border border-accent-hover/30 hover:scale-105 transition-all duration-300"
            title="ONE Messaging"
          >
            <ShieldCheck className="w-5 h-5" />
          </Link>

          {/* Navigation Items */}
          <div className="flex-1 space-y-4 w-full flex flex-col items-center">
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
                    "relative group flex items-center justify-center h-10 w-10 rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-accent/15 text-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                      : "text-muted hover:text-fg hover:bg-surface-3/50"
                  )}
                  title={item.name}
                >
                  <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute -left-2 w-1 h-4 bg-accent rounded-r-full shadow-[0_0_8px_var(--accent)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom User Actions */}
          <div className="mt-auto space-y-4 w-full flex flex-col items-center relative pt-4 border-t border-border-strong">
            <button
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="flex items-center justify-center h-10 w-10 rounded-2xl text-muted hover:text-danger hover:bg-danger/10 transition-all duration-300 disabled:opacity-50"
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
              className="group flex items-center justify-center focus:outline-none transition-transform hover:scale-105"
              title={user?.displayName || "Profile"}
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.displayName || user?.username}
                size="md"
                showPresence
                isOnline={isOnline(user?.id)}
                className="group-hover:ring-2 group-hover:ring-accent/50 transition-all shadow-md"
              />
            </button>
          </div>
        </div>

        {/* User Profile Popover */}
        {showProfileCard && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowProfileCard(false)}
            />
            <div className="absolute bottom-6 left-24 z-50 w-80 glass-panel rounded-3xl p-5 space-y-4 animate-in-slide">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <Avatar
                  src={user?.avatarUrl}
                  name={user?.displayName || user?.username}
                  size="lg"
                  showPresence
                  isOnline={isOnline(user?.id)}
                  className="shadow-lg"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-fg truncate tracking-tight">
                    {user?.displayName}
                  </h4>
                  <p className="text-xs text-muted truncate">
                    @{user?.username}
                  </p>
                  <p className="text-[11px] text-faint truncate mt-0.5 font-mono">
                    {user?.email}
                  </p>
                </div>
              </div>

              {user?.bio && (
                <p className="text-xs text-muted italic line-clamp-3 bg-black/20 p-3 rounded-2xl border border-border shadow-inner">
                  &quot;{user.bio}&quot;
                </p>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-accent font-mono flex items-center gap-2 bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]" />
                  Secured
                </span>
                <Link
                  href="/settings"
                  onClick={() => setShowProfileCard(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg font-medium transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-accent" />
                  Edit Profile
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Main Content Area - Inset Design */}
      <main className="flex-1 flex h-full min-w-0 overflow-hidden relative md:py-4 md:pr-4">
        <div className="flex-1 flex bg-surface md:rounded-[2rem] md:border border-border md:shadow-2xl overflow-hidden relative">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar - Floating Pill */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-30 flex items-center justify-center pointer-events-none">
        <div className="glass-pill flex items-center justify-around w-full max-w-sm px-2 py-1.5 pointer-events-auto">
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
                  "flex flex-col items-center justify-center w-16 py-1.5 rounded-2xl transition-all duration-300",
                  isActive ? "text-accent bg-accent/10" : "text-muted hover:text-fg hover:bg-surface-3/30"
                )}
              >
                <item.icon className={clsx("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} />
                <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Incoming call overlay — rendered above everything */}
      <IncomingCallModal />
    </div>
  );
}
