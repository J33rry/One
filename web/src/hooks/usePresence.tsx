"use client";

import React, { createContext, useContext, useState } from "react";
import { useSocketEvent } from "./useSocket";

interface PresenceContextType {
  onlineUsers: Set<string>;
  lastSeenMap: Map<string, string>;
  isOnline: (userId: string | undefined | null) => boolean;
  getLastSeen: (userId: string | undefined | null) => string | undefined;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: new Set(),
  lastSeenMap: new Map(),
  isOnline: () => false,
  getLastSeen: () => undefined,
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());

  useSocketEvent("presence:sync", (payload: { onlineUserIds: string[] }) => {
    if (Array.isArray(payload?.onlineUserIds)) {
      setOnlineUsers(new Set(payload.onlineUserIds));
    }
  });

  useSocketEvent("presence:online", (payload: { userId: string }) => {
    if (payload?.userId) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(payload.userId);
        return next;
      });
    }
  });

  useSocketEvent("presence:offline", (payload: { userId: string; lastSeenAt?: string }) => {
    if (payload?.userId) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
      if (payload.lastSeenAt) {
        setLastSeenMap((prev) => new Map(prev).set(payload.userId, payload.lastSeenAt!));
      }
    }
  });

  const isOnline = (userId: string | undefined | null) => {
    if (!userId) return false;
    return onlineUsers.has(userId);
  };

  const getLastSeen = (userId: string | undefined | null) => {
    if (!userId) return undefined;
    return lastSeenMap.get(userId);
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, lastSeenMap, isOnline, getLastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
