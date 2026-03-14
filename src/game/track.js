// Track geometry derived from Track.md ASCII art
// Grid is 18 wide x 11 tall, normalized to 0-1

const GW = 18;
const GH = 11;
const n = (x, y) => [x / GW, y / GH]; // normalize

// Outer wall inner edge (clockwise)
const outerWall = [
  n(1, 1), n(17, 1),       // top
  n(17, 4), n(15, 4),      // right narrows
  n(15, 7), n(17, 7),      // right widens
  n(17, 10), n(1, 10),     // bottom
  n(1, 7), n(3, 7),        // left widens
  n(3, 4), n(1, 4),        // left narrows
];

// Inner island outer edge (clockwise)
const innerWall = [
  n(3, 2), n(15, 2),       // top
  n(14, 3), n(13, 4),      // top-right taper
  n(13, 7), n(14, 8),      // bottom-right taper
  n(15, 9), n(3, 9),       // bottom
  n(4, 8), n(5, 7),        // bottom-left taper
  n(5, 4), n(4, 3),        // top-left taper
];

// Start/finish line (horizontal, at bottom corridor)
const FINISH_Y = 9.5 / GH;
// Checkpoint (must cross top area before lap counts)
const CHECKPOINT_Y = 1.5 / GH;

// Start positions (normalized) — bottom corridor, side by side
const START_P1 = [7 / GW, 9.5 / GH];
const START_P2 = [11 / GW, 9.5 / GH];

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay };
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

function getWallSegments(wall) {
  const segs = [];
  for (let i = 0; i < wall.length; i++) {
    const a = wall[i];
    const b = wall[(i + 1) % wall.length];
    segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  return segs;
}

const allSegments = [...getWallSegments(outerWall), ...getWallSegments(innerWall)];

export function checkWallCollisions(ball, canvas) {
  const bx = ball.x / canvas.width;
  const by = ball.y / canvas.height;
  const rx = ball.radius / canvas.width;
  const ry = ball.radius / canvas.height;
  // Use average radius in normalized space
  const r = (rx + ry) / 2;

  for (const seg of allSegments) {
    const cp = closestPointOnSegment(bx, by, seg.ax, seg.ay, seg.bx, seg.by);
    const dx = bx - cp.x;
    const dy = by - cp.y;
    // Scale to account for non-square aspect ratio
    const dxPx = dx * canvas.width;
    const dyPx = dy * canvas.height;
    const dist = Math.hypot(dxPx, dyPx);

    if (dist < ball.radius && dist > 0.01) {
      const nx = dxPx / dist;
      const ny = dyPx / dist;

      // Push out
      const overlap = ball.radius - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Reflect only the normal component, preserve tangential (sliding)
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const restitution = 0.5; // 0 = no bounce, 1 = full bounce
        ball.vx -= (1 + restitution) * vn * nx;
        ball.vy -= (1 + restitution) * vn * ny;
      }
    }
  }
}

export function createLapTracker() {
  let passedCheckpoint = false;
  let lastY = null;
  let laps = 0;

  return {
    get laps() { return laps; },
    get passedCheckpoint() { return passedCheckpoint; },

    update(ball, canvas) {
      const by = ball.y / canvas.height;

      // Checkpoint: crossed top area
      if (by < CHECKPOINT_Y) {
        passedCheckpoint = true;
      }

      // Finish line: crossing downward past finish Y
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

export function getStartPosition(slot, canvas) {
  const pos = slot === 'player1' ? START_P1 : START_P2;
  return { x: pos[0] * canvas.width, y: pos[1] * canvas.height };
}

export function drawTrack(ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;

  // Background (out of bounds)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // Track surface (fill outer polygon)
  ctx.fillStyle = '#1e2d4a';
  ctx.beginPath();
  ctx.moveTo(outerWall[0][0] * w, outerWall[0][1] * h);
  for (let i = 1; i < outerWall.length; i++) {
    ctx.lineTo(outerWall[i][0] * w, outerWall[i][1] * h);
  }
  ctx.closePath();
  ctx.fill();

  // Inner island (cut out)
  ctx.fillStyle = '#0a0a1a';
  ctx.beginPath();
  ctx.moveTo(innerWall[0][0] * w, innerWall[0][1] * h);
  for (let i = 1; i < innerWall.length; i++) {
    ctx.lineTo(innerWall[i][0] * w, innerWall[i][1] * h);
  }
  ctx.closePath();
  ctx.fill();

  // Wall outlines
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(outerWall[0][0] * w, outerWall[0][1] * h);
  for (let i = 1; i < outerWall.length; i++) {
    ctx.lineTo(outerWall[i][0] * w, outerWall[i][1] * h);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(innerWall[0][0] * w, innerWall[0][1] * h);
  for (let i = 1; i < innerWall.length; i++) {
    ctx.lineTo(innerWall[i][0] * w, innerWall[i][1] * h);
  }
  ctx.closePath();
  ctx.stroke();

  // Start/finish line
  const finishY = FINISH_Y * h;
  const leftX = outerWall[7][0] * w;  // bottom-left inner edge
  const rightX = outerWall[6][0] * w; // bottom-right inner edge
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(leftX, finishY);
  ctx.lineTo(rightX, finishY);
  ctx.stroke();
  ctx.setLineDash([]);
}
