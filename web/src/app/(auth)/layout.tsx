import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-bg relative overflow-hidden">
      {/* Signature editorial "cover": a single warm wash + hairline frame */}
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(120%_80%_at_50%_-10%,var(--accent-muted),transparent_55%)]" />

      {/* Masthead */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-8">
        <div className="inline-flex items-center justify-center gap-2 text-accent mb-4">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted">
            One
          </span>
        </div>
        <h1 className="font-display text-5xl font-semibold text-fg tracking-tight leading-none">
          One
        </h1>
        <p className="mt-3 text-[11px] font-mono tracking-[0.28em] text-faint uppercase">
          End-to-End Encrypted Messaging
        </p>
      </div>

      {/* Card */}
      <div className="w-full sm:max-w-md z-10">
        <div className="bg-surface border border-border rounded-2xl py-8 px-6 sm:px-10 shadow-[var(--shadow-lg)]">
          {children}
        </div>
      </div>
    </div>
  );
}
