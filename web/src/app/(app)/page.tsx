"use client";

import { useState } from "react";
import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { ChatsSidebar } from "@/components/chats/ChatsSidebar";
import { NewChatModal } from "@/components/chats/NewChatModal";
import { WaterEmptyState } from "@/components/chats/WaterEmptyState";

function EmptyChatPane() {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  return (
    <>
      <WaterEmptyState onStart={() => setIsNewChatOpen(true)} />
      <NewChatModal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
    </>
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
