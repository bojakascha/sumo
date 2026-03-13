// Default settings — overridden at runtime via settings menu
export const defaults = {
  ballRadius: 0.08,       // fraction of smaller screen dimension
  tiltSensitivity: 0.03,  // acceleration per degree of tilt
  friction: 0.96,         // velocity multiplier per frame (1 = no friction)
  maxSpeed: 6,            // pixels per frame
  bounceForce: 1.5,       // collision impulse multiplier
  mass: 1,                // ball mass (affects push dynamics)
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

  // Update radius live so settings changes take effect
  ball.radius = Math.min(canvas.width, canvas.height) * settings.ballRadius;
}

export function applyBallCollision(ball, remoteBall) {
  if (!remoteBall) return;

  const dx = ball.x - remoteBall.x;
  const dy = ball.y - remoteBall.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + remoteBall.radius;

  if (dist >= minDist || dist === 0) return;

  // Collision normal (from remote to local)
  const nx = dx / dist;
  const ny = dy / dist;

  // Separate balls so they don't overlap
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  // Relative velocity of local ball w.r.t. remote ball
  const rvx = ball.vx - (remoteBall.vx || 0);
  const rvy = ball.vy - (remoteBall.vy || 0);

  // Relative velocity along collision normal
  const velAlongNormal = rvx * nx + rvy * ny;

  // Only resolve if balls are moving toward each other
  if (velAlongNormal > 0) return;

  // Impulse based on relative velocity and bounce force
  const impulse = -velAlongNormal * settings.bounceForce;

  ball.vx += impulse * nx;
  ball.vy += impulse * ny;
}

export function checkEdgeCollision(ball, canvas) {
  return (
    ball.x - ball.radius <= 0 ||
    ball.x + ball.radius >= canvas.width ||
    ball.y - ball.radius <= 0 ||
    ball.y + ball.radius >= canvas.height
  );
}
