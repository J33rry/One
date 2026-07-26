"use client";

import React from "react";
import clsx from "clsx";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "emerald" | "zinc" | "blue" | "amber" | "red";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "emerald",
  size = "sm",
  className,
}: BadgeProps) {
  const variantStyles = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-md border tracking-wide uppercase font-mono",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
