"use client";

import React from "react";
import clsx from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx("animate-shimmer rounded-lg bg-surface-2", className)}
      {...props}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="p-4 space-y-4 flex-1">
      <div className="flex justify-center">
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
      <div className="flex gap-2 max-w-[60%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
      <div className="flex gap-2 max-w-[60%] self-end flex-row-reverse">
        <Skeleton className="h-10 w-48 rounded-2xl" />
      </div>
      <div className="flex gap-2 max-w-[50%]">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
