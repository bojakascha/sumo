import { COLLISION_W, COLLISION_H, COLLISION_DATA } from './trackCollisionData.js';

let bgImage = null;

export function loadTrackImages() {
  return new Promise((resolve, reject) => {
    bgImage = new Image();
    bgImage.onload = resolve;
    bgImage.onerror = reject;
    bgImage.src = import.meta.env.BASE_URL + 'race_track_1.webp';
  });
}

// Check if a normalized (0-1) position is on the track
function isTrack(nx, ny) {
  const px = Math.floor(nx * (COLLISION_W - 1));
  const py = Math.floor(ny * (COLLISION_H - 1));
  if (px < 0 || px >= COLLISION_W || py < 0 || py >= COLLISION_H) return false;
  const bitIndex = py * COLLISION_W + px;
  return (COLLISION_DATA[bitIndex >> 3] & (1 << (bitIndex & 7))) !== 0;
}

// Compute wall normal by sampling around the ball to find direction toward track
function getWallNormal(nx, ny, radiusN) {
  let wnx = 0, wny = 0;
  const sampleDist = radiusN * 2;
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const sx = nx + Math.cos(angle) * sampleDist;
    const sy = ny + Math.sin(angle) * sampleDist;
    if (isTrack(sx, sy)) {
      wnx += Math.cos(angle);
      wny += Math.sin(angle);
    }
  }
  const len = Math.hypot(wnx, wny);
  if (len > 0) {
    wnx /= len;
    wny /= len;
  }
  return { nx: wnx, ny: wny };
}

export function checkImageWallCollision(ball, canvas) {
  const bxN = ball.x / canvas.width;
  const byN = ball.y / canvas.height;

  if (isTrack(bxN, byN)) return;

  const radiusNx = ball.radius / canvas.width;
  const radiusNy = ball.radius / canvas.height;
  const radiusN = (radiusNx + radiusNy) / 2;
  const { nx, ny } = getWallNormal(bxN, byN, radiusN);

  if (nx === 0 && ny === 0) return;

  // Push ball back onto track
  for (let i = 0; i < 50; i++) {
    ball.x += nx;
    ball.y += ny;
    if (isTrack(ball.x / canvas.width, ball.y / canvas.height)) break;
  }

  // Reflect velocity along wall normal (preserve tangential)
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const restitution = 0.5;
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
  }
}

let debugOverlay = null;

function buildDebugOverlay(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const on = isTrack(x / w, y / h);
      const i = (y * w + x) * 4;
      img.data[i] = on ? 0 : 255;     // R
      img.data[i + 1] = on ? 255 : 0; // G
      img.data[i + 2] = 0;            // B
      img.data[i + 3] = 120;          // A (semi-transparent)
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function drawImageTrack(ctx, canvas, showCollision) {
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  }
  if (showCollision) {
    if (!debugOverlay) {
      debugOverlay = buildDebugOverlay(COLLISION_W, COLLISION_H);
    }
    ctx.drawImage(debugOverlay, 0, 0, canvas.width, canvas.height);
  }
}

// Start positions — bottom of oval near the torii gate
const START_P1 = [0.42, 0.82];
const START_P2 = [0.58, 0.82];

function findNearestTrackPixel(nx, ny) {
  if (isTrack(nx, ny)) return { x: nx, y: ny };
  // Spiral outward to find nearest track pixel
  for (let r = 1; r < 100; r++) {
    const step = r * 0.005;
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      const sx = nx + Math.cos(angle) * step;
      const sy = ny + Math.sin(angle) * step;
      if (isTrack(sx, sy)) return { x: sx, y: sy };
    }
  }
  return { x: nx, y: ny }; // fallback
}

export function getImageStartPosition(slot, canvas) {
  const pos = slot === 'player1' ? START_P1 : START_P2;
  const safe = findNearestTrackPixel(pos[0], pos[1]);
  return { x: safe.x * canvas.width, y: safe.y * canvas.height };
}

// Lap detection
const CHECKPOINT_Y = 0.25;
const FINISH_Y = 0.80;

export function createImageLapTracker() {
  let passedCheckpoint = false;
  let lastY = null;
  let laps = 0;

  return {
    get laps() { return laps; },
    get passedCheckpoint() { return passedCheckpoint; },

    update(ball, canvas) {
      const by = ball.y / canvas.height;

      if (by < CHECKPOINT_Y) {
        passedCheckpoint = true;
      }

      if (lastY !== null && passedCheckpoint) {
        if (lastY < FINISH_Y && by >= FINISH_Y) {
          laps++;
          passedCheckpoint = false;
        }
      }

      lastY = by;
    },

    reset() {
      passedCheckpoint = false;
      lastY = null;
      laps = 0;
    },
  };
}
