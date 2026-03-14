import React, { useRef, useEffect, useState, useCallback } from 'react';
import { startGame } from '../game/loop.js';
import { joinGame, leaveGame } from '../game/multiplayer.js';
import { loadTrackImages } from '../game/imageTrack.js';
import { loadArenaImages } from '../game/imageArena.js';
import { loadSphereTexture } from '../game/sphereRenderer.js';
import SettingsMenu from './SettingsMenu.jsx';

export default function GameScreen({ onGameOver, onBack, mode }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const slotRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [tilt, setTilt] = useState({ beta: 0, gamma: 0 });
  const [status, setStatus] = useState('Connecting...');
  const [lapInfo, setLapInfo] = useState({ laps: 0, checkpoint: false });

  const initGame = useCallback((slot) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    setScore(0);
    setGameOver(false);
    setLapInfo({ laps: 0, checkpoint: false });

    gameRef.current = startGame(
      canvas,
      {
        onScoreUpdate: (s) => setScore(s),
        onGameEnd: (finalScore) => {
          setGameOver(true);
          onGameOver(finalScore);
        },
        onTiltUpdate: (t) => setTilt({ beta: t.beta, gamma: t.gamma }),
        onLapUpdate: (laps, checkpoint) => setLapInfo({ laps, checkpoint }),
      },
      slot,
      mode
    );
  }, [onGameOver, mode]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setStatus('Loading...');
      const textureSrc = (import.meta.env.BASE_URL || '/') + 'sumo_ball_texture.png';
      await loadSphereTexture(textureSrc).catch(() => {});
      if (mode === 'race') {
        await loadTrackImages();
      } else if (mode === 'sumo') {
        await loadArenaImages();
      }
      const { slot, error } = await joinGame();
      if (cancelled) return;
      if (error) {
        setStatus(error);
        return;
      }
      slotRef.current = slot;
      setStatus(`Joined as ${slot}`);
      initGame(slot);
    }
    init();

    return () => {
      cancelled = true;
      leaveGame();
      if (gameRef.current) gameRef.current.destroy();
    };
  }, [initGame]);

  function handleCanvasTap() {
    if (gameOver && slotRef.current) {
      if (gameRef.current) gameRef.current.destroy();
      initGame(slotRef.current);
    }
  }

  function handleBack() {
    leaveGame();
    onBack();
  }

  return (
    <div style={styles.wrapper}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onClick={handleCanvasTap}
      />
      <div style={styles.hud}>
        <button style={styles.backBtn} onClick={handleBack}>
          &#x2715;
        </button>
        <div style={styles.hudRight}>
          {mode === 'race' ? (
            <span style={styles.score}>
              Lap {lapInfo.laps}/3
              {lapInfo.checkpoint ? ' ✓' : ''}
            </span>
          ) : (
            <span style={styles.score}>{score}</span>
          )}
        </div>
      </div>
      <div style={styles.debug}>
        {status} | β:{tilt.beta.toFixed(1)} γ:{tilt.gamma.toFixed(1)}
      </div>
      <SettingsMenu />
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
  hudRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
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
