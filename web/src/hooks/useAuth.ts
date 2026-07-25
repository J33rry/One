"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

export const AUTH_QUERY_KEY = ['auth', 'me'];

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => usersApi.getMe(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = data?.user;

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      router.push('/login');
    },
    onError: () => {
      // Even if the server fails, clear local state
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      router.push('/login');
    }
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    isPasskeyEnrolled: user?.passkeyEnrolled ?? false,
    error: error as ApiError | null,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
