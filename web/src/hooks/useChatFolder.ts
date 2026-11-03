"use client";

import { create } from "zustand";

// The folder filter is picked in the nav rail but applied by the chat list,
// so it lives outside both. null means "All chats".
export const useChatFolder = create<{
  folderId: string | null;
  setFolderId: (id: string | null) => void;
}>((set) => ({
  folderId: null,
  setFolderId: (folderId) => set({ folderId }),
}));
