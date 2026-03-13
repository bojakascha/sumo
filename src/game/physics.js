export const defaults = {
  ballRadius: 0.08,
  tiltSensitivity: 0.03,
  friction: 0.96,
  maxSpeed: 6,
  bounceForce: 1.5,
  pushForce: 0.15,       // how much tilt advantage translates to contact push
  contactDamping: 0.4,   // how much velocity along normal is killed on contact (0-1)
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

  // Normal from remote toward local
  const nx = dx / dist;
  const ny = dy / dist;

  // Push out of overlap
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  // Relative velocity along normal
  const rvx = ball.vx - remoteBall.vx;
  const rvy = ball.vy - remoteBall.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  // How fast are we approaching?
  const approachSpeed = Math.max(0, -velAlongNormal);

  if (approachSpeed > 2) {
    // Fast collision: bounce (glancing hit / ram)
    const impulse = approachSpeed * settings.bounceForce;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;
  } else {
    // Slow / sustained contact: sumo push contest
    // Damp velocity along contact normal (absorb into contact)
    if (velAlongNormal < 0) {
      ball.vx -= velAlongNormal * nx * settings.contactDamping;
      ball.vy -= velAlongNormal * ny * settings.contactDamping;
    }

    // My tilt force toward opponent (along -normal)
    const myForceX = myTilt.gamma * settings.tiltSensitivity;
    const myForceY = myTilt.beta * settings.tiltSensitivity;
    const myPush = -(myForceX * nx + myForceY * ny); // positive = pushing toward them

    // Their tilt force toward me (along +normal)
    const remoteTiltG = remoteBall.tiltGamma || 0;
    const remoteTiltB = remoteBall.tiltBeta || 0;
    const theirForceX = remoteTiltG * settings.tiltSensitivity;
    const theirForceY = remoteTiltB * settings.tiltSensitivity;
    const theirPush = theirForceX * nx + theirForceY * ny; // positive = pushing toward me

    // Net force on me: positive = I get pushed back
    const netForce = (theirPush - myPush) * settings.pushForce / settings.tiltSensitivity;
    ball.vx += netForce * nx;
    ball.vy += netForce * ny;

    // Minimum overlap repulsion to prevent sticking
    ball.vx += nx * overlap * 0.3;
    ball.vy += ny * overlap * 0.3;
  }
}

export function checkEdgeCollision(ball, canvas) {
  return (
    ball.x - ball.radius <= 0 ||
    ball.x + ball.radius >= canvas.width ||
    ball.y - ball.radius <= 0 ||
    ball.y + ball.radius >= canvas.height
  );
}
