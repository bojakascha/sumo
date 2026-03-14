// ── Quaternion math ──────────────────────────────────────────

function qIdentity() { return [0, 0, 0, 1]; } // [x, y, z, w]

function qFromAxisAngle(ax, ay, az, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [ax * s, ay * s, az * s, Math.cos(half)];
}

function qMultiply(a, b) {
  return [
    a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
    a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
    a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
    a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
  ];
}

function qConjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}

// Optimized rotation: q * v * q^-1 using Rodrigues shortcut
function qRotateVec(q, x, y, z) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + (qy * tz - qz * ty),
    y + qw * ty + (qz * tx - qx * tz),
    z + qw * tz + (qx * ty - qy * tx),
  ];
}

function qNormalize(q) {
  const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0]/len, q[1]/len, q[2]/len, q[3]/len];
}

// ── Orientation tracking ────────────────────────────────────

export function createOrientation() {
  return qIdentity();
}

export function updateOrientation(orientation, dx, dy, radius) {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return orientation;

  const angle = -dist / radius;

  // Rolling axis: perpendicular to movement direction in screen space
  // Screen: x=right, y=down. For rolling right, texture scrolls left.
  // Axis = (dy, -dx, 0) normalized
  const ax = dy / dist;
  const ay = -dx / dist;

  const dq = qFromAxisAngle(ax, ay, 0, angle);
  let result = qMultiply(dq, orientation);

  // Renormalize periodically to prevent drift
  return qNormalize(result);
}

// ── Texture ─────────────────────────────────────────────────

let texData = null;
let texW = 0;
let texH = 0;
let texReady = false;

export function loadSphereTexture(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const mapW = img.naturalWidth;
      const mapH = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = mapW;
      c.height = mapH;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, mapW, mapH);
      texData = imageData.data;
      texW = mapW;
      texH = mapH;
      texReady = true;
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function isTextureReady() {
  return texReady;
}

// ── Bilinear texture sampling ───────────────────────────────

function sampleTexture(u, v, out, outIdx) {
  // Wrap u horizontally, clamp v vertically
  u = ((u % 1) + 1) % 1;
  v = Math.max(0, Math.min(0.9999, v));

  const fx = u * (texW - 1);
  const fy = v * (texH - 1);
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = (x0 + 1) % texW;
  const y1 = Math.min(y0 + 1, texH - 1);
  const dx = fx - x0;
  const dy = fy - y0;

  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;

  const i00 = (y0 * texW + x0) * 4;
  const i10 = (y0 * texW + x1) * 4;
  const i01 = (y1 * texW + x0) * 4;
  const i11 = (y1 * texW + x1) * 4;

  out[outIdx]     = texData[i00]*w00 + texData[i10]*w10 + texData[i01]*w01 + texData[i11]*w11;
  out[outIdx + 1] = texData[i00+1]*w00 + texData[i10+1]*w10 + texData[i01+1]*w01 + texData[i11+1]*w11;
  out[outIdx + 2] = texData[i00+2]*w00 + texData[i10+2]*w10 + texData[i01+2]*w01 + texData[i11+2]*w11;
  out[outIdx + 3] = 255;
}

// ── Hemisphere precomputation ───────────────────────────────

let cachedRadius = 0;
let hemiSx = null;
let hemiSy = null;
let hemiSz = null;
let hemiPx = null;
let hemiPy = null;
let hemiCount = 0;

function buildHemisphere(radius) {
  const r = Math.round(radius);
  if (r === cachedRadius && hemiSx) return;
  cachedRadius = r;

  const d = r * 2;
  const points = [];

  for (let py = 0; py < d; py++) {
    for (let px = 0; px < d; px++) {
      const sx = (px - r + 0.5) / r;
      const sy = (py - r + 0.5) / r;
      const r2 = sx * sx + sy * sy;
      if (r2 > 1) continue;
      points.push({ px, py, sx, sy, sz: Math.sqrt(1 - r2) });
    }
  }

  hemiCount = points.length;
  hemiSx = new Float32Array(hemiCount);
  hemiSy = new Float32Array(hemiCount);
  hemiSz = new Float32Array(hemiCount);
  hemiPx = new Uint16Array(hemiCount);
  hemiPy = new Uint16Array(hemiCount);

  for (let i = 0; i < hemiCount; i++) {
    hemiSx[i] = points[i].sx;
    hemiSy[i] = points[i].sy;
    hemiSz[i] = points[i].sz;
    hemiPx[i] = points[i].px;
    hemiPy[i] = points[i].py;
  }
}

// ── Offscreen rendering ─────────────────────────────────────

const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');
const TWO_PI = 2 * Math.PI;

export function renderSphere(orientation, radius, tintColor) {
  const r = Math.round(radius);
  const d = r * 2;

  if (offscreen.width !== d || offscreen.height !== d) {
    offscreen.width = d;
    offscreen.height = d;
  }

  buildHemisphere(r);

  if (!texReady) {
    // Fallback: solid circle
    offCtx.clearRect(0, 0, d, d);
    offCtx.beginPath();
    offCtx.arc(r, r, r, 0, TWO_PI);
    offCtx.fillStyle = tintColor || '#888';
    offCtx.fill();
    return offscreen;
  }

  const imgData = offCtx.createImageData(d, d);
  const pixels = imgData.data;

  const invQ = qConjugate(orientation);
  const qx = invQ[0], qy = invQ[1], qz = invQ[2], qw = invQ[3];

  for (let i = 0; i < hemiCount; i++) {
    const sx = hemiSx[i];
    const sy = hemiSy[i];
    const sz = hemiSz[i];

    // Inline qRotateVec for performance
    const tx = 2 * (qy * sz - qz * sy);
    const ty = 2 * (qz * sx - qx * sz);
    const tz = 2 * (qx * sy - qy * sx);
    const rx = sx + qw * tx + (qy * tz - qz * ty);
    const ry = sy + qw * ty + (qz * tx - qx * tz);
    const rz = sz + qw * tz + (qx * ty - qy * tx);

    // Equirectangular UV
    const u = 0.5 + Math.atan2(rx, rz) / TWO_PI;
    const v = 0.5 + Math.asin(ry < -1 ? -1 : ry > 1 ? 1 : ry) / Math.PI;

    // Pixel index in output
    const pi = (hemiPy[i] * d + hemiPx[i]) * 4;

    // Sample texture with bilinear filtering
    sampleTexture(u, v, pixels, pi);

    // Edge shading: darken toward edges (sz = 1 at center, 0 at edge)
    const light = 0.4 + 0.6 * sz;
    pixels[pi]     *= light;
    pixels[pi + 1] *= light;
    pixels[pi + 2] *= light;
  }

  offCtx.putImageData(imgData, 0, 0);

  // Tint overlay for player identification
  if (tintColor) {
    offCtx.globalCompositeOperation = 'source-atop';
    offCtx.globalAlpha = 0.12;
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, d, d);
    offCtx.globalAlpha = 1;
    offCtx.globalCompositeOperation = 'source-over';
  }

  return offscreen;
}

// ── Draw to main canvas ─────────────────────────────────────

export function drawSphere(ctx, ball, tintColor) {
  const r = Math.round(ball.radius);

  // Shadow
  ctx.beginPath();
  ctx.arc(ball.x + 3, ball.y + 3, r, 0, TWO_PI);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Render and draw sphere sprite
  const sprite = renderSphere(ball.orientation, r, tintColor);
  ctx.drawImage(sprite, Math.round(ball.x - r), Math.round(ball.y - r));
}
