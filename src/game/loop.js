import { createBall, updateBall, checkEdgeCollision } from './physics.js';
import { drawFrame, drawGameOver } from './renderer.js';
import { sendPosition, onRemotePosition } from './multiplayer.js';

export function startGame(canvas, onScoreUpdate, onGameOver, onTiltUpdate, mySlot) {
  const ctx = canvas.getContext('2d');
  let ball = createBall(canvas);
  let tilt = { beta: 0, gamma: 0 };
  let running = true;
  let startTime = Date.now();
  let animId;
  const keys = {};

  // Remote player state
  let remoteBall = null;

  if (mySlot) {
    onRemotePosition((data) => {
      if (data) {
        // Convert normalized 0-1 coords to local canvas size
        remoteBall = {
          x: data.x * canvas.width,
          y: data.y * canvas.height,
          radius: ball.radius,
        };
      } else {
        remoteBall = null;
      }
    });
  }

  function handleOrientation(e) {
    tilt.beta = Math.max(-45, Math.min(45, e.beta || 0));
    tilt.gamma = Math.max(-45, Math.min(45, e.gamma || 0));
  }

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

  let sendCounter = 0;

  function tick() {
    if (!running) return;

    const KB_TILT = 0.5;
    if (keys['ArrowUp']) tilt.beta = -KB_TILT;
    if (keys['ArrowDown']) tilt.beta = KB_TILT;
    if (keys['ArrowLeft']) tilt.gamma = -KB_TILT;
    if (keys['ArrowRight']) tilt.gamma = KB_TILT;

    if (onTiltUpdate) onTiltUpdate(tilt);

    updateBall(ball, tilt, canvas);

    // Send position to Firebase every 3rd frame (~20hz) to reduce writes
    if (mySlot) {
      sendCounter++;
      if (sendCounter % 3 === 0) {
        sendPosition(ball.x / canvas.width, ball.y / canvas.height);
      }
    }

    const score = Math.floor((Date.now() - startTime) / 100);
    onScoreUpdate(score);

    if (checkEdgeCollision(ball, canvas)) {
      running = false;
      drawFrame(ctx, canvas, ball, remoteBall, mySlot);
      drawGameOver(ctx, canvas, score);
      onGameOver(score);
      return;
    }

    drawFrame(ctx, canvas, ball, remoteBall, mySlot);
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
      return startGame(canvas, onScoreUpdate, onGameOver, onTiltUpdate, mySlot);
    },
  };
}
