import { create } from 'zustand';
import { Message } from '@/lib/api/messages';

interface MessageActionsStore {
  editingMessage: Message | null;
  replyingToMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  setReplyingToMessage: (msg: Message | null) => void;
  clearActions: () => void;
}

export const useMessageActions = create<MessageActionsStore>((set) => ({
  editingMessage: null,
  replyingToMessage: null,
  setEditingMessage: (msg) => set({ editingMessage: msg, replyingToMessage: null }),
  setReplyingToMessage: (msg) => set({ replyingToMessage: msg, editingMessage: null }),
  clearActions: () => set({ editingMessage: null, replyingToMessage: null }),
}));
