"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { createWaterSurface } from "@/components/login/waterSurface";
import { drawStone, makeStone, stoneUnderside } from "@/components/login/stone";
import { followTheme, toRgb } from "./waterTheme";

// Idle chat pane: a black pebble bobs on a water surface, and each landing sends
// rings through the copy below. The copy is painted into the water so the
// ripples bend it, while the real (transparent) DOM stays on top for clicks,
// focus and screen readers.

const BOUNCE_PERIOD = 1.9;
const HOP_SHARE = 0.62; // part of the period spent in the air
// Waterline as a share of the pebble slot's height, and the stone's half-length vs its width.
const WATERLINE = 0.72;
const STONE_RX = 0.3;
const REST_ANGLE = -0.22;
const ICON_PATH =
  "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719";

interface Word {
  text: string;
  x: number;
  y: number;
  font: string;
  spacing: string;
  ink: "fg" | "muted" | "accent-fg";
}

interface Layout {
  words: Word[];
  button: { x: number; y: number; w: number; h: number; r: number };
  icon: { x: number; y: number; size: number };
  pebble: { x: number; y: number; w: number; h: number };
}

/** Position every word of `el` (relative to `origin`) so it can be redrawn on canvas. */
function collectWords(
  ctx: CanvasRenderingContext2D,
  el: HTMLElement,
  origin: DOMRect,
  ink: Word["ink"],
  out: Word[]
) {
  const cs = getComputedStyle(el);
  const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const spacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  ctx.font = font;
  ctx.letterSpacing = spacing;
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getBoundingClientRect();
      const metrics = ctx.measureText(m[0]);
      const asc = metrics.fontBoundingBoxAscent;
      const desc = metrics.fontBoundingBoxDescent;
      out.push({
        text: m[0],
        x: r.left - origin.left,
        y: r.top - origin.top + (r.height - (asc + desc)) / 2 + asc,
        font,
        spacing,
        ink,
      });
    }
  }
}

