"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { createWaterSurface, waterPerspective } from "./waterSurface";
import { drawBubble, type Bubble, type BubbleVariant } from "./bubbles";
import { drawStone, makeStone, type Stone } from "./stone";

// Conversation pairs: the last two skips of a throw "say" one pair.
const CONVERSATIONS: [string, string][] = [
  ["Running a little late.", "No worries, take your time."],
  ["Are we still on for Saturday?", "Absolutely. See you there."],
  ["I found the quiet place.", "Send me the pin."],
  ["Look at the moon tonight.", "Wish you were here."],
  ["Did you get home okay?", "Just walked in. Thank you."],
  ["Coffee tomorrow?", "Only if it's the place by the lake."],
  ["I miss our long talks.", "Call me tonight?"],
  ["Made it to the station.", "Safe travels, see you soon."],
];

interface Ripple {
  x: number;
  y: number;
  born: number;
  life: number;
  maxR: number;
  strength: number;
}

interface Point {
  x: number;
  y: number;
}

interface Hop {
  from: Point;
  to: Point;
  height: number;
  start: number;
  dur: number;
}

interface Throw {
  hops: Hop[];
  messages: [string, string];
  stone: Stone;
  firedTouches: number;
  endTime: number | null;
}

interface Streak {
  x: number;
  y: number;
  w: number;
  h: number;
  alpha: number;
  speed: number;
  phase: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// Throw templates in relative coords: where the first touch lands (a) and
// where the stone sinks (b). Each throw jitters and may mirror one of these.
const THROW_MODES: { a: [number, number]; b: [number, number] }[] = [
  { a: [0.08, 0.5], b: [0.86, 0.54] }, // horizontal
  { a: [0.2, 0.84], b: [0.74, 0.22] }, // rising, skipping away
  { a: [0.12, 0.2], b: [0.72, 0.8] }, // descending, skipping closer
  { a: [0.1, 0.32], b: [0.84, 0.7] }, // gentle diagonal
  { a: [0.14, 0.72], b: [0.86, 0.4] }, // shallow rise
];

const FLY_SPEED = 0.032; // hop duration factor (seconds per sqrt px)

export function SkippingStoneCanvas({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const waterCanvas = waterRef.current;
    if (!container || !canvas || !waterCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Realistic GPU water when WebGL2 float targets exist; otherwise the 2D rings below.
    const water = createWaterSurface(waterCanvas);
    // Bubbles are painted here and handed to the water shader, which ripples them.
    const messageCanvas = document.createElement("canvas");
    const msgCtx = messageCanvas.getContext("2d")!;
    const font = getComputedStyle(container).fontFamily || "sans-serif";
    let hadBubbles = false;

    let W = 0;
    let H = 0;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      water?.resize(W, H, Math.min(dpr, 1.5));
      messageCanvas.width = Math.round(W * dpr);
      messageCanvas.height = Math.round(H * dpr);
      msgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // Closer to the viewer (lower on screen) = bigger stone and ripples.
    const persp = (y: number) => waterPerspective(y, H);

    const streaks: Streak[] = Array.from({ length: 16 }, (_, i) => ({
      x: rand(0.05, 1.05),
      // Bias reflections toward the top and bottom bands, like moonlight on water.
      y: i % 3 === 0 ? rand(0.75, 0.98) : rand(0.03, 0.4),
      w: rand(0.08, 0.22),
      h: rand(0.006, 0.018),
      alpha: rand(0.12, 0.3),
      speed: rand(0.08, 0.25),
      phase: rand(0, Math.PI * 2),
    }));

    let time = 0;
    let last = performance.now();
    let raf = 0;
    let liveBubbles: Bubble[] = [];
    const ripples: Ripple[] = [];
    let current: Throw | null = null;
    let nextThrowAt = 0.4;
    let nextCalmAt = 0.5;

    const spawnBubble = (
      x: number,
      y: number,
      text: string | null,
      variant: BubbleVariant,
      life: number,
      preferred?: Bubble["side"]
    ) => {
      let side: Bubble["side"] = preferred ?? (x > W * 0.62 ? "left" : "right");
      if (side === "right" && x + 250 > W) side = "left";
      else if (side === "left" && x - 250 < 0) side = "right";
      let lift = 0;
      for (const b of liveBubbles) {
        const gap = y - (b.y - b.lift);
        if (b.side === side && Math.abs(b.x - x) < 240 && Math.abs(gap) < 70) lift = Math.max(lift, gap + 70);
      }
      const bubble: Bubble = {
        x,
        y,
        text,
        variant,
        side,
        lift,
        life,
        bornAt: time,
      };
      liveBubbles = [...liveBubbles, bubble];
    };

    const makeThrow = (start: number): Throw => {
      const mode = pick(THROW_MODES);
      const mirror = Math.random() < 0.5;
      const mx = (v: number) => (mirror ? 1 - v : v);
      const A = { x: mx(mode.a[0] + rand(-0.06, 0.06)) * W, y: (mode.a[1] + rand(-0.06, 0.06)) * H };
      const B = { x: mx(mode.b[0] + rand(-0.06, 0.06)) * W, y: (mode.b[1] + rand(-0.06, 0.06)) * H };

      const touches = 4 + Math.floor(Math.random() * 3);
      const D = Math.hypot(B.x - A.x, B.y - A.y);
      const dir = { x: (B.x - A.x) / D, y: (B.y - A.y) / D };
      const perp = { x: -dir.y, y: dir.x };
      const bend = rand(-0.1, 0.1);

      // Gaps shrink geometrically, like a stone losing energy.
      const ratio = 0.7;
      const weights = Array.from({ length: touches - 1 }, (_, i) => Math.pow(ratio, i));
      const sum = weights.reduce((s, w) => s + w, 0);
      const points: Point[] = [A];
      let travelled = 0;
      for (const w of weights) {
        travelled += (D * w) / sum;
        const s = travelled / D;
        const off = bend * D * s * (1 - s);
        points.push({ x: A.x + dir.x * travelled + perp.x * off, y: A.y + dir.y * travelled + perp.y * off });
      }

      // Entry point: back along the line until off-canvas, so the stone flies in.
      const firstGap = (D * weights[0]) / sum;
      let back = firstGap * 1.3;
      const inside = (p: Point) => p.x > -30 && p.x < W + 30 && p.y > -30 && p.y < H + 30;
      while (inside({ x: A.x - dir.x * back, y: A.y - dir.y * back }) && back < 4000) back += 40;
      points.unshift({ x: A.x - dir.x * back, y: A.y - dir.y * back });

      const hops: Hop[] = [];
      let t = start;
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        const d = Math.hypot(to.x - from.x, to.y - from.y);
        const dur = 0.22 + Math.sqrt(d) * FLY_SPEED;
        hops.push({ from, to, height: Math.min(d * 0.28, 140) * persp((from.y + to.y) / 2), start: t, dur });
        t += dur;
      }
      return { hops, messages: pick(CONVERSATIONS), stone: makeStone(), firedTouches: 0, endTime: null };
    };

    const touchDown = (th: Throw, index: number) => {
      const hop = th.hops[index];
      const total = th.hops.length;
      const isLast = index === total - 1;
      const s = persp(hop.to.y);
      // The stone punches the surface down; the sink is a bigger, deeper hit.
      water?.drop(hop.to.x, hop.to.y, isLast ? 0.042 : 0.03, isLast ? -0.8 : -0.5);
      ripples.push({
        x: hop.to.x,
        y: hop.to.y,
        born: time,
        life: water ? 0.9 : isLast ? 4.4 : 3.4,
        maxR: (isLast ? 210 : rand(120, 160)) * s,
        strength: isLast ? 1 : 0.85,
      });

      // The conversation pair points apart: the reply leans the way the stone travels.
      const forward = th.hops[total - 1].to.x >= th.hops[total - 1].from.x ? "right" : "left";
      const backward = forward === "right" ? "left" : "right";
      if (isLast) spawnBubble(hop.to.x, hop.to.y, th.messages[1], "out", 4.4, forward);
      else if (index === total - 2) spawnBubble(hop.to.x, hop.to.y, th.messages[0], "in", 3.8, backward);
      else if (Math.random() < 0.55) spawnBubble(hop.to.x, hop.to.y, null, "typing", 3);
    };

    const hopPos = (hop: Hop, t: number) => {
      const p = Math.min(Math.max(t, 0), 1);
      return {
        x: hop.from.x + (hop.to.x - hop.from.x) * p,
        y: hop.from.y + (hop.to.y - hop.from.y) * p,
        z: 4 * hop.height * p * (1 - p),
      };
    };

    const drawWater = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#04070d");
      bg.addColorStop(0.55, "#070c16");
      bg.addColorStop(1, "#0a1120");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (const s of streaks) {
        const x = (s.x + Math.sin(time * s.speed + s.phase) * 0.03) * W;
        const y = (s.y + Math.sin(time * s.speed * 0.7 + s.phase) * 0.006) * H;
        const a = s.alpha * (0.75 + 0.25 * Math.sin(time * s.speed * 2 + s.phase));
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, (s.h * H) / (s.w * W));
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.w * W);
        g.addColorStop(0, `rgba(205,220,255,${a})`);
        g.addColorStop(1, "rgba(205,220,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s.w * W, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const drawRipple = (r: Ripple) => {
      const age = time - r.born;
      const p = age / r.life;
      const squash = 0.26 + 0.1 * (r.y / H);

      // Glint where the stone touched the water.
      const glow = Math.pow(1 - p, 3) * r.strength;
      if (glow > 0.01) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.scale(1, squash);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r.maxR * 0.7);
        g.addColorStop(0, `rgba(235,242,255,${0.75 * glow})`);
        g.addColorStop(0.25, `rgba(200,215,255,${0.25 * glow})`);
        g.addColorStop(1, "rgba(230,238,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r.maxR * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (water) return; // the simulation draws the real rings

      const rings = 6;
      for (let k = 0; k < rings; k++) {
        const ak = age - k * 0.2;
        if (ak <= 0) continue;
        const q = Math.min(ak / r.life, 1);
        const radius = r.maxR * (1 - Math.pow(1 - q, 2.2)) + 2;
        const alpha = r.strength * Math.pow(1 - p, 1.5) * (1 - (k / rings) * 0.6);
        if (alpha <= 0.005) continue;
        const lw = Math.max(0.8, 2.2 * persp(r.y) * (1 - q * 0.5));
        // Trough (dark) just outside the crest (bright) gives the ring some depth.
        ctx.lineWidth = lw * 1.6;
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, radius + 2.5, (radius + 2.5) * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = lw;
        ctx.strokeStyle = `rgba(214,226,255,${Math.min(alpha * 1.1, 1)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, radius, radius * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawThrownStone = (th: Throw) => {
      const hop = th.hops.find((h) => time >= h.start && time < h.start + h.dur);
      if (!hop) return;
      const pos = hopPos(hop, (time - hop.start) / hop.dur);
      drawStone(ctx, th.stone, pos.x, pos.y, pos.z, persp(pos.y), time);
    };

    const step = (now: number) => {
      // Simulation clock only advances while frames run (paused in hidden tabs).
      const dt = Math.min((now - last) / 1000, 0.05);
      time += dt;
      last = now;
      raf = requestAnimationFrame(step);
      // The panel can measure 0x0 mid-layout; skip rather than build NaN throws.
      if (W < 10 || H < 10) return;

      if (reduceMotion) {
        if (time >= nextCalmAt) {
          const x = rand(0.2, 0.8) * W;
          const y = rand(0.3, 0.8) * H;
          water?.drop(x, y, 0.03, -0.35);
          ripples.push({ x, y, born: time, life: water ? 1 : 5, maxR: 120 * persp(y), strength: 0.6 });
          const [a, b] = pick(CONVERSATIONS);
          spawnBubble(x, y, Math.random() < 0.5 ? a : b, "out", 5);
          nextCalmAt = time + 5.5;
        }
      } else {
        if (!current && time >= nextThrowAt) current = makeThrow(time);
        if (current) {
          const th = current;
          while (th.firedTouches < th.hops.length) {
            const hop = th.hops[th.firedTouches];
            if (time < hop.start + hop.dur) break;
            touchDown(th, th.firedTouches);
            th.firedTouches++;
          }
          if (th.firedTouches === th.hops.length && th.endTime === null) {
            th.endTime = time;
            nextThrowAt = time + rand(2.2, 3.2);
          }
          if (th.endTime !== null && time >= nextThrowAt) current = null;
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (time - ripples[i].born > ripples[i].life) ripples.splice(i, 1);
      }
      liveBubbles = liveBubbles.filter((b) => time - b.bornAt < b.life);

      if (water) {
        // Only repaint/upload the message layer while there is something on it.
        const hasBubbles = liveBubbles.length > 0;
        if (hasBubbles || hadBubbles) {
          msgCtx.clearRect(0, 0, W, H);
          for (const b of liveBubbles) drawBubble(msgCtx, b, time, font);
        }
        water.update(dt);
        water.render(time, hasBubbles || hadBubbles ? messageCanvas : null);
        hadBubbles = hasBubbles;
        ctx.clearRect(0, 0, W, H);
      } else {
        drawWater();
        for (const b of liveBubbles) drawBubble(ctx, b, time, font);
      }
      for (const r of ripples) drawRipple(r);
      if (current) {
        drawThrownStone(current);
      }
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      water?.dispose();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={clsx("relative overflow-hidden bg-[#05080f]", className)} aria-hidden="true">
      <canvas ref={waterRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
