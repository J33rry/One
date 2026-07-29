"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { socketClient } from '@/lib/ws/socket';
import { useSocketEvent } from './useSocket';

export function useTyping(chatId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useSocketEvent('typing:start', (payload: { chatId: string, userId: string }) => {
    if (payload.chatId === chatId) {
      setTypingUsers(prev => new Set(prev).add(payload.userId));
    }
  });

  useSocketEvent('typing:stop', (payload: { chatId: string, userId: string }) => {
    if (payload.chatId === chatId) {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
    }
  });

  const sendTypingStart = useCallback(() => {
    socketClient.send('typing:start', { chatId });
    
    // Auto stop typing after 3s of inactivity
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketClient.send('typing:stop', { chatId });
    }, 3000);
  }, [chatId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return {
    typingUsers: Array.from(typingUsers),
    sendTypingStart
  };
}
