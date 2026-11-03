// Chat bubbles drawn on a 2D canvas so the water shader can refract them with
// the ripples (or, without WebGL, drawn straight onto the overlay).

export type BubbleVariant = "typing" | "in" | "out";

export interface Bubble {
  x: number;
  y: number;
  text: string | null;
  variant: BubbleVariant;
  side: "left" | "right";
  /** Extra height above the anchor so stacked bubbles don't overlap. */
  lift: number;
  life: number;
  bornAt: number;
  layout?: { lines: string[]; w: number; h: number };
}

const STYLES = {
  typing: { bg: "rgba(78,82,98,0.6)", fg: "", size: 0, weight: 400, padX: 16, padY: 12, maxW: 0 },
  in: { bg: "rgba(170,166,232,0.88)", fg: "#17152f", size: 15, weight: 400, padX: 16, padY: 10, maxW: 210 },
  out: { bg: "#c6c3fa", fg: "#120f2a", size: 17, weight: 500, padX: 20, padY: 12, maxW: 230 },
} as const;

const RADIUS = 20;
const TAIL = 26;

function layout(ctx: CanvasRenderingContext2D, b: Bubble, font: string) {
  const s = STYLES[b.variant];
  if (!b.text) return { lines: [], w: 96, h: 42 };
  ctx.font = `${s.weight} ${s.size}px ${font}`;
  const inner = s.maxW - s.padX * 2;
  const lines: string[] = [];
  let line = "";
  for (const word of b.text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > inner) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  return {
    lines,
    w: Math.ceil(textW) + s.padX * 2,
    h: Math.round(lines.length * s.size * 1.35) + s.padY * 2,
  };
}

/** Fade/rise envelope matching the ripple life of the skip that spawned it. */
function envelope(p: number) {
  if (p < 0.12) {
    const e = 1 - Math.pow(1 - p / 0.12, 3);
    return { alpha: e, dy: 8 * (1 - e) };
  }
  if (p < 0.6) return { alpha: 1, dy: 0 };
  const e = (p - 0.6) / 0.4;
  return { alpha: 1 - e, dy: -6 * e };
}

export function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble, time: number, font: string) {
  const p = (time - b.bornAt) / b.life;
  if (p < 0 || p >= 1) return;
  b.layout ??= layout(ctx, b, font);
  const { lines, w, h } = b.layout;
  const s = STYLES[b.variant];
  const { alpha, dy } = envelope(p);

  const bottom = b.y - TAIL - b.lift + dy;
  const top = bottom - h;
  const left = b.side === "right" ? b.x - 2 : b.x + 2 - w;
  const tipY = b.y - 2 + dy;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Body and tail as one path so the translucent fill doesn't double up.
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, RADIUS);
  if (b.side === "right") {
    ctx.moveTo(left + 7, bottom - 1);
    ctx.lineTo(left + 20, bottom - 1);
  } else {
    ctx.moveTo(left + w - 20, bottom - 1);
    ctx.lineTo(left + w - 7, bottom - 1);
  }
  ctx.lineTo(b.x, tipY);
  ctx.closePath();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = s.bg;
  ctx.fill();
  ctx.shadowColor = "transparent";

  if (b.variant === "typing") {
    ctx.fillStyle = "rgba(170,176,194,0.55)";
    ctx.beginPath();
    ctx.roundRect(left + s.padX, top + s.padY, 64, 6, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(170,176,194,0.4)";
    ctx.beginPath();
    ctx.roundRect(left + s.padX, top + s.padY + 12, 40, 6, 3);
    ctx.fill();
  } else {
    ctx.font = `${s.weight} ${s.size}px ${font}`;
    ctx.fillStyle = s.fg;
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, left + s.padX, top + s.padY + i * s.size * 1.35 + 1));
  }
  ctx.restore();
}
