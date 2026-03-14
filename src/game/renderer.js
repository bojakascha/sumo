import { drawSphere, isTextureReady } from './sphereRenderer.js';

const ARENA_BORDER = 4;
const ARENA_BG = '#16213e';
const ARENA_BORDER_COLOR = '#e94560';

const BALL_COLORS = {
  player1: '#e94560',
  player2: '#0f9b8e',
};

export function drawArena(ctx, canvas) {
  ctx.fillStyle = ARENA_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ARENA_BORDER_COLOR;
  ctx.lineWidth = ARENA_BORDER;
  ctx.strokeRect(ARENA_BORDER / 2, ARENA_BORDER / 2, canvas.width - ARENA_BORDER, canvas.height - ARENA_BORDER);
}

export function drawBalls(ctx, ball, remoteBall, mySlot) {
  if (remoteBall) {
    const remoteSlot = mySlot === 'player1' ? 'player2' : 'player1';
    drawSphere(ctx, remoteBall, BALL_COLORS[remoteSlot]);
  }
  drawSphere(ctx, ball, BALL_COLORS[mySlot || 'player1']);
}

const RESULTS = {
  win:  { text: 'YOU WIN',  color: '#4ade80' },
  lose: { text: 'YOU LOSE', color: '#e94560' },
  draw: { text: 'DRAW',     color: '#fbbf24' },
};

export function drawResult(ctx, canvas, result, score) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const { text, color } = RESULTS[result];

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const badgeW = 280;
  const badgeH = 140;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2 - 10, badgeW, badgeH, 16);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2 - 10, badgeW, badgeH, 16);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px system-ui';
  ctx.fillText(text, cx, cy + 5);

  ctx.font = '20px system-ui';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`${score}`, cx, cy + 40);

  ctx.font = '16px system-ui';
  ctx.fillStyle = '#666';
  ctx.fillText('Tap to restart', cx, cy + badgeH / 2 + 20);
}