export function WaterEmptyState({ onStart }: { onStart: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const pebbleSlotRef = useRef<HTMLDivElement>(null);
  const stoneRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const buttonState = useRef({ hover: false, down: false });

  useEffect(() => {
    const container = containerRef.current;
    const waterCanvas = waterRef.current;
    const pebbleSlot = pebbleSlotRef.current;
    const stoneCanvas = stoneRef.current;
    const title = titleRef.current;
    const body = bodyRef.current;
    const button = buttonRef.current;
    if (!container || !waterCanvas || !pebbleSlot || !stoneCanvas || !title || !body || !button) return;

    const water = createWaterSurface(waterCanvas, { light: true, refract: 0.02, simSize: 320 });
    if (!water) return; // No WebGL2: the plain DOM version stays visible.
    container.dataset.water = "on";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const overlay = document.createElement("canvas");
    const octx = overlay.getContext("2d")!;
    const icon = new Path2D(ICON_PATH);

    const sctx = stoneCanvas.getContext("2d")!;
    const mirror = document.createElement("canvas");
    const mctx = mirror.getContext("2d")!;
    const stone = makeStone("dark");
    stone.spin = 0;
    stone.spinPhase = REST_ANGLE;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let layout: Layout | null = null;
    let rim = 0;
    let colors = { fg: "#000", muted: "#555", accent: "#7b7cf6", accentHover: "#6a6bef", accentFg: "#fff" };

    const readColors = () => {
      const cs = getComputedStyle(container);
      const v = (name: string) => cs.getPropertyValue(name).trim();
      colors = {
        fg: v("--fg"),
        muted: v("--muted"),
        accent: v("--accent"),
        accentHover: v("--accent-hover"),
        accentFg: v("--accent-fg"),
      };
      const base = toRgb(v("--bg"));
      water.setBase(base);
      // Black stone on dark water needs an edge light to read.
      rim = base[0] * 0.299 + base[1] * 0.587 + base[2] * 0.114 < 0.4 ? 1 : 0;
    };

    const measure = () => {
      const origin = container.getBoundingClientRect();
      W = origin.width;
      H = origin.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [overlay, stoneCanvas, mirror]) {
        c.width = Math.max(1, Math.round(W * dpr));
        c.height = Math.max(1, Math.round(H * dpr));
      }
      water.resize(W, H, dpr);

      const words: Word[] = [];
      collectWords(octx, title, origin, "fg", words);
      collectWords(octx, body, origin, "muted", words);
      collectWords(octx, button, origin, "accent-fg", words);
      const b = button.getBoundingClientRect();
      const i = button.querySelector("svg")!.getBoundingClientRect();
      const p = pebbleSlot.getBoundingClientRect();
      layout = {
        words,
        button: {
          x: b.left - origin.left,
          y: b.top - origin.top,
          w: b.width,
          h: b.height,
          r: parseFloat(getComputedStyle(button).borderTopLeftRadius) || 16,
        },
        icon: { x: i.left - origin.left, y: i.top - origin.top, size: i.width },
        pebble: { x: p.left - origin.left, y: p.top - origin.top, w: p.width, h: p.height },
      };
    };

    readColors();
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    document.fonts?.ready.then(measure);

    const stopTheme = followTheme(readColors);

    // Tapping the water makes rings too.
    const onPointerDown = (e: PointerEvent) => {
      const r = container.getBoundingClientRect();
      water.drop(e.clientX - r.left, e.clientY - r.top, 0.018, -0.22);
    };
    container.addEventListener("pointerdown", onPointerDown);

    const paintOverlay = (L: Layout) => {
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, W, H);

      // Reflection: the stone mirrored about the waterline, fading with depth.
      // Painted here so the ripples bend it along with the copy.
      const P = L.pebble;
      const line = P.y + P.h * WATERLINE;
      octx.save();
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalAlpha = 0.3;
      octx.translate(0, line * 2 * dpr);
      octx.scale(1, -1);
      octx.drawImage(mirror, 0, 0);
      octx.restore();
      octx.save();
      octx.globalCompositeOperation = "destination-out";
      const fade = octx.createLinearGradient(0, line, 0, line + P.h * 0.4);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      octx.fillStyle = fade;
      octx.fillRect(P.x - 40, line, P.w + 80, P.h);
      octx.restore();

      const B = L.button;
      const { hover, down } = buttonState.current;
      octx.save();
      octx.shadowColor = `color-mix(in srgb, ${colors.accent} 55%, transparent)`;
      octx.shadowBlur = 30;
      octx.shadowOffsetY = 12;
      octx.fillStyle = hover || down ? colors.accentHover : colors.accent;
      octx.beginPath();
      octx.roundRect(B.x, B.y, B.w, B.h, B.r);
      octx.fill();
      octx.restore();

      const I = L.icon;
      octx.save();
      octx.translate(I.x, I.y);
      octx.scale(I.size / 24, I.size / 24);
      octx.strokeStyle = colors.accentFg;
      octx.lineWidth = 2;
      octx.lineCap = "round";
      octx.lineJoin = "round";
      octx.stroke(icon);
      octx.restore();

      const ink = { fg: colors.fg, muted: colors.muted, "accent-fg": colors.accentFg };
      octx.textBaseline = "alphabetic";
      for (const w of L.words) {
        octx.font = w.font;
        octx.letterSpacing = w.spacing;
        octx.fillStyle = ink[w.ink];
        octx.fillText(w.text, w.x, w.y);
      }
    };

    let time = 0;
    let stoneClock = 0;
    let lastLanding = -1;
    let last = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      raf = requestAnimationFrame(step);
      const L = layout;
      if (!L || W < 10 || H < 10) return;

      const P = L.pebble;
      const rx = P.w * STONE_RX;
      const cx = P.x + P.w * 0.5;
      const line = P.y + P.h * WATERLINE;
      // Sits a touch low, like a wet stone settled into the surface.
      const restZ = stoneUnderside(stone, rx) - rx * 0.12;

      // One hop per period: a parabola in the air, then it settles with a small bob.
      let lift = 0;
      if (!reduceMotion) {
        const cycle = Math.floor(time / BOUNCE_PERIOD);
        const phase = (time % BOUNCE_PERIOD) / BOUNCE_PERIOD;
        const height = P.h * 0.24;
        if (phase < HOP_SHARE) {
          const p = phase / HOP_SHARE;
          lift = 4 * height * p * (1 - p);
          // A slight turn and wobble in the air, square again by touchdown.
          stone.spinPhase = REST_ANGLE + 0.18 * Math.sin(p * Math.PI);
          stoneClock += dt;
        } else {
          const s = (phase - HOP_SHARE) * BOUNCE_PERIOD; // seconds since touchdown
          lift = -Math.exp(-s * 7) * Math.sin(s * 18) * rx * 0.06;
          stone.spinPhase = REST_ANGLE;
          if (cycle !== lastLanding) {
            lastLanding = cycle;
            water.drop(cx, line, 0.03, -0.32);
          }
        }
      }

      stone.size = rx / 15;
      for (const g of [sctx, mctx]) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
      }
      drawStone(sctx, stone, cx, line, restZ + lift, 1, stoneClock, rim);
      // The mirror copy skips the contact smear; only the body is reflected.
      mctx.save();
      mctx.beginPath();
      mctx.rect(0, 0, W, line);
      mctx.clip();
      drawStone(mctx, stone, cx, line, restZ + lift, 1, stoneClock, rim);
      mctx.restore();

      paintOverlay(L);
      water.update(dt);
      water.render(time, overlay);
    };
    water.setAmbient(0.45);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      stopTheme();
      container.removeEventListener("pointerdown", onPointerDown);
      delete container.dataset.water;
      water.dispose();
    };
  }, []);

  const setButton = (patch: Partial<typeof buttonState.current>) => Object.assign(buttonState.current, patch);

  return (
    <div
      ref={containerRef}
      className="group relative flex-1 flex flex-col items-center justify-center overflow-hidden p-8 text-center select-none"
    >
      <canvas ref={waterRef} className="absolute inset-0 hidden h-full w-full group-data-[water=on]:block" aria-hidden="true" />
      <canvas ref={stoneRef} className="pointer-events-none absolute inset-0 hidden h-full w-full group-data-[water=on]:block" aria-hidden="true" />
      <div className="relative max-w-md">
        <div ref={pebbleSlotRef} className="mx-auto h-44 w-48" />
        <h2
          ref={titleRef}
          className="mt-6 text-[40px] font-semibold leading-[1.15] text-fg tracking-tight group-data-[water=on]:text-transparent"
        >
          Your conversations, all in one place
        </h2>
        <p ref={bodyRef} className="mt-4 text-lg text-muted leading-relaxed group-data-[water=on]:text-transparent">
          Catch up, collaborate, and keep work moving with Pebble Chat.
        </p>
        <button
          ref={buttonRef}
          onClick={onStart}
          onPointerEnter={() => setButton({ hover: true })}
          onPointerLeave={() => setButton({ hover: false, down: false })}
          onPointerDown={() => setButton({ down: true })}
          onPointerUp={() => setButton({ down: false })}
          className="mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-accent px-10 py-4 text-lg font-medium text-accent-fg shadow-[0_12px_30px_-12px_var(--accent)] hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg group-data-[water=on]:bg-transparent group-data-[water=on]:hover:bg-transparent group-data-[water=on]:text-transparent group-data-[water=on]:shadow-none"
        >
          <MessageCircle className="h-6 w-6" />
          Start a chat
        </button>
      </div>
    </div>
  );
}
