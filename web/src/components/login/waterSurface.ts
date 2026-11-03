// GPU water: a height-field wave simulation (ping-ponged float textures) rendered
// as a perspective water plane with Fresnel reflections of a moonlit night sky.
// Technique after Evan Wallace's WebGL Water (madebyevan.com/webgl-water).

// Screen -> water-plane projection. Row t (0 = top, 1 = bottom) sits at depth
// A / (C + t), so far water (top) is foreshortened and ripples flatten into ellipses.
const C = 1;
const A = 3.5;
const EYE_HEIGHT = 1.2;
const SIM_SIZE = 1024;
const STEP = 1 / 60;
// Height difference -> surface slope. Higher = punchier ripple highlights.
const SLOPE = 16;

export interface WaterSurface {
  resize(width: number, height: number, dpr: number): void;
  /** Disturb the water at a screen point (CSS px). Radius is in water-plane units. */
  drop(x: number, y: number, radius: number, strength: number): void;
  update(dt: number): void;
  /** Water heights along the left screen edge, one per row from the top (RGBA stride). */
  sampleLeftEdge(rows: number): Float32Array | null;
  /** Strength of the ambient swell, 0 (glassy) to 1 (default). */
  setAmbient(amount: number): void;
  /** Draw the water; `messages` is a canvas of bubbles refracted by the ripples. */
  render(time: number, messages?: TexImageSource | null): void;
  dispose(): void;
}

/** Relative on-screen size of things at screen row y (1 at mid-height). */
export const waterPerspective = (y: number, height: number) =>
  (C + Math.min(Math.max(y / height, 0), 1)) / (C + 0.5);

const QUAD_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const DROP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uWater;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
void main() {
  vec4 info = texture(uWater, vUv);
  float d = max(0.0, 1.0 - length(uCenter - vUv) / uRadius);
  d = 0.5 - cos(d * 3.14159265) * 0.5;
  info.r += d * uStrength;
  outColor = info;
}`;

const UPDATE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uWater;
uniform vec2 uDelta;
void main() {
  vec4 info = texture(uWater, vUv);
  vec2 dx = vec2(uDelta.x, 0.0);
  vec2 dy = vec2(0.0, uDelta.y);
  float average = (
    texture(uWater, vUv - dx).r + texture(uWater, vUv + dx).r +
    texture(uWater, vUv - dy).r + texture(uWater, vUv + dy).r
  ) * 0.25;
  // r = height, g = vertical velocity. Pull toward neighbours, then damp.
  info.g += (average - info.r) * 2.0;
  info.g *= 0.996;
  info.r += info.g;
  // Absorb waves near the domain border instead of bouncing them back in view.
  vec2 border = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.08, min(border.x, border.y));
  info.rg *= mix(0.9, 1.0, edge);
  outColor = info;
}`;

const RENDER_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uWater;
uniform float uAspect;
uniform float uDomain;
uniform float uYMin;
uniform float uTime;
uniform float uTexel;
uniform float uSlope;
uniform sampler2D uMessages;
uniform float uHasMessages;
uniform float uLight;
uniform float uRefract;
uniform float uAmbient;

const float C = ${C.toFixed(3)};
const float A = ${A.toFixed(3)};
const float EYE = ${EYE_HEIGHT.toFixed(3)};
const vec3 MOON = normalize(vec3(0.42, 0.3, 1.0));
const vec3 DEEP = vec3(0.004, 0.008, 0.018);

float heightAt(vec2 uv) {
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return texture(uWater, uv).r;
}

// Slope contribution of one travelling sine swell.
vec2 swell(vec2 p, vec2 dir, float freq, float speed, float amp) {
  dir = normalize(dir);
  return dir * amp * freq * cos(dot(dir, p) * freq - uTime * speed);
}

