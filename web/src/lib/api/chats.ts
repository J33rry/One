import { apiClient } from './client';
import { User } from './users';

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  user?: User;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  myRole?: string;
  isBlocked?: boolean;
  participants?: ChatParticipant[];
  // Sometimes returned by list queries
  latestMessage?: any;
}

export interface CreateChatPayload {
  type: 'dm' | 'group';
  name?: string;
  description?: string;
  participantIds: string[];
}

export const chatsApi = {
  getChats: () => apiClient<{ chats: Chat[] }>('/chats'),
  
  createChat: (data: CreateChatPayload) => apiClient<{ chat: Chat }>('/chats', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getChatDetails: (chatId: string) => apiClient<{ chat: Chat }>(`/chats/${chatId}`),
  
  updateChat: (chatId: string, data: { name?: string; description?: string; avatarUrl?: string }) => apiClient<{ chat: Chat }>(`/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  deleteChat: (chatId: string) => apiClient<void>(`/chats/${chatId}`, {
    method: 'DELETE',
  }),
  
  addParticipants: (chatId: string, userIds: string[]) => apiClient<{ participants: ChatParticipant[] }>(`/chats/${chatId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  }),

  updateParticipantRole: (chatId: string, userId: string, role: 'admin' | 'member') => apiClient<{ participant: ChatParticipant }>(`/chats/${chatId}/participants/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }),

  removeParticipant: (chatId: string, userId: string) => apiClient<void>(`/chats/${chatId}/participants/${userId}`, {
    method: 'DELETE',
  }),
};
