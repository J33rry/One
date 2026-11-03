// The light form panel as a second, thicker liquid: waves that reach the water's
// left edge carry on across it as dark ripples and die out within a short distance.
// A small CPU height field (one cell per few pixels) is plenty for that.

const CELL = 3; // CSS px per simulation cell
const STEP = 1 / 60;
const STEPS_PER_TICK = 2; // matches the water's apparent wave speed better
const DAMPING = 0.968; // per step; the water uses 0.996, so this reads as viscous
const GAIN = 3;
// Per-frame blend toward the slow water level; only the ripple on top of it is passed on.
const LEVEL_TRACK = 0.04;
const SHADE = 14; // slope -> ink opacity
const MAX_ALPHA = 0.32;
const QUIET = 2e-4;

export interface Shore {
  /** Simulation rows; the water edge is sampled at this many points. */
  readonly rows: number;
  resize(): void;
  /** Advance the shore, driving its right edge with water heights (RGBA stride). */
  update(edge: Float32Array | null, dt: number): void;
  render(): void;
}

export function createShore(canvas: HTMLCanvasElement): Shore | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let cols = 0;
  let rows = 0;
  let height = new Float32Array(0);
  let velocity = new Float32Array(0);
  // Slow-moving water level per row and the ripple left after removing it.
  let level = new Float32Array(0);
  let drive = new Float32Array(0);
  let image: ImageData | null = null;
  let accumulator = 0;
  let active = false;
  let drawn = false;

  const reset = () => {
    height.fill(0);
    velocity.fill(0);
  };

  const stepOnce = () => {
    // The seam column follows the water's ripple.
    for (let r = 0; r < rows; r++) {
      const i = r * cols + cols - 1;
      height[i] = drive[r];
      velocity[i] = 0;
    }
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        const avg = (height[i - 1] + height[i + 1] + height[i - cols] + height[i + cols]) * 0.25;
        velocity[i] = (velocity[i] + (avg - height[i]) * 2) * DAMPING;
      }
    }
    let energy = 0;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        height[i] += velocity[i];
        energy = Math.max(energy, Math.abs(height[i]));
      }
    }
    return energy;
  };

  return {
    get rows() {
      return rows;
    },

    resize() {
      const c = Math.max(3, Math.round(canvas.clientWidth / CELL));
      const r = Math.max(3, Math.round(canvas.clientHeight / CELL));
      if (c === cols && r === rows) return;
      cols = c;
      rows = r;
      canvas.width = cols;
      canvas.height = rows;
      height = new Float32Array(cols * rows);
      velocity = new Float32Array(cols * rows);
      level = new Float32Array(rows);
      drive = new Float32Array(rows);
      image = ctx.createImageData(cols, rows);
      drawn = false;
    },

    update(edge, dt) {
      if (!image) return;
      // Drops shift the water's overall level slowly; that drift is not a ripple.
      let edgeMax = 0;
      for (let r = 0; r < rows; r++) {
        const h = edge ? edge[r * 4] : 0;
        level[r] += (h - level[r]) * LEVEL_TRACK;
        drive[r] = (h - level[r]) * GAIN;
        edgeMax = Math.max(edgeMax, Math.abs(drive[r]));
      }
      // Stay idle (no CPU work) until a wave actually reaches the seam.
      if (!active && edgeMax < QUIET) return;
      active = true;

      accumulator = Math.min(accumulator + dt, STEP * 4);
      let energy = 0;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        for (let k = 0; k < STEPS_PER_TICK; k++) energy = stepOnce();
      }
      if (energy < QUIET && edgeMax < QUIET) {
        active = false;
        reset();
      }
    },

    render() {
      if (!image) return;
      if (!active) {
        if (drawn) {
          ctx.clearRect(0, 0, cols, rows);
          drawn = false;
        }
        return;
      }
      const data = image.data;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const gx = height[c < cols - 1 ? i + 1 : i] - height[c > 0 ? i - 1 : i];
          const gy = height[r < rows - 1 ? i + cols : i] - height[r > 0 ? i - cols : i];
          const alpha = Math.min(MAX_ALPHA, Math.sqrt(gx * gx + gy * gy) * SHADE);
          const j = i * 4;
          data[j] = 20;
          data[j + 1] = 18;
          data[j + 2] = 31;
          data[j + 3] = alpha * 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      drawn = true;
    },
  };
}
