// A white river pebble: an irregular flat oval with thickness, speckled
// texture and moonlight shading, spinning flat as it skips.

export interface Stone {
  harmonics: { k: number; amp: number; phase: number }[];
  /** Width-to-length ratio of the oval. */
  aspect: number;
  size: number;
  spin: number;
  spinPhase: number;
  texture: HTMLCanvasElement;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

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

export function makeStone(): Stone {
  return {
    harmonics: [
      { k: 2, amp: rand(0.02, 0.07), phase: rand(0, Math.PI * 2) },
      { k: 3, amp: rand(0.02, 0.05), phase: rand(0, Math.PI * 2) },
      { k: 5, amp: rand(0.005, 0.015), phase: rand(0, Math.PI * 2) },
    ],
    aspect: rand(0.62, 0.8),
    size: rand(0.85, 1.15),
    spin: rand(9, 15) * (Math.random() < 0.5 ? -1 : 1),
    spinPhase: rand(0, Math.PI * 2),
    texture: makeTexture(),
  };
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
  const tilt = 0.46 + 0.07 * Math.sin(time * 6.3 + stone.spinPhase);
  const thick = rx * 0.2;
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

  // Pale reflection smeared on the dark water below, fading as it rises.
  const reflect = Math.max(0, 1 - z / 140);
  if (reflect > 0) {
    ctx.save();
    ctx.translate(x, y + Math.min(z * 0.5, 40));
    ctx.scale(1, 0.28);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.6);
    g.addColorStop(0, `rgba(225,230,240,${0.22 * reflect})`);
    g.addColorStop(1, "rgba(225,230,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y - z);

  // Edge band: stacked outlines, darkening downward, read as a rounded rim.
  const layers = 7;
  for (let i = layers; i >= 1; i--) {
    const f = i / layers;
    const v = Math.round(214 - 120 * f * f);
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
  light.addColorStop(0, "rgba(255,255,255,0.55)");
  light.addColorStop(0.45, "rgba(255,255,255,0)");
  light.addColorStop(0.8, "rgba(70,70,66,0.18)");
  light.addColorStop(1, "rgba(40,40,38,0.55)");
  ctx.fillStyle = light;
  ctx.fillRect(-rx * 1.3, -rx * 1.3, rx * 2.6, rx * 2.6);

  // Soft wet specular glint.
  ctx.save();
  ctx.translate(rx * 0.3, -rx * tilt * 0.38);
  ctx.scale(1, 0.4);
  const glint = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.28);
  glint.addColorStop(0, "rgba(255,255,255,0.8)");
  glint.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  outline(0);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}
