import React, { useState } from 'react';

export default function StartScreen({ onStart, highScore }) {
  const [permGranted, setPermGranted] = useState(false);
  const [permError, setPermError] = useState(false);

  async function requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result === 'granted') {
          setPermGranted(true);
          setPermError(false);
        } else {
          setPermError(true);
        }
      } catch {
        setPermError(true);
      }
    } else {
      setPermGranted(true);
    }
  }

  function handlePlay(mode) {
    if (!permGranted) {
      requestPermission().then(() => {
        onStart(mode);
      });
    } else {
      onStart(mode);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>SUMO</h1>
      <p style={styles.subtitle}>Tilt to roll. Push or race.</p>

      {highScore > 0 && (
        <p style={styles.highScore}>Best: {highScore}</p>
      )}

      {!permGranted && (
        <button style={styles.button} onClick={requestPermission}>
          Enable Motion Sensor
        </button>
      )}

      {permError && (
        <p style={styles.error}>
          Motion permission denied. Check your browser settings.
        </p>
      )}

      <div style={styles.modes}>
        <button
          style={{ ...styles.button, ...styles.playButton }}
          onClick={() => handlePlay('sumo')}
        >
          SUMO
        </button>
        <button
          style={{ ...styles.button, ...styles.raceButton }}
          onClick={() => handlePlay('race')}
        >
          RACE
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: 72,
    fontWeight: 900,
    color: '#e94560',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 24,
  },
  highScore: {
    fontSize: 16,
    color: '#888',
  },
  button: {
    padding: '14px 40px',
    fontSize: 18,
    fontWeight: 700,
    border: '2px solid #e94560',
    borderRadius: 8,
    background: 'transparent',
    color: '#e94560',
    cursor: 'pointer',
  },
  modes: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
  },
  playButton: {
    background: '#e94560',
    color: '#fff',
  },
  raceButton: {
    background: '#0f9b8e',
    color: '#fff',
    borderColor: '#0f9b8e',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
};