vec3 sky(vec3 r) {
  float up = clamp(r.y, 0.0, 1.0);
  vec3 col = mix(vec3(2.4, 2.6, 3.1), vec3(0.006, 0.01, 0.024), pow(up, 0.18));
  float m = max(dot(r, MOON), 0.0);
  col += vec3(0.88, 0.93, 1.0) * (pow(m, 1200.0) * 14.0 + pow(m, 80.0) * 1.2 + pow(m, 10.0) * 0.12);
  return col;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float t = 1.0 - vUv.y;
  float k = C + t;
  vec2 p = vec2((vUv.x - 0.5) * uAspect / k, A / k);
  vec2 uv = vec2((p.x + uDomain * 0.5) / uDomain, (p.y - uYMin) / uDomain);

  vec2 e = vec2(uTexel, 0.0);
  vec2 ripple = vec2(
    heightAt(uv + e.xy) - heightAt(uv - e.xy),
    heightAt(uv + e.yx) - heightAt(uv - e.yx)
  ) * uSlope;

  // Gentle ambient swell, mostly crests running across the view.
  vec2 ambient = swell(p, vec2(0.12, 1.0), 26.0, 1.3, 0.0016);
  ambient += swell(p, vec2(-0.3, 1.0), 41.0, 1.9, 0.0009);
  ambient += swell(p, vec2(0.6, 1.0), 63.0, 2.6, 0.0005);
  ambient += swell(p, vec2(1.0, 0.25), 17.0, 0.7, 0.0009);
  ambient *= uAmbient;
  vec2 grad = ripple + ambient;

  vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
  vec3 v = normalize(vec3(-p.x, EYE, -p.y));
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);

  vec3 col;
  if (uLight > 0.5) {
    // Pale milky surface: slopes facing the soft key light brighten, those
    // turned away pick up grey, so rings read as soft grey/white bands.
    // Ripples get the full contrast; the swell stays a faint sheen.
    vec2 tiltDir = vec2(0.3, -0.9);
    float facing = dot(ripple, tiltDir) * 9.0 + dot(ambient, tiltDir) * 1.6;
    col = vec3(0.952, 0.954, 0.962);
    col += vec3(0.05) * clamp(facing, 0.0, 1.0) - vec3(0.2, 0.2, 0.19) * clamp(-facing, 0.0, 1.2);
    col += vec3(0.5) * pow(clamp(facing - 0.6, 0.0, 1.0), 2.0);
    col = min(col, vec3(1.0));
  } else {
    col = mix(DEEP, sky(r), fresnel);
    col = 1.0 - exp(-col * 1.3);
  }

  if (uHasMessages > 0.5) {
    // Messages float on the surface: the ripple slope bends them like refraction.
    vec4 msg = texture(uMessages, vUv + grad * uRefract);
    msg.rgb *= 1.0 + clamp(grad.y * 0.35, -0.2, 0.2);
    col = col * (1.0 - msg.a) + msg.rgb;
  }
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

