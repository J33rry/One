import { apiClient } from './client';

export interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
}

export interface CreateFolderPayload {
  name: string;
  icon?: string | null;
  position?: number;
}

export const foldersApi = {
  getFolders: () => apiClient<{ folders: ChatFolder[] }>('/folders'),

  createFolder: (data: CreateFolderPayload) =>
    apiClient<{ folder: ChatFolder }>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFolder: (folderId: string, data: Partial<CreateFolderPayload>) =>
    apiClient<{ folder: ChatFolder }>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteFolder: (folderId: string) =>
    apiClient<void>(`/folders/${folderId}`, { method: 'DELETE' }),

  addChat: (folderId: string, chatId: string) =>
    apiClient<{ chatIds: string[] }>(`/folders/${folderId}/chats`, {
      method: 'POST',
      body: JSON.stringify({ chatId }),
    }),

  removeChat: (folderId: string, chatId: string) =>
    apiClient<{ chatIds: string[] }>(`/folders/${folderId}/chats/${chatId}`, {
      method: 'DELETE',
    }),
};
