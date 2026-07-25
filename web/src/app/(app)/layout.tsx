"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Users, Settings, LogOut, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { useCallEvents } from "@/hooks/useCallEvents";
import { IncomingCallModal } from "@/components/calls/IncomingCallModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoggingOut } = useAuth();
  const pathname = usePathname();
  const [showProfileCard, setShowProfileCard] = useState(false);
  
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
    <div className="flex h-full bg-zinc-950 overflow-hidden text-zinc-50 relative">
      {/* Sidebar Navigation */}
      <nav className="w-16 flex flex-col items-center py-4 bg-zinc-900 border-r border-zinc-800 z-20">
        <div className="flex-1 space-y-4 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center justify-center h-12 w-12 mx-auto rounded-xl transition-colors",
                  isActive ? "bg-emerald-500/20 text-emerald-500" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
                title={item.name}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            );
          })}
        </div>

        <div className="mt-auto space-y-4 w-full pt-4 relative">
          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="flex items-center justify-center h-12 w-12 mx-auto rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Log out"
          >
            {isLoggingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
          </button>
          
          <button
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="h-10 w-10 mx-auto rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center hover:border-emerald-500 transition-colors focus:outline-none"
            title={user?.displayName || "Profile"}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-medium">{user?.displayName?.charAt(0).toUpperCase() || "?"}</span>
            )}
          </button>

          {/* User Profile Popover */}
          {showProfileCard && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowProfileCard(false)} 
              />
              <div className="absolute bottom-2 left-16 z-40 ml-3 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-emerald-500">{user?.displayName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{user?.displayName}</h4>
                    <p className="text-xs text-zinc-400 truncate">@{user?.username}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>

                {user?.bio && (
                  <p className="text-xs text-zinc-300 italic line-clamp-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                    "{user.bio}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Passkey Active
                  </span>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileCard(false)}
                    className="text-xs text-zinc-300 hover:text-white underline font-medium"
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>

      {/* Incoming call overlay — rendered above everything */}
      <IncomingCallModal />
    </div>
  );
}
