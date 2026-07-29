"use client";

import React, { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        className={clsx(
          "relative z-10 w-full bg-surface border border-border rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh] animate-in-slide",
          maxWidthClasses[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2/50">
            <h3 className="font-display text-base font-semibold text-fg tracking-tight">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-surface-3 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {!title && showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-muted hover:text-fg p-1.5 rounded-lg bg-surface/80 hover:bg-surface-3 border border-border transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
