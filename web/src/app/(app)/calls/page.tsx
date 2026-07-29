"use client";

import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { CallsSidebar } from "@/components/layout/CallsSidebar";
import { PhoneCall } from "lucide-react";

function EmptyCallPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg p-8 text-center select-none">
      <div className="max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-faint mb-5">
          One — Calls
        </p>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border text-accent">
          <PhoneCall className="w-6 h-6" />
        </div>
        <h2 className="font-display text-3xl font-semibold text-fg tracking-tight">
          Call logs &amp; video rooms
        </h2>
        <div className="mx-auto my-5 h-px w-16 bg-border" />
        <p className="text-sm text-muted leading-relaxed">
          Select a conversation, or start an audio or video call directly from any chat.
        </p>
      </div>
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
