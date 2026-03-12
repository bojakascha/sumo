import { createBall, updateBall, checkEdgeCollision } from './physics.js';
import { drawFrame, drawGameOver } from './renderer.js';

export function startGame(canvas, onScoreUpdate, onGameOver, onTiltUpdate) {
  const ctx = canvas.getContext('2d');
  let ball = createBall(canvas);
  let tilt = { beta: 0, gamma: 0 };
  let running = true;
  let startTime = Date.now();
  let animId;
  const keys = {};

  function handleOrientation(e) {
    console.log('deviceorientation event:', e.alpha, e.beta, e.gamma);
    tilt.beta = Math.max(-45, Math.min(45, e.beta || 0));
    tilt.gamma = Math.max(-45, Math.min(45, e.gamma || 0));
  }

  // Test if event is supported at all
  window.addEventListener('deviceorientation', () => {
    console.log('deviceorientation listener fired (one-time check)');
  }, { once: true });

  function handleKeyDown(e) {
    keys[e.key] = true;
    e.preventDefault();
  }

  function handleKeyUp(e) {
    keys[e.key] = false;
  }

  window.addEventListener('deviceorientation', handleOrientation);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  function tick() {
    if (!running) return;

    // Keyboard adds on top of sensor values
    const KB_TILT = 0.5;
    if (keys['ArrowUp']) tilt.beta = -KB_TILT;
    if (keys['ArrowDown']) tilt.beta = KB_TILT;
    if (keys['ArrowLeft']) tilt.gamma = -KB_TILT;
    if (keys['ArrowRight']) tilt.gamma = KB_TILT;

    if (onTiltUpdate) onTiltUpdate(tilt);

    updateBall(ball, tilt, canvas);

    const score = Math.floor((Date.now() - startTime) / 100);
    onScoreUpdate(score);

    if (checkEdgeCollision(ball, canvas)) {
      running = false;
      drawFrame(ctx, canvas, ball);
      drawGameOver(ctx, canvas, score);
      onGameOver(score);
      return;
    }

    drawFrame(ctx, canvas, ball);
    animId = requestAnimationFrame(tick);
  }

  animId = requestAnimationFrame(tick);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
    restart() {
      this.destroy();
      return startGame(canvas, onScoreUpdate, onGameOver, onTiltUpdate);
    },
  };
}
