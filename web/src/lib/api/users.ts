import { apiClient } from './client';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  email: string;
  createdAt: string;
}

export interface UserProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export const usersApi = {
  getMe: () => apiClient<{ user: User }>('/users/me'),
  
  updateMe: (data: UserProfileUpdate) => apiClient<{ user: User }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  search: (query: string) => apiClient<{ users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`),

  getUser: (userId: string) => apiClient<{ user: User }>(`/users/${userId}`),
};
