"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { chatsApi } from "@/lib/api/chats";
import { useCallStore } from "@/hooks/useCall";

/**
 * Opens the DM with a user (the server returns the existing one if there is
 * one), optionally starting a call in it. The call UI lives in the chat view,
 * so we always navigate there first.
 */
export function useOpenDm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startCall = useCallStore((s) => s.startCall);

  const mutation = useMutation({
    mutationFn: ({ userId }: { userId: string; call?: "audio" | "video" }) =>
      chatsApi.createChat({ type: "dm", participantIds: [userId] }),
    onSuccess: ({ chat }, { call }) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push(`/chats/${chat.id}`);
      if (call) startCall(chat.id, call);
    },
  });

  return {
    openDm: (userId: string, call?: "audio" | "video") => mutation.mutate({ userId, call }),
    isPending: mutation.isPending,
  };
}
