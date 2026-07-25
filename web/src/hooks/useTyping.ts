"use client";

import { useState, useCallback, useEffect } from 'react';
import { socketClient } from '@/lib/ws/socket';
import { useSocketEvent } from './useSocket';

export function useTyping(chatId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  let typingTimeout: NodeJS.Timeout;

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
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socketClient.send('typing:stop', { chatId });
    }, 3000);
  }, [chatId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout);
    };
  }, []);

  return {
    typingUsers: Array.from(typingUsers),
    sendTypingStart
  };
}
