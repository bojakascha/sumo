import React, { useRef, useEffect, useState, useCallback } from 'react';
import { startGame } from '../game/loop.js';

export default function GameScreen({ onGameOver, onBack }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setScore(0);
    setGameOver(false);

    gameRef.current = startGame(
      canvas,
      (s) => setScore(s),
      (finalScore) => {
        setGameOver(true);
        onGameOver(finalScore);
      },
      (t) => setTilt({ beta: t.beta, gamma: t.gamma })
    );
  }, [onGameOver]);

  useEffect(() => {
    initGame();

    function handleResize() {
      if (!gameOver && canvasRef.current) {
        if (gameRef.current) gameRef.current.destroy();
        initGame();
      }
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) gameRef.current.destroy();
    };
  }, [initGame]);

  function handleCanvasTap() {
    if (gameOver) {
      if (gameRef.current) gameRef.current.destroy();
      initGame();
    }
  }

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onClick={handleCanvasTap}
      />
      <div style={styles.hud}>
        <button style={styles.backBtn} onClick={onBack}>
          &#x2715;
        </button>
        <span style={styles.score}>{score}</span>
      </div>
      {/* Debug tilt indicator */}
      <div style={styles.debug}>
        β:{tilt.beta.toFixed(1)} γ:{tilt.gamma.toFixed(1)}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    inset: 0,
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  hud: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    pointerEvents: 'none',
  },
  backBtn: {
    pointerEvents: 'auto',
    background: 'rgba(0,0,0,0.4)',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    width: 40,
    height: 40,
    borderRadius: '50%',
    cursor: 'pointer',
  },
  score: {
    fontSize: 32,
    fontWeight: 900,
    color: '#fff',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  debug: {
    position: 'fixed',
    bottom: 12,
    left: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
    pointerEvents: 'none',
  },
};
