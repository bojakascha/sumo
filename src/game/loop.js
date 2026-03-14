import { createBall, updateBall, checkEdgeCollision, applyBallCollision, getSettings } from './physics.js';
import { drawArena, drawBalls, drawResult } from './renderer.js';
import { drawTrack, checkWallCollisions, createLapTracker, getStartPosition } from './track.js';
import { sendState, onRemotePosition } from './multiplayer.js';

const RACE_LAPS = 3;

export function startGame(canvas, callbacks, mySlot, mode) {
  const { onScoreUpdate, onGameEnd, onTiltUpdate, onLapUpdate } = callbacks;
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
  let remoteLaps = 0;

  const lapTracker = mode === 'race' ? createLapTracker() : null;

  // Position balls at start line in race mode
  if (mode === 'race') {
    const start = getStartPosition(mySlot || 'player1', canvas);
    ball.x = start.x;
    ball.y = start.y;
  }

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
        if (mode === 'race' && data.laps !== undefined) {
          remoteLaps = data.laps;
          if (remoteLaps >= RACE_LAPS && !localDead) {
            // They won the race
            running = false;
            drawScene();
            drawResult(ctx, canvas, 'lose', `${remoteLaps} laps`);
            onGameEnd(0);
          }
        }
        if (data.dead && !remoteDead) {
          remoteDead = true;
          if (!localDead && mode === 'sumo') {
            running = false;
            const score = Math.floor((Date.now() - startTime) / 100);
            drawScene();
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

  function drawScene() {
    if (mode === 'race') {
      drawTrack(ctx, canvas);
    } else {
      drawArena(ctx, canvas);
    }
    drawBalls(ctx, ball, remoteBall, mySlot);
  }

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

    if (mode === 'race') {
      // Bounce off track walls
      checkWallCollisions(ball, canvas);

      // Lap tracking
      lapTracker.update(ball, canvas);
      if (onLapUpdate) onLapUpdate(lapTracker.laps, lapTracker.passedCheckpoint);

      if (lapTracker.laps >= RACE_LAPS) {
        running = false;
        if (mySlot) sendState(
          ball.x / canvas.width, ball.y / canvas.height,
          ball.vx / canvas.width, ball.vy / canvas.height,
          tilt.beta, tilt.gamma, false, lapTracker.laps
        );
        drawScene();
        drawResult(ctx, canvas, 'win', `${RACE_LAPS} laps`);
        onGameEnd(1);
        return;
      }
    }

    // Send state to Firebase
    if (mySlot) {
      sendCounter++;
      if (sendCounter % 3 === 0) {
        sendState(
          ball.x / canvas.width, ball.y / canvas.height,
          ball.vx / canvas.width, ball.vy / canvas.height,
          tilt.beta, tilt.gamma, localDead,
          mode === 'race' ? lapTracker.laps : undefined
        );
      }
    }

    // Sumo mode: edge = death
    if (mode === 'sumo') {
      const score = Math.floor((Date.now() - startTime) / 100);
      onScoreUpdate(score);

      if (checkEdgeCollision(ball, canvas)) {
        localDead = true;
        running = false;
        if (mySlot) sendState(
          ball.x / canvas.width, ball.y / canvas.height,
          ball.vx / canvas.width, ball.vy / canvas.height,
          tilt.beta, tilt.gamma, true
        );
        drawScene();
        const result = remoteDead ? 'draw' : 'lose';
        drawResult(ctx, canvas, result, score);
        onGameEnd(score);
        return;
      }
    }

    drawScene();
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
      return startGame(canvas, callbacks, mySlot, mode);
    },
  };
}
