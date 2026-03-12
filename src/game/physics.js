const FRICTION = 0.96;
const TILT_SENSITIVITY = 0.03;
const MAX_SPEED = 6;
const BALL_RADIUS_RATIO = 0.08; // fraction of smaller screen dimension

export function createBall(canvas) {
  const radius = Math.min(canvas.width, canvas.height) * BALL_RADIUS_RATIO;
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    radius,
  };
}

export function updateBall(ball, tilt, canvas) {
  // tilt.gamma = left/right (-90..90), tilt.beta = front/back (-180..180)
  ball.vx += tilt.gamma * TILT_SENSITIVITY;
  ball.vy += tilt.beta * TILT_SENSITIVITY;

  // clamp speed
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx = (ball.vx / speed) * MAX_SPEED;
    ball.vy = (ball.vy / speed) * MAX_SPEED;
  }

  // apply friction
  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  // move
  ball.x += ball.vx;
  ball.y += ball.vy;
}

export function checkEdgeCollision(ball, canvas) {
  return (
    ball.x - ball.radius <= 0 ||
    ball.x + ball.radius >= canvas.width ||
    ball.y - ball.radius <= 0 ||
    ball.y + ball.radius >= canvas.height
  );
}
