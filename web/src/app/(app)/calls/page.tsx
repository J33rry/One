"use client";

import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { CallsSidebar } from "@/components/layout/CallsSidebar";
import { PhoneCall } from "lucide-react";

function EmptyCallPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 text-center select-none">
      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex items-center justify-center mb-4 text-emerald-400 shadow-xl">
        <PhoneCall className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Call Logs & Video Rooms</h3>
      <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
        Select a conversation or start an audio/video call directly from any chat.
      </p>
    </div>
  );
}

export default function CallsIndexPage() {
  return (
    <TwoPaneLayout
      sidebar={<CallsSidebar />}
      main={<EmptyCallPane />}
      showMainOnMobile={false}
    />
  );
}
