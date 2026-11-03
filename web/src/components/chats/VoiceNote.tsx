"use client";

import { useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import clsx from "clsx";
import { formatDuration } from "@/lib/utils/time";

const BARS = 36;

// The audio isn't decoded for a real waveform; bar heights are derived from
// the message id so each note has a stable, distinct shape.
function barHeights(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: BARS }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const wave = Math.sin((i / BARS) * Math.PI); // taller in the middle
    return 0.25 + 0.75 * (((h >>> 0) % 1000) / 1000) * (0.45 + 0.55 * wave);
  });
}

export function VoiceNote({ src, seed, isMe }: { src: string; seed: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const heights = useMemo(() => barHeights(seed), [seed]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  return (
    <div className="flex items-center gap-3 min-w-[240px] py-1">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105",
          isMe ? "bg-white text-accent" : "bg-accent text-accent-fg"
        )}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
      </button>
      <div className="flex h-9 flex-1 cursor-pointer items-center gap-[3px]" onClick={seek}>
        {heights.map((h, i) => (
          <span
            key={i}
            className={clsx(
              "w-[3px] rounded-full transition-colors",
              i / BARS < progress
                ? isMe ? "bg-white" : "bg-accent"
                : isMe ? "bg-white/45" : "bg-accent/40"
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        ))}
      </div>
      <span className={clsx("w-10 shrink-0 text-right text-[14px] tabular-nums", isMe ? "text-accent-fg/90" : "text-muted")}>
        {formatDuration(playing || current ? current : duration)}
      </span>
    </div>
  );
}
