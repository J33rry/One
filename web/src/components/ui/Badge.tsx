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
  // NOTE: variant keys are part of the public API — names unchanged, only retinted.
  const variantStyles = {
    emerald: "bg-accent/15 text-accent border-accent/30",
    zinc: "bg-surface-2 text-muted border-border-strong",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    amber: "bg-accent/15 text-accent border-accent/30",
    red: "bg-danger/15 text-danger border-danger/30",
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
