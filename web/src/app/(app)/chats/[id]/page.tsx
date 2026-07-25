"use client";

import { use } from "react";
import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { ChatsSidebar } from "@/components/chats/ChatsSidebar";
import { ChatMain } from "@/components/chats/ChatMain";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use for Next.js 15
  const unwrappedParams = use(params);
  
  return (
    <TwoPaneLayout 
      sidebar={<ChatsSidebar />}
      main={<ChatMain chatId={unwrappedParams.id} />}
      showMainOnMobile={true} // on mobile, when inside a chat, show main and hide sidebar
    />
  );
}
