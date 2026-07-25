import { apiClient } from './client';
import { User } from './users';

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt: string;
}

export interface MessageStatus {
  id: string;
  messageId: string;
  userId: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  replyToMessageId: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  content: string | null;
  mediaId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  
  sender?: User;
  media?: {
    id: string;
    url: string;
    mimeType: string;
    originalName?: string;
    filename?: string;
  };
  reactions?: Reaction[];
  status?: MessageStatus[];
}

export interface SendMessagePayload {
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  content?: string;
  mediaId?: string;
  replyToMessageId?: string;
}

export const messagesApi = {
  getMessages: (chatId: string, before?: string, limit: number = 50) => {
    const params = new URLSearchParams();
    if (before) params.append('before', before);
    params.append('limit', limit.toString());
    
    return apiClient<{ messages: Message[] }>(`/chats/${chatId}/messages?${params.toString()}`);
  },
  
  sendMessage: (chatId: string, data: SendMessagePayload) => apiClient<{ message: Message }>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  editMessage: (chatId: string, messageId: string, content: string) => apiClient<{ message: Message }>(`/chats/${chatId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  }),

  deleteMessage: (chatId: string, messageId: string) => apiClient<void>(`/chats/${chatId}/messages/${messageId}`, {
    method: 'DELETE',
  }),

  addReaction: (chatId: string, messageId: string, reaction: string) => apiClient<Reaction>(`/chats/${chatId}/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ reaction }),
  }),

  removeReaction: (chatId: string, messageId: string, reaction: string) => apiClient<void>(`/chats/${chatId}/messages/${messageId}/reactions`, {
    method: 'DELETE',
    body: JSON.stringify({ reaction }),
  }),

  markAsRead: (chatId: string, messageIds: string[]) => apiClient<void>(`/chats/${chatId}/messages/read`, {
    method: 'POST',
    body: JSON.stringify({ messageIds }),
  }),
};
