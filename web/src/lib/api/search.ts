import { apiClient } from './client';
import { User } from './users';

export interface SearchResult {
  id: string;
  chatId: string;
  chatName: string | null;
  chatType: 'dm' | 'group';
  content: string | null;
  /** Highlighted fragment using « » sentinels — split in JS, never as HTML. */
  snippet: string | null;
  type: string;
  createdAt: string;
  sender: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export const searchApi = {
  messages: (q: string, opts?: { chatId?: string; before?: string; limit?: number }) => {
    const params = new URLSearchParams({ q });
    if (opts?.before) params.set('before', opts.before);
    if (opts?.limit) params.set('limit', String(opts.limit));

    // Scoped search goes through the chat route so requireChatParticipant runs.
    const path = opts?.chatId
      ? `/chats/${opts.chatId}/messages/search?${params}`
      : `/search/messages?${params}`;

    return apiClient<{ results: SearchResult[] }>(path);
  },
};