// Samples the height field along the left screen edge into a rows x 1 strip.
const EDGE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uWater;
uniform float uAspect;
uniform float uDomain;
uniform float uYMin;
void main() {
  float k = ${C.toFixed(3)} + vUv.x;
  vec2 p = vec2(-0.5 * uAspect / k, ${A.toFixed(3)} / k);
  vec2 uv = vec2((p.x + uDomain * 0.5) / uDomain, (p.y - uYMin) / uDomain);
  outColor = vec4(texture(uWater, uv).r, 0.0, 0.0, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const;
  for (const [type, src] of shaders) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  return program;
}

export interface WaterOptions {
  /** White water instead of the moonlit night. */
  light?: boolean;
  /** How far ripple slopes bend the overlay layer. */
  refract?: number;
}

export function createWaterSurface(
  canvas: HTMLCanvasElement,
  { light = false, refract = 0.012 }: WaterOptions = {}
): WaterSurface | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  // Full float targets also let us read the edge heights back for the shore.
  const canReadFloat = !!gl.getExtension("EXT_color_buffer_float");
  if (!canReadFloat && !gl.getExtension("EXT_color_buffer_half_float")) return null;

  let programs: { drop: WebGLProgram; update: WebGLProgram; render: WebGLProgram; edge: WebGLProgram };
  try {
    programs = {
      drop: compile(gl, QUAD_VS, DROP_FS),
      update: compile(gl, QUAD_VS, UPDATE_FS),
      render: compile(gl, QUAD_VS, RENDER_FS),
      edge: compile(gl, QUAD_VS, EDGE_FS),
    };
  } catch (err) {
    console.warn("Water shaders unavailable, falling back to 2D", err);
    return null;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const targets = [0, 1].map(() => {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, SIM_SIZE, SIM_SIZE, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer };
  });
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const messageTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, messageTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let edgeTarget: { texture: WebGLTexture; framebuffer: WebGLFramebuffer; rows: number; data: Float32Array } | null =
    null;

  let current = 0;
  let width = 1;
  let height = 1;
  let aspect = 1;
  let domain = 1;
  let yMin = 0;
  let accumulator = 0;
  let ambientAmount = 1;

  // Run one simulation pass reading the current texture into the other one.
  const simPass = (program: WebGLProgram, setUniforms: () => void) => {
    const src = targets[current];
    const dst = targets[1 - current];
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
    gl.viewport(0, 0, SIM_SIZE, SIM_SIZE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(gl.getUniformLocation(program, "uWater"), 0);
    setUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    current = 1 - current;
  };

  return {
    resize(w, h, dpr) {
      width = w;
      height = h;
      aspect = w / Math.max(h, 1);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      // Square sim domain covering the visible trapezoid of water.
      yMin = A / (C + 1);
      domain = Math.max(A / C - yMin, aspect / C);
    },

    drop(x, y, radius, strength) {
      const k = C + y / height;
      const px = ((x / width - 0.5) * aspect) / k;
      const py = A / k;
      const center = [(px + domain / 2) / domain, (py - yMin) / domain];
      const program = programs.drop;
      simPass(program, () => {
        gl.uniform2f(gl.getUniformLocation(program, "uCenter"), center[0], center[1]);
        gl.uniform1f(gl.getUniformLocation(program, "uRadius"), radius / domain);
        gl.uniform1f(gl.getUniformLocation(program, "uStrength"), strength);
      });
    },

    update(dt) {
      accumulator = Math.min(accumulator + dt, STEP * 4);
      const program = programs.update;
      while (accumulator >= STEP) {
        simPass(program, () => {
          gl.uniform2f(gl.getUniformLocation(program, "uDelta"), 1 / SIM_SIZE, 1 / SIM_SIZE);
        });
        accumulator -= STEP;
      }
    },

    setAmbient(amount) {
      ambientAmount = amount;
    },

    render(time, messages) {
      const program = programs.render;
      if (messages) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, messageTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, messages);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      }
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[current].texture);
      gl.uniform1i(gl.getUniformLocation(program, "uWater"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "uAspect"), aspect);
      gl.uniform1f(gl.getUniformLocation(program, "uDomain"), domain);
      gl.uniform1f(gl.getUniformLocation(program, "uYMin"), yMin);
      gl.uniform1f(gl.getUniformLocation(program, "uTime"), time);
      gl.uniform1f(gl.getUniformLocation(program, "uTexel"), 1 / SIM_SIZE);
      gl.uniform1f(gl.getUniformLocation(program, "uSlope"), SLOPE);
      gl.uniform1i(gl.getUniformLocation(program, "uMessages"), 1);
      gl.uniform1f(gl.getUniformLocation(program, "uHasMessages"), messages ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(program, "uLight"), light ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(program, "uRefract"), refract);
      gl.uniform1f(gl.getUniformLocation(program, "uAmbient"), ambientAmount);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    sampleLeftEdge(rows) {
      if (!canReadFloat || rows < 1) return null;
      if (!edgeTarget || edgeTarget.rows !== rows) {
        if (edgeTarget) {
          gl.deleteTexture(edgeTarget.texture);
          gl.deleteFramebuffer(edgeTarget.framebuffer);
        }
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, rows, 1, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        const framebuffer = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        edgeTarget = { texture, framebuffer, rows, data: new Float32Array(rows * 4) };
      }
      const program = programs.edge;
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, edgeTarget.framebuffer);
      gl.viewport(0, 0, rows, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[current].texture);
      gl.uniform1i(gl.getUniformLocation(program, "uWater"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "uAspect"), aspect);
      gl.uniform1f(gl.getUniformLocation(program, "uDomain"), domain);
      gl.uniform1f(gl.getUniformLocation(program, "uYMin"), yMin);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.readPixels(0, 0, rows, 1, gl.RGBA, gl.FLOAT, edgeTarget.data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return edgeTarget.data;
    },

    dispose() {
      if (edgeTarget) {
        gl.deleteTexture(edgeTarget.texture);
        gl.deleteFramebuffer(edgeTarget.framebuffer);
      }
      for (const t of targets) {
        gl.deleteTexture(t.texture);
        gl.deleteFramebuffer(t.framebuffer);
      }
      gl.deleteBuffer(quad);
      gl.deleteTexture(messageTexture);
      Object.values(programs).forEach((p) => gl.deleteProgram(p));
    },
  };
}
