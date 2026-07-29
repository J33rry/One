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
        "rounded-2xl border transition-all duration-200 shadow-[var(--shadow-md)]",
        glass
          ? "glass-panel"
          : "bg-surface border-border",
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
    <div className={clsx("p-5 border-b border-border flex items-center justify-between", className)} {...props}>
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
    <div className={clsx("p-4 border-t border-border bg-surface-2/40 flex items-center justify-end gap-3", className)} {...props}>
      {children}
    </div>
  );
}
