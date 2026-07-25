"use client";

import { useState, useEffect } from 'react';
import { useSocketEvent } from './useSocket';

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useSocketEvent('presence:online', (payload: { userId: string }) => {
    setOnlineUsers(prev => new Set(prev).add(payload.userId));
  });

  useSocketEvent('presence:offline', (payload: { userId: string }) => {
    setOnlineUsers(prev => {
      const next = new Set(prev);
      next.delete(payload.userId);
      return next;
    });
  });

  const isOnline = (userId: string | undefined | null) => {
    if (!userId) return false;
    return onlineUsers.has(userId);
  };

  return { isOnline, onlineUsers };
}
