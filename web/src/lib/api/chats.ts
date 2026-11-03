import { apiClient } from './client';
import { User } from './users';
import { Message } from './messages';

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
  latestMessage?: Message;
  // Per-user chat state, returned by the chat list
  unreadCount?: number;
  mentionCount?: number;
  folderIds?: string[];
  lastReadAt?: string | null;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  isMuted?: boolean;
}

export type MediaKind = 'image' | 'video' | 'audio' | 'file' | 'link';

export interface ChatMediaItem {
  id: string;
  messageId: string;
  type?: Exclude<MediaKind, 'link'>;
  url: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number | null;
  host?: string | null;
  createdAt: string;
  sender: { id: string; username: string; displayName: string };
}

export type ChatMediaCounts = Record<MediaKind, number>;

export interface ChatPreferences {
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
}

export interface CreateChatPayload {
  type: 'dm' | 'group';
  name?: string;
  description?: string;
  participantIds: string[];
}

export const chatsApi = {
  getChats: (opts?: { archived?: boolean }) =>
    apiClient<{ chats: Chat[] }>(`/chats${opts?.archived ? '?archived=true' : ''}`),

  getChatMediaCounts: (chatId: string) =>
    apiClient<{ counts: ChatMediaCounts }>(`/chats/${chatId}/media/counts`),

  getChatMedia: (chatId: string, kind: MediaKind, before?: string) =>
    apiClient<{ items: ChatMediaItem[] }>(
      `/chats/${chatId}/media?kind=${kind}${before ? `&before=${before}` : ''}`,
    ),

  updateChatPreferences: (chatId: string, prefs: ChatPreferences) =>
    apiClient<{ participant: ChatParticipant }>(`/chats/${chatId}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    }),
  
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
