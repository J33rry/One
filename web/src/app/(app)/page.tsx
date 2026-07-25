"use client";

import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { ChatsSidebar } from "@/components/chats/ChatsSidebar";
import { MessageSquare } from "lucide-react";

function EmptyChatPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 text-center">
      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
        <MessageSquare className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-xl font-medium text-white mb-2">Select a chat</h3>
      <p className="text-zinc-400 max-w-sm">
        Choose an existing conversation from the sidebar or start a new one to begin messaging.
      </p>
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
