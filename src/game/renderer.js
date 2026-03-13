const ARENA_BORDER = 4;
const ARENA_BG = '#16213e';
const ARENA_BORDER_COLOR = '#e94560';

const BALL_COLORS = {
  player1: { main: '#e94560', highlight: '#ff6b81' },
  player2: { main: '#0f9b8e', highlight: '#45d9c9' },
};

function drawBall(ctx, ball, colors) {
  // shadow
  ctx.beginPath();
  ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // ball
  const grad = ctx.createRadialGradient(
    ball.x - ball.radius * 0.3,
    ball.y - ball.radius * 0.3,
    ball.radius * 0.1,
    ball.x,
    ball.y,
    ball.radius
  );
  grad.addColorStop(0, colors.highlight);
  grad.addColorStop(1, colors.main);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

export function drawFrame(ctx, canvas, ball, remoteBall, mySlot) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = ARENA_BG;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = ARENA_BORDER_COLOR;
  ctx.lineWidth = ARENA_BORDER;
  ctx.strokeRect(ARENA_BORDER / 2, ARENA_BORDER / 2, w - ARENA_BORDER, h - ARENA_BORDER);

  // Draw remote ball first (behind local)
  if (remoteBall) {
    const remoteSlot = mySlot === 'player1' ? 'player2' : 'player1';
    drawBall(ctx, remoteBall, BALL_COLORS[remoteSlot]);
  }

  drawBall(ctx, ball, BALL_COLORS[mySlot || 'player1']);
}

export function drawGameOver(ctx, canvas, score) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px system-ui';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

  ctx.font = '24px system-ui';
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

  ctx.font = '18px system-ui';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Tap to restart', canvas.width / 2, canvas.height / 2 + 60);
}
