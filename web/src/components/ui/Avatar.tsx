"use client";

import React from "react";
import clsx from "clsx";
import { User, Users } from "lucide-react";

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isGroup?: boolean;
  isOnline?: boolean;
  showPresence?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = "md",
  isGroup = false,
  isOnline = false,
  showPresence = false,
  className,
}: AvatarProps) {
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  const indicatorSizes = {
    xs: "w-2 h-2 ring-1",
    sm: "w-2.5 h-2.5 ring-2",
    md: "w-3 h-3 ring-2",
    lg: "w-3.5 h-3.5 ring-2",
    xl: "w-4 h-4 ring-2",
  };

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={clsx("relative inline-block shrink-0", className)}>
      <div
        className={clsx(
          "rounded-full bg-surface-2 border border-border overflow-hidden flex items-center justify-center font-semibold text-accent select-none shadow-sm",
          sizeClasses[size]
        )}
      >
        {src ? (
          <img src={src} alt={name || "Avatar"} className="w-full h-full object-cover" />
        ) : isGroup ? (
          <Users className={clsx("text-muted", iconSizes[size])} />
        ) : name ? (
          <span>{initials}</span>
        ) : (
          <User className={clsx("text-muted", iconSizes[size])} />
        )}
      </div>

      {showPresence && !isGroup && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 rounded-full ring-bg",
            indicatorSizes[size],
            isOnline ? "bg-success" : "bg-faint"
          )}
          title={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}
