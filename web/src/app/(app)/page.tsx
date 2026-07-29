"use client";

import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { ChatsSidebar } from "@/components/chats/ChatsSidebar";
import { MessageSquare } from "lucide-react";

function EmptyChatPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg p-8 text-center select-none">
      <div className="max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint mb-5">
          One — Messages
        </p>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border text-accent">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="font-display text-3xl font-semibold text-fg tracking-tight">
          Select a conversation
        </h2>
        <div className="mx-auto my-5 h-px w-16 bg-border" />
        <p className="text-sm text-muted leading-relaxed">
          Choose an existing conversation from the sidebar, or start a new one to begin messaging.
        </p>
      </div>
    </div>
  );
}

export default function ChatsIndexPage() {
  return (
    <TwoPaneLayout 
      sidebar={<ChatsSidebar />}
      main={<EmptyChatPane />}
      showMainOnMobile={false} // on mobile, we want to see the sidebar when at index
    />
  );
}
