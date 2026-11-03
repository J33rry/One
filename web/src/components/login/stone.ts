// A river pebble: an irregular flat oval with thickness, speckled texture and
// soft shading, spinning flat as it skips. White for the night water, black
// for the white water of the loading screen.

export type StoneTone = "light" | "dark";

export interface Stone {
  harmonics: { k: number; amp: number; phase: number }[];
  /** Width-to-length ratio of the oval. */
  aspect: number;
  size: number;
  spin: number;
  spinPhase: number;
  texture: HTMLCanvasElement;
  tone: StoneTone;
  /** Rim thickness relative to the stone's half-length. */
  thickness: number;
  /** How obliquely the top face is seen (1 = straight down). */
  tilt: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeDarkTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgb(30,30,32)";
  g.fillRect(0, 0, size, size);
  // Basalt: faint mottling and pale mineral flecks on near-black.
  for (let i = 0; i < 12; i++) {
    const r = rand(10, 34);
    const x = rand(0, size);
    const y = rand(0, size);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const shade = Math.random() < 0.5 ? "0,0,0" : "70,70,74";
    grad.addColorStop(0, `rgba(${shade},${rand(0.08, 0.2)})`);
    grad.addColorStop(1, `rgba(${shade},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 360; i++) {
    const v = Math.round(rand(70, 140));
    g.fillStyle = `rgba(${v},${v},${v + 4},${rand(0.06, 0.22)})`;
    g.beginPath();
    g.arc(rand(0, size), rand(0, size), rand(0.3, 0.9), 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function makeTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const base = Math.round(rand(228, 240));
  g.fillStyle = `rgb(${base},${base - 2},${base - 6})`;
  g.fillRect(0, 0, size, size);

  // Mottled patches, then fine grain, like weathered marble or quartzite.
  for (let i = 0; i < 14; i++) {
    const r = rand(10, 34);
    const grad = g.createRadialGradient(rand(0, size), rand(0, size), 0, rand(0, size), rand(0, size), r);
    const shade = Math.random() < 0.5 ? "120,118,112" : "255,255,252";
    grad.addColorStop(0, `rgba(${shade},${rand(0.05, 0.14)})`);
    grad.addColorStop(1, `rgba(${shade},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 420; i++) {
    const v = Math.round(rand(60, 160));
    g.fillStyle = `rgba(${v},${v - 4},${v - 10},${rand(0.08, 0.35)})`;
    g.beginPath();
    g.arc(rand(0, size), rand(0, size), rand(0.3, 1.1), 0, Math.PI * 2);
    g.fill();
  }
  // An occasional faint vein.
  if (Math.random() < 0.6) {
    g.strokeStyle = `rgba(150,146,138,${rand(0.15, 0.3)})`;
    g.lineWidth = rand(0.8, 1.6);
    g.beginPath();
    g.moveTo(0, rand(20, 108));
    g.bezierCurveTo(rand(30, 60), rand(0, 128), rand(70, 100), rand(0, 128), size, rand(20, 108));
    g.stroke();
  }
  return c;
}

export function makeStone(tone: StoneTone = "light"): Stone {
  const dark = tone === "dark";
  return {
    harmonics: [
      { k: 2, amp: rand(0.02, 0.07), phase: rand(0, Math.PI * 2) },
      { k: 3, amp: rand(0.02, 0.05), phase: rand(0, Math.PI * 2) },
      { k: 5, amp: rand(0.005, 0.015), phase: rand(0, Math.PI * 2) },
    ],
    aspect: dark ? rand(0.66, 0.72) : rand(0.62, 0.8),
    size: rand(0.85, 1.15),
    spin: rand(9, 15) * (Math.random() < 0.5 ? -1 : 1),
    spinPhase: rand(0, Math.PI * 2),
    texture: dark ? makeDarkTexture() : makeTexture(),
    tone,
    thickness: dark ? 0.72 : 0.2,
    tilt: dark ? 0.62 : 0.46,
  };
}

/** How far a resting dark stone's underside reaches below its drawn centre (rx = half-length). */
export function stoneUnderside(stone: Stone, rx: number) {
  const thick = rx * stone.thickness;
  const tiltEff = Math.sqrt(stone.tilt ** 2 + stone.thickness ** 2 * (1 - stone.tilt ** 2));
  return thick * 0.5 + rx * stone.aspect * tiltEff;
}

/**
 * Draw the stone at screen (x, y) with height z above the water.
 * `scale` is the perspective scale at that row.
 */
export function drawStone(
  ctx: CanvasRenderingContext2D,
  stone: Stone,
  x: number,
  y: number,
  z: number,
  scale: number,
  time: number
) {
  const rx = 15 * scale * stone.size;
  const spin = stone.spinPhase + time * stone.spin;
  // Seen obliquely the flat stone reads as a squashed disc; it wobbles slightly in flight.
  const dark = stone.tone === "dark";
  const tilt = stone.tilt + 0.07 * Math.sin(time * 6.3 + stone.spinPhase);
  const thick = rx * stone.thickness;
  const cosS = Math.cos(spin);
  const sinS = Math.sin(spin);

  const outline = (offsetY: number) => {
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      let r = 1;
      for (const h of stone.harmonics) r += h.amp * Math.sin(h.k * th + h.phase);
      const lx = Math.cos(th) * r;
      const ly = Math.sin(th) * r * stone.aspect;
      const px = (lx * cosS - ly * sinS) * rx;
      const py = (lx * sinS + ly * cosS) * rx * tilt + offsetY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  // Reflection smeared on the water below (pale on dark water, dark on pale), fading as it rises.
  const reflect = Math.max(0, 1 - z / (dark ? rx * 4 : 140));
  if (reflect > 0) {
    const tint = dark ? "24,24,28" : "225,230,240";
    ctx.save();
    ctx.translate(x, y + (dark ? rx * 0.3 : Math.min(z * 0.5, 40)));
    ctx.scale(1, dark ? 0.42 : 0.28);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.6);
    g.addColorStop(0, `rgba(${tint},${(dark ? 0.32 : 0.22) * reflect})`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y - z);

  if (dark) {
    // A rounded black pebble: the top face swept down through the rim forms one
    // body, shaded as a single curved surface rather than a lid on a band.
    // Outline of a squashed ellipsoid seen from above at `tilt`.
    const cy = thick * 0.5;
    const tiltEff = Math.sqrt(tilt * tilt + (thick / rx) ** 2 * (1 - tilt * tilt));
    const body = new Path2D();
    for (let j = 0; j <= 48; j++) {
      const th = (j / 48) * Math.PI * 2;
      let r = 1;
      for (const h of stone.harmonics) r += h.amp * Math.sin(h.k * th + h.phase);
      const lx = Math.cos(th) * r;
      const ly = Math.sin(th) * r * stone.aspect;
      const px = (lx * cosS - ly * sinS) * rx;
      const py = (lx * sinS + ly * cosS) * rx * tiltEff + cy;
      if (j === 0) body.moveTo(px, py);
      else body.lineTo(px, py);
    }
    body.closePath();
    ctx.fillStyle = "#141416";
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    ctx.save();
    ctx.scale(1, tilt);
    ctx.rotate(spin);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(stone.texture, -rx * 1.15, -rx * 1.15, rx * 2.3, rx * 2.3);
    ctx.restore();
    const shade = ctx.createRadialGradient(-rx * 0.2, cy - rx * tiltEff * 0.45, rx * 0.05, 0, cy, rx * 1.1);
    shade.addColorStop(0, "rgba(120,120,126,0.55)");
    shade.addColorStop(0.35, "rgba(60,60,64,0.22)");
    shade.addColorStop(0.75, "rgba(0,0,0,0.1)");
    shade.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = shade;
    ctx.fillRect(-rx * 1.4, -rx * 1.4, rx * 2.8, rx * 2.8 + thick);
    // Faint bounce light from the white water along the underside.
    const bounce = ctx.createLinearGradient(0, cy, 0, cy + rx * tiltEff * stone.aspect);
    bounce.addColorStop(0, "rgba(255,255,255,0)");
    bounce.addColorStop(1, "rgba(220,222,228,0.16)");
    ctx.fillStyle = bounce;
    ctx.fillRect(-rx * 1.4, -rx * 1.4, rx * 2.8, rx * 2.8 + thick);
    // Wet glint toward the light.
    ctx.translate(-rx * 0.1, cy - rx * tiltEff * stone.aspect * 0.62);
    ctx.rotate(-0.25);
    ctx.scale(1, 0.32);
    const glint = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.42);
    glint.addColorStop(0, "rgba(255,255,255,0.32)");
    glint.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }

  // Edge band: stacked outlines, darkening downward, read as a rounded rim.
  const layers = 7;
  for (let i = layers; i >= 1; i--) {
    const f = i / layers;
    const v = dark ? Math.round(44 - 34 * f * f) : Math.round(214 - 120 * f * f);
    ctx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
    outline(thick * f);
    ctx.fill();
  }

  // Top face: texture spun with the stone, lighting fixed to the moon (upper right).
  outline(0);
  ctx.save();
  ctx.clip();
  ctx.save();
  ctx.scale(1, tilt);
  ctx.rotate(spin);
  ctx.drawImage(stone.texture, -rx * 1.15, -rx * 1.15, rx * 2.3, rx * 2.3);
  ctx.restore();

  const light = ctx.createRadialGradient(rx * 0.3, -rx * tilt * 0.35, rx * 0.05, 0, 0, rx * 1.15);
  light.addColorStop(0, `rgba(255,255,255,${dark ? 0.22 : 0.55})`);
  light.addColorStop(0.45, "rgba(255,255,255,0)");
  light.addColorStop(0.8, `rgba(${dark ? "0,0,0" : "70,70,66"},${dark ? 0.25 : 0.18})`);
  light.addColorStop(1, `rgba(${dark ? "0,0,0" : "40,40,38"},0.55)`);
  ctx.fillStyle = light;
  ctx.fillRect(-rx * 1.3, -rx * 1.3, rx * 2.6, rx * 2.6);

  // Soft wet specular glint.
  ctx.save();
  ctx.translate(rx * 0.3, -rx * tilt * 0.38);
  ctx.scale(1, 0.4);
  const glint = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.28);
  glint.addColorStop(0, `rgba(255,255,255,${dark ? 0.45 : 0.8})`);
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  outline(0);
  ctx.strokeStyle = dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}
