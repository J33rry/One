"use client";

import { TwoPaneLayout } from "@/components/layout/TwoPaneLayout";
import { CallsSidebar } from "@/components/layout/CallsSidebar";
import { Phone } from "lucide-react";

function EmptyCallPane() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-8 text-center">
      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
        <Phone className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-xl font-medium text-white mb-2">Call History</h3>
      <p className="text-zinc-400 max-w-sm">
        Your recent incoming and outgoing calls appear here.
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
