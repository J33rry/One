"use client";

import React, { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2, type LucideIcon } from "lucide-react";

// Shared pieces for the pebble auth screens (login, register, password reset).

export function PebbleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="pebble-logo-body" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#4a4a4f" />
          <stop offset="0.45" stopColor="#1b1b1e" />
          <stop offset="1" stopColor="#050506" />
        </radialGradient>
        <radialGradient id="pebble-logo-shine" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M6.5 27.5C2.6 19.6 8.4 8.6 20.4 5.6 31.6 2.8 43.2 7.4 45.3 17.4c2.1 10.2-6.6 18.4-19.6 18.9-8.6.3-15.8-2.4-19.2-8.8z"
        fill="url(#pebble-logo-body)"
      />
      <ellipse cx="18" cy="13" rx="8" ry="3.2" transform="rotate(-14 18 13)" fill="url(#pebble-logo-shine)" />
    </svg>
  );
}

export function PebbleHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-[42px] font-bold leading-tight tracking-tight">{title}</h1>
      <p className="text-[17px] text-[#5d5a70]">{subtitle}</p>
    </div>
  );
}

export function PebbleError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#e2a3a0] bg-[#fdeceb] p-3.5 text-sm text-[#b23a32]">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface PebbleFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

/** Labelled input with a leading icon; password fields get a show/hide toggle. */
export const PebbleField = React.forwardRef<HTMLInputElement, PebbleFieldProps>(
  ({ label, icon: Icon, error, type, id, className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";
    const inputId = id ?? props.name;

    return (
      <div className={clsx("space-y-2", className)}>
        <label htmlFor={inputId} className="block text-[15px] font-semibold">
          {label}
        </label>
        <div className="relative">
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5d5a70]" />
          <input
            ref={ref}
            id={inputId}
            type={isPassword && show ? "text" : type}
            className={clsx(
              "w-full rounded-xl border border-[#d9d6e8] bg-white/70 py-3.5 pl-12 pr-4 text-[15px] text-[#14121f] placeholder-[#9a97ab] transition-[border-color,box-shadow] duration-150 focus:border-[#7b7cf6] focus:outline-none focus:ring-2 focus:ring-[#7b7cf6]/25",
              isPassword && "pr-12",
              error && "border-[#d9776a] focus:border-[#d9776a] focus:ring-[#d9776a]/20"
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#5d5a70] transition-colors hover:text-[#14121f]"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-[#b23a32]">{error}</p>}
      </div>
    );
  }
);

PebbleField.displayName = "PebbleField";

export function PebbleButton({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7b7cf6] py-4 text-lg font-medium text-white shadow-[0_10px_30px_-12px_rgba(123,124,246,0.8)] transition-colors hover:bg-[#6a6bef] disabled:opacity-70"
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}

export function PebbleDivider() {
  return (
    <div className="relative my-7">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#e1deed]" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-[#f6f4fd] px-3 text-[#9a97ab]">or</span>
      </div>
    </div>
  );
}

export const pebbleLinkClass = "font-semibold text-[#6a6bef] transition-colors hover:text-[#4f50d6]";

/** A Link styled like the primary (or outlined) pebble button. */
export function PebbleLinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "outline";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex w-full items-center justify-center rounded-2xl py-4 text-lg font-medium transition-colors",
        variant === "primary"
          ? "bg-[#7b7cf6] text-white shadow-[0_10px_30px_-12px_rgba(123,124,246,0.8)] hover:bg-[#6a6bef]"
          : "border border-[#d9d6e8] bg-white/70 text-[#14121f] hover:border-[#7b7cf6]"
      )}
    >
      {children}
    </Link>
  );
}

export function PebbleNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-[#d6d4f6] bg-[#eceafd] p-3.5 text-sm text-[#4f50d6]">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

/** Full-panel outcome message (sent, done, invalid link) with a follow-up action. */
export function PebbleStatus({
  tone,
  title,
  children,
  action,
}: {
  tone: "success" | "error";
  title: string;
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div>
      <div
        className={clsx(
          "flex h-14 w-14 items-center justify-center rounded-full border",
          tone === "success"
            ? "border-[#bfe3cc] bg-[#e7f6ec] text-[#2f8a52]"
            : "border-[#e2a3a0] bg-[#fdeceb] text-[#b23a32]"
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-[36px] font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-[#5d5a70]">{children}</p>
      <div className="mt-8">{action}</div>
    </div>
  );
}
