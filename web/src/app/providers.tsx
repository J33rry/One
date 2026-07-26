"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { PresenceProvider } from '@/hooks/usePresence';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PresenceProvider>
            {children}
          </PresenceProvider>
        </ToastProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
