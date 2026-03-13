export const defaults = {
  ballRadius: 0.08,
  tiltSensitivity: 0.03,
  friction: 0.96,
  maxSpeed: 6,
  bounceForce: 1.5,
};

let settings = { ...defaults };

export function getSettings() {
  return settings;
}

export function updateSettings(newSettings) {
  Object.assign(settings, newSettings);
}

export function createBall(canvas) {
  const radius = Math.min(canvas.width, canvas.height) * settings.ballRadius;
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    radius,
  };
}

export function updateBall(ball, tilt, canvas) {
  ball.vx += tilt.gamma * settings.tiltSensitivity;
  ball.vy += tilt.beta * settings.tiltSensitivity;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > settings.maxSpeed) {
    ball.vx = (ball.vx / speed) * settings.maxSpeed;
    ball.vy = (ball.vy / speed) * settings.maxSpeed;
  }

  ball.vx *= settings.friction;
  ball.vy *= settings.friction;

  ball.x += ball.vx;
  ball.y += ball.vy;

  ball.radius = Math.min(canvas.width, canvas.height) * settings.ballRadius;
}

export function applyBallCollision(ball, remoteBall) {
  if (!remoteBall) return;

  const dx = ball.x - remoteBall.x;
  const dy = ball.y - remoteBall.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + remoteBall.radius;

  if (dist >= minDist || dist === 0) return;

  // Normal from remote toward local
  const nx = dx / dist;
  const ny = dy / dist;

  // Push out of overlap
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  // Relative velocity: local minus remote
  const rvx = ball.vx - remoteBall.vx;
  const rvy = ball.vy - remoteBall.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  // Compute impulse from both approach speed and overlap pressure
  // velAlongNormal < 0 means approaching, > 0 means separating
  // We always apply at least a minimum push based on overlap to prevent sticking
  const approachImpulse = velAlongNormal < 0 ? -velAlongNormal * settings.bounceForce : 0;
  const overlapPush = overlap * 0.5;
  const totalImpulse = approachImpulse + overlapPush;

  ball.vx += totalImpulse * nx;
  ball.vy += totalImpulse * ny;
}

export function checkEdgeCollision(ball, canvas) {
  return (
    ball.x - ball.radius <= 0 ||
    ball.x + ball.radius >= canvas.width ||
    ball.y - ball.radius <= 0 ||
    ball.y + ball.radius >= canvas.height
  );
}
