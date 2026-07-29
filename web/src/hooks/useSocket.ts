"use client";

import { useEffect } from 'react';
import { socketClient } from '@/lib/ws/socket';
import { useAuth } from './useAuth';

export function useSocket() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
    }

    return () => {
      // We don't necessarily disconnect on unmount of useSocket unless we want to, 
      // but if useSocket is mounted in a top-level provider, it manages the connection.
    };
  }, [isAuthenticated]);
}

export function useSocketEvent<T = unknown>(
  event: string,
  callback: (payload: T) => void,
) {
  useEffect(() => {
    return socketClient.on(event, callback as (payload: unknown) => void);
  }, [event, callback]);
}
