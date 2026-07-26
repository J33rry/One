"use client";

import React from "react";
import clsx from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className, glass = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border transition-all duration-200 shadow-lg",
        glass
          ? "glass-panel"
          : "bg-zinc-900/90 border-zinc-800/80 shadow-black/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-5 border-b border-zinc-800/80 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-4 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-end gap-3", className)} {...props}>
      {children}
    </div>
  );
}
