export const defaults = {
  ballRadius: 0.08,
  tiltSensitivity: 0.03,
  friction: 0.96,
  maxSpeed: 6,
  bounceForce: 1.2,      // elastic bounce on collision (velocity-based)
  pushForce: 0.01,       // sustained tilt-based push when in contact
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

export function applyBallCollision(ball, remoteBall, myTilt) {
  if (!remoteBall) return;

  const dx = ball.x - remoteBall.x;
  const dy = ball.y - remoteBall.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + remoteBall.radius;

  if (dist >= minDist || dist === 0) return;

  // Normal: remote -> local
  const nx = dx / dist;
  const ny = dy / dist;

  // Separate out of overlap
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  // 1) Bounce: proportional to approach speed
  const rvn = (ball.vx - remoteBall.vx) * nx + (ball.vy - remoteBall.vy) * ny;
  if (rvn < 0) {
    const impulse = -rvn * settings.bounceForce;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
  }

  // 2) Sustained push: tilt contest along contact axis
  // My push toward opponent (project my tilt onto -normal)
  const myPush = -(myTilt.gamma * nx + myTilt.beta * ny);
  // Their push toward me (project their tilt onto +normal)
  const theirPush = (remoteBall.tiltGamma || 0) * nx + (remoteBall.tiltBeta || 0) * ny;

  // Net force on local ball (positive = pushed back away from opponent)
  const netPush = (theirPush - myPush) * settings.pushForce;
  ball.vx += netPush * nx;
  ball.vy += netPush * ny;
}

export function checkEdgeCollision(ball, canvas) {
  return (
    ball.x - ball.radius <= 0 ||
    ball.x + ball.radius >= canvas.width ||
    ball.y - ball.radius <= 0 ||
    ball.y + ball.radius >= canvas.height
  );
}
