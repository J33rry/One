import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          ONE
        </h1>
        <p className="mt-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
          End-to-End Encrypted Messaging
        </p>
      </div>

      {/* Card Wrapper */}
      <div className="w-full sm:max-w-md z-10">
        <div className="bg-zinc-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-zinc-800/80 shadow-black/60">
          {children}
        </div>
      </div>
    </div>
  );
}
