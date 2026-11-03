"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { createWaterSurface } from "./waterSurface";
import { drawStone, makeStone, stoneUnderside } from "./stone";

// Loading splash: the title fades in on still white water, then a black pebble
// skips right-to-left across it, rippling the letters at each touch, and
// comes to rest in front of the word.

const TITLE = "pebble";
// Where the stone touches the word, as fractions of its width (right to left).
const TOUCHES = [0.74, 0.32];
// Title fade-in, before the stone is thrown.
const FADE_IN = 0.6;
const INK = "rgb(22,22,24)";
// Seconds the finished logo holds before the splash may leave.
const HOLD = 0.45;
const SETTLE = 0.6;

interface Hop {
  fromX: number;
  toX: number;
  z0: number;
  z1: number;
  height: number;
  start: number;
  dur: number;
}

interface Layout {
  font: string;
  fontSize: number;
  waterline: number;
  baseline: number;
  /** Left edge of each letter, spaced out so every skip has room. */
  letterX: number[];
  rx: number;
  restX: number;
  restZ: number;
  hops: Hop[];
  restAt: number;
  end: number;
}

const smooth = (t: number) => {
  const p = Math.min(Math.max(t, 0), 1);
  return p * p * (3 - 2 * p);
};

export function PebbleSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const [played, setPlayed] = useState(false);
  // Leave only once the animation has played and the app behind is ready.
  const leaving = played && ready;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const waterCanvas = waterRef.current;
    if (!container || !canvas || !waterCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const water = createWaterSurface(waterCanvas, { light: true, refract: 0.014 });
    // Letters (and their reflections) are painted here and rippled by the water shader.
    const letters = document.createElement("canvas");
    const lctx = letters.getContext("2d")!;
    const reflection = document.createElement("canvas");
    const rctx = reflection.getContext("2d")!;
    const family = getComputedStyle(container).fontFamily || "sans-serif";
    let fontReady = false;
    const stone = makeStone("dark");
    stone.spin = 0;
    const restAngle = -0.22;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let layout: Layout | null = null;

    const buildLayout = (): Layout => {
      const fontSize = Math.round(Math.min(Math.max(W * 0.085, 44), H * 0.2, 150));
      const font = `${fontSize}px ${family}`;
      lctx.font = font;
      const tracking = fontSize * 0.12;
      const widths = [...TITLE].map((ch) => lctx.measureText(ch).width);
      const textW = widths.reduce((sum, w) => sum + w, 0) + tracking * (TITLE.length - 1);
      const descent = lctx.measureText("p").actualBoundingBoxDescent || fontSize * 0.2;

      const rx = fontSize * 0.3;
      const gap = fontSize * 0.32;
      const left = (W - (rx * 2 + gap + textW)) / 2;
      const restX = left + rx;
      const letterX: number[] = [];
      let cursor = left + rx * 2 + gap;
      for (const w of widths) {
        letterX.push(cursor);
        cursor += w + tracking;
      }
      const waterline = H * 0.54;
      const baseline = waterline - descent;
      // Rest the stone so its rim just meets the surface.
      const restZ = stoneUnderside(stone, rx) - rx * 0.12;

      // Entry from off-screen right, two skips across the word, then a hop to rest.
      const touchX = TOUCHES.map((f) => letterX[0] + textW * f);
      const stops = [W + rx * 3, ...touchX, restX];
      // On a touch the stone only skims: its belly dips just under the surface.
      const touchZ = restZ * 0.55;
      const z0 = [H * 0.38, touchZ, touchZ];
      const z1 = [touchZ, touchZ, restZ];
      const heights = [H * 0.06, fontSize * 1.0, fontSize * 0.7];
      const durs = [0.56, 0.5, 0.44];
      const hops: Hop[] = [];
      let t = FADE_IN + 0.1;
      for (let i = 0; i < durs.length; i++) {
        hops.push({ fromX: stops[i], toX: stops[i + 1], z0: z0[i], z1: z1[i], height: heights[i], start: t, dur: durs[i] });
        t += durs[i];
      }
      return {
        font,
        fontSize,
        waterline,
        baseline,
        letterX,
        rx,
        restX,
        restZ,
        hops,
        restAt: t,
        end: t + SETTLE + HOLD,
      };
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      for (const c of [canvas, letters, reflection]) {
        c.width = Math.max(1, Math.round(W * dpr));
        c.height = Math.max(1, Math.round(H * dpr));
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      water?.resize(W, H, Math.min(dpr, 1.5));
      if (W >= 10 && H >= 10) layout = buildLayout();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    // Hold the title until the wordmark font is in, so it never flashes a
    // fallback face and the stone lands on the real glyphs.
    const fontLoad = document.fonts ? document.fonts.load(`48px ${family}`) : Promise.resolve();
    fontLoad
      .catch(() => {})
      .then(() => {
        fontReady = true;
        if (W >= 10 && H >= 10) layout = buildLayout();
      });

    // Reduced motion gets the finished logo straight away.
    let time = reduceMotion ? 1e3 : 0;
    let stoneClock = 0;
    let fired = 0;
    let finished = false;
    let last = performance.now();
    let raf = 0;

    const paintLetters = (L: Layout) => {
      lctx.clearRect(0, 0, W, H);
      rctx.clearRect(0, 0, W, H);
      lctx.font = rctx.font = L.font;
      lctx.fillStyle = rctx.fillStyle = INK;
      lctx.textBaseline = rctx.textBaseline = "alphabetic";
      const p = smooth(time / FADE_IN);
      if (p > 0) {
        // Upright letters stand on the surface: clip anything below the waterline.
        lctx.save();
        lctx.beginPath();
        lctx.rect(0, 0, W, L.waterline);
        lctx.clip();
        lctx.globalAlpha = p;
        for (let j = 0; j < TITLE.length; j++) lctx.fillText(TITLE[j], L.letterX[j], L.baseline);
        lctx.restore();

        // Mirror about the waterline for the reflection.
        rctx.save();
        rctx.beginPath();
        rctx.rect(0, L.waterline, W, H - L.waterline);
        rctx.clip();
        rctx.translate(0, L.waterline * 2);
        rctx.scale(1, -1);
        rctx.globalAlpha = p;
        for (let j = 0; j < TITLE.length; j++) rctx.fillText(TITLE[j], L.letterX[j], L.baseline);
        rctx.restore();
      }
      // Fade the reflection out with depth, then lay it under the letters.
      rctx.save();
      rctx.globalCompositeOperation = "destination-in";
      const fade = rctx.createLinearGradient(0, L.waterline, 0, L.waterline + L.fontSize * 0.95);
      fade.addColorStop(0, "rgba(0,0,0,0.3)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      rctx.fillStyle = fade;
      rctx.fillRect(0, 0, W, H);
      rctx.restore();
      lctx.save();
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.drawImage(reflection, 0, 0);
      lctx.restore();
    };

    const stonePos = (L: Layout) => {
      if (time >= L.restAt) {
        // A little bob as it settles.
        const s = time - L.restAt;
        const bob = Math.exp(-s * 7) * Math.sin(s * 18) * L.rx * 0.06;
        return { x: L.restX, z: L.restZ + bob, visible: true };
      }
      const hop = L.hops.find((h) => time >= h.start && time < h.start + h.dur);
      if (!hop) return { x: 0, z: 0, visible: false };
      const p = (time - hop.start) / hop.dur;
      const x = hop.fromX + (hop.toX - hop.fromX) * p;
      const z = hop.z0 + (hop.z1 - hop.z0) * p + 4 * hop.height * p * (1 - p);
      return { x, z, visible: true };
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (fontReady) time += dt;
      raf = requestAnimationFrame(step);
      const L = layout;
      if (!L || !fontReady) return;

      // Each touch punches the surface; the pair it lands on rises through the rings.
      while (fired < L.hops.length && time >= L.hops[fired].start + L.hops[fired].dur) {
        const hop = L.hops[fired];
        const isRest = fired === L.hops.length - 1;
        if (time - (hop.start + hop.dur) < 0.5) {
          water?.drop(hop.toX, L.waterline, isRest ? 0.022 : 0.026, isRest ? -0.2 : -0.38);
        }
        fired++;
      }
      if (!finished && time >= L.end) {
        finished = true;
        setPlayed(true);
      }

      // Glassy, plain white until the first touch; the swell then breathes in.
      const firstTouch = L.hops[0].start + L.hops[0].dur;
      water?.setAmbient(smooth((time - firstTouch) / 1.6));

      // Spin and wobble wind down to a still resting pose.
      stoneClock += dt * Math.min(Math.max((L.restAt - time) / 0.45, 0), 1);
      stone.spinPhase = restAngle - 11 * Math.pow(Math.max(L.restAt - time, 0), 1.5);

      paintLetters(L);
      ctx.clearRect(0, 0, W, H);
      if (water) {
        water.update(dt);
        water.render(time, letters);
      } else {
        ctx.fillStyle = "#f3f3f5";
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(letters, 0, 0);
        ctx.restore();
      }
      const pos = stonePos(L);
      if (pos.visible) {
        stone.size = L.rx / 15;
        drawStone(ctx, stone, pos.x, L.waterline, pos.z, 1, stoneClock);
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      water?.dispose();
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, 450);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Loading pebble"
      className={clsx(
        "fixed inset-0 z-[100] overflow-hidden bg-[#f3f3f5] font-[family-name:var(--font-nesiota)] transition-opacity duration-[450ms] ease-out",
        leaving && "pointer-events-none opacity-0"
      )}
    >
      <canvas ref={waterRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
