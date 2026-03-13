import { createBall, updateBall, checkEdgeCollision, applyBallCollision, getSettings } from './physics.js';
import { drawFrame, drawResult } from './renderer.js';
import { sendState, onRemotePosition } from './multiplayer.js';

export function startGame(canvas, onScoreUpdate, onGameEnd, onTiltUpdate, mySlot) {
  const ctx = canvas.getContext('2d');
  let ball = createBall(canvas);
  let tilt = { beta: 0, gamma: 0 };
  let running = true;
  let startTime = Date.now();
  let animId;
  const keys = {};

  let remoteBall = null;
  let remoteDead = false;
  let localDead = false;

  if (mySlot) {
    onRemotePosition((data) => {
      if (data) {
        const s = getSettings();
        remoteBall = {
          x: data.x * canvas.width,
          y: data.y * canvas.height,
          vx: (data.vx || 0) * canvas.width,
          vy: (data.vy || 0) * canvas.height,
          tiltBeta: data.tb || 0,
          tiltGamma: data.tg || 0,
          radius: Math.min(canvas.width, canvas.height) * s.ballRadius,
        };
        if (data.dead && !remoteDead) {
          remoteDead = true;
          if (!localDead) {
            running = false;
            const score = Math.floor((Date.now() - startTime) / 100);
            drawFrame(ctx, canvas, ball, remoteBall, mySlot);
            drawResult(ctx, canvas, 'win', score);
            onGameEnd(score);
          }
        }
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
    applyBallCollision(ball, remoteBall, tilt);

    if (mySlot) {
      sendCounter++;
      if (sendCounter % 3 === 0) {
        sendState(
          ball.x / canvas.width, ball.y / canvas.height,
          ball.vx / canvas.width, ball.vy / canvas.height,
          tilt.beta, tilt.gamma,
          localDead
        );
      }
    }

    const score = Math.floor((Date.now() - startTime) / 100);
    onScoreUpdate(score);

    if (checkEdgeCollision(ball, canvas)) {
      localDead = true;
      running = false;
      if (mySlot) sendState(
        ball.x / canvas.width, ball.y / canvas.height,
        ball.vx / canvas.width, ball.vy / canvas.height,
        tilt.beta, tilt.gamma,
        true
      );

      drawFrame(ctx, canvas, ball, remoteBall, mySlot);
      const result = remoteDead ? 'draw' : 'lose';
      drawResult(ctx, canvas, result, score);
      onGameEnd(score);
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
      return startGame(canvas, onScoreUpdate, onGameEnd, onTiltUpdate, mySlot);
    },
  };
}
