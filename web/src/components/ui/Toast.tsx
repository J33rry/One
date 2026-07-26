"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import clsx from "clsx";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex items-center gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-200 text-sm text-white font-medium",
              t.type === "success" && "bg-emerald-950/90 border-emerald-500/40 text-emerald-100",
              t.type === "error" && "bg-red-950/90 border-red-500/40 text-red-100",
              t.type === "info" && "bg-zinc-900/95 border-zinc-700 text-zinc-100"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {t.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="flex-1 min-w-0 break-words">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-zinc-400 hover:text-white rounded-md transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      toast: (msg: string) => console.log("[Toast]", msg),
    };
  }
  return context;
}
