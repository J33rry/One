"use client";

import { RefObject, useEffect, useRef } from "react";
import { createWaterSurface } from "@/components/login/waterSurface";
import { followTheme, toRgb } from "./waterTheme";

// Still water behind an open conversation. Nothing disturbs it but arriving
// messages, which call `surface` as they slide across it.

export interface ChatWaterHandle {
  /** Ripple the water under a screen rect (client coordinates); `strength` scales the push. */
  surface(rect: DOMRect, strength?: number): void;
}

export function ChatWater({ handleRef }: { handleRef: RefObject<ChatWaterHandle | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const water = createWaterSurface(canvas, { light: true, refract: 0, simSize: 320 });
    if (!water) return; // No WebGL2: the plain background shows through.
    canvas.dataset.ready = "on";

    const readBase = () => water.setBase(toRgb(getComputedStyle(canvas).getPropertyValue("--bg")));
    readBase();
    const stopTheme = followTheme(readBase);

    let origin = canvas.getBoundingClientRect();
    const resize = () => {
      origin = canvas.getBoundingClientRect();
      water.resize(origin.width, origin.height, Math.min(window.devicePixelRatio || 1, 1.5));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    handleRef.current = {
      surface(rect, strength = 1) {
        origin = canvas.getBoundingClientRect();
        const y = rect.top + rect.height / 2 - origin.top;
        if (y < 0 || y > origin.height) return;
        // Wide bubbles break the surface along their length, not at one point.
        const points = Math.min(Math.max(Math.round(rect.width / 140), 1), 4);
        for (let i = 0; i < points; i++) {
          const x = rect.left + (rect.width * (i + 0.5)) / points - origin.left;
          water.drop(x, y, 0.028, (-0.3 * strength) / Math.sqrt(points));
        }
      },
    };

    water.setAmbient(0.25);
    let last = performance.now();
    let time = 0;
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      water.update(dt);
      water.render(time);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      stopTheme();
      handleRef.current = null;
      delete canvas.dataset.ready;
      water.dispose();
    };
  }, [handleRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-0 transition-opacity duration-500 data-[ready=on]:opacity-100"
    />
  );
}
