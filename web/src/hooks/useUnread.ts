"use client";

import { useQuery } from "@tanstack/react-query";
import { chatsApi, Chat } from "@/lib/api/chats";

/**
 * Aggregate unread state for the nav rail, derived from the chat list that
 * ChatsSidebar already loads — no second request.
 *
 * Archived chats are deliberately excluded: the server leaves them out of the
 * default list, so they never reach this total.
 */
export function useUnread() {
  const { data } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatsApi.getChats(),
  });

  const chats: Chat[] = data?.chats || [];

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalMentions = chats.reduce((sum, c) => sum + (c.mentionCount || 0), 0);
  const unreadChats = chats.filter((c) => (c.unreadCount || 0) > 0).length;

  return { totalUnread, totalMentions, unreadChats };
}
