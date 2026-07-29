"use client";

import React, { useEffect } from "react";
import { X, Download } from "lucide-react";

export interface MediaLightboxProps {
  src: string | null;
  type?: "image" | "video";
  onClose: () => void;
}

export function MediaLightbox({ src, type = "image", onClose }: MediaLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (src) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
      {/* Top action bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <a
          href={src}
          target="_blank"
          download
          rel="noreferrer"
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15 shadow-lg"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15 shadow-lg"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Content */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "video" ? (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10"
          />
        ) : (
          <img
            src={src}
            alt="Media View"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        )}
      </div>
    </div>
  );
}
