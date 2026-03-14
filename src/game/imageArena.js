import { COLLISION_W, COLLISION_H, COLLISION_DATA } from './arenaCollisionData.js';

export const ZONE_ALLOWED = 0;
export const ZONE_WALL    = 1;
export const ZONE_DEATH   = 2;

let bgImage = null;

export function loadArenaImages() {
  return new Promise((resolve, reject) => {
    bgImage = new Image();
    bgImage.onload = resolve;
    bgImage.onerror = reject;
    bgImage.src = import.meta.env.BASE_URL + 'arena_2.webp';
  });
}

function getZone(nx, ny) {
  const px = Math.floor(nx * (COLLISION_W - 1));
  const py = Math.floor(ny * (COLLISION_H - 1));
  if (px < 0 || px >= COLLISION_W || py < 0 || py >= COLLISION_H) return ZONE_DEATH;
  const i = py * COLLISION_W + px;
  return (COLLISION_DATA[i >> 2] >> ((i & 3) << 1)) & 3;
}

function getWallNormal(nx, ny, radiusN) {
  let wnx = 0, wny = 0;
  const sampleDist = radiusN * 2;
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const sx = nx + Math.cos(angle) * sampleDist;
    const sy = ny + Math.sin(angle) * sampleDist;
    if (getZone(sx, sy) === ZONE_ALLOWED) {
      wnx += Math.cos(angle);
      wny += Math.sin(angle);
    }
  }
  const len = Math.hypot(wnx, wny);
  if (len > 0) { wnx /= len; wny /= len; }
  return { nx: wnx, ny: wny };
}

// Returns ZONE_ALLOWED, ZONE_WALL, or ZONE_DEATH.
// Mutates ball position/velocity on wall bounce.
export function checkArenaCollision(ball, canvas) {
  const nx = ball.x / canvas.width;
  const ny = ball.y / canvas.height;
  const zone = getZone(nx, ny);

  if (zone === ZONE_ALLOWED) return ZONE_ALLOWED;
  if (zone === ZONE_DEATH)   return ZONE_DEATH;

  // ZONE_WALL — bounce back
  const radiusN = (ball.radius / canvas.width + ball.radius / canvas.height) / 2;
  const normal = getWallNormal(nx, ny, radiusN);
  if (normal.nx === 0 && normal.ny === 0) return ZONE_WALL;

  for (let i = 0; i < 50; i++) {
    ball.x += normal.nx;
    ball.y += normal.ny;
    if (getZone(ball.x / canvas.width, ball.y / canvas.height) === ZONE_ALLOWED) break;
  }

  const vn = ball.vx * normal.nx + ball.vy * normal.ny;
  if (vn < 0) {
    const restitution = 0.5;
    ball.vx -= (1 + restitution) * vn * normal.nx;
    ball.vy -= (1 + restitution) * vn * normal.ny;
  }

  return ZONE_WALL;
}

export function getArenaStartPosition(slot, canvas) {
  // Centre of the arena as default — both players start near middle
  const positions = { player1: [0.42, 0.5], player2: [0.58, 0.5] };
  const [nx, ny] = positions[slot] || [0.5, 0.5];
  // Spiral-search to nearest allowed pixel
  if (getZone(nx, ny) === ZONE_ALLOWED) return { x: nx * canvas.width, y: ny * canvas.height };
  for (let r = 1; r < 100; r++) {
    const step = r * 0.005;
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      const sx = nx + Math.cos(angle) * step;
      const sy = ny + Math.sin(angle) * step;
      if (getZone(sx, sy) === ZONE_ALLOWED) return { x: sx * canvas.width, y: sy * canvas.height };
    }
  }
  return { x: nx * canvas.width, y: ny * canvas.height };
}

let debugOverlay = null;

function buildDebugOverlay(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const zone = getZone(x / w, y / h);
      const idx = (y * w + x) * 4;
      img.data[idx]     = zone === ZONE_DEATH ? 255 : 0;
      img.data[idx + 1] = zone === ZONE_ALLOWED ? 255 : 0;
      img.data[idx + 2] = zone === ZONE_WALL ? 255 : 0;
      img.data[idx + 3] = 140;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function drawArenaBackground(ctx, canvas, showCollision) {
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (showCollision) {
    if (!debugOverlay) debugOverlay = buildDebugOverlay(COLLISION_W, COLLISION_H);
    ctx.drawImage(debugOverlay, 0, 0, canvas.width, canvas.height);
  }
}
