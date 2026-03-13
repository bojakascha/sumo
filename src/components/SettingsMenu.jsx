import React, { useState } from 'react';
import { defaults, getSettings, updateSettings } from '../game/physics.js';

const PARAMS = [
  { key: 'ballRadius',       label: 'Ball Size',       min: 0.02, max: 0.2,  step: 0.01 },
  { key: 'tiltSensitivity',  label: 'Tilt Accel.',     min: 0.005,max: 0.1,  step: 0.005 },
  { key: 'friction',         label: 'Friction',        min: 0.8,  max: 1.0,  step: 0.005 },
  { key: 'maxSpeed',         label: 'Max Speed',       min: 1,    max: 20,   step: 0.5 },
  { key: 'bounceForce',      label: 'Bounce Force',    min: 0.5,  max: 5,    step: 0.1 },
  { key: 'pushForce',        label: 'Push Force',      min: 0.005, max: 0.1,  step: 0.005 },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => ({ ...getSettings() }));

  function handleChange(key, val) {
    const num = parseFloat(val);
    const next = { ...values, [key]: num };
    setValues(next);
    updateSettings(next);
  }

  function handleReset() {
    setValues({ ...defaults });
    updateSettings({ ...defaults });
  }

  return (
    <div style={styles.container}>
      <button style={styles.toggle} onClick={() => setOpen(!open)}>
        {open ? '▼' : '▲'} Settings
      </button>
      {open && (
        <div style={styles.panel}>
          {PARAMS.map(({ key, label, min, max, step }) => (
            <div key={key} style={styles.row}>
              <label style={styles.label}>{label}</label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                style={styles.slider}
              />
              <span style={styles.value}>{values[key].toFixed(3)}</span>
            </div>
          ))}
          <button style={styles.resetBtn} onClick={handleReset}>
            Reset Defaults
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 30,
    right: 8,
    zIndex: 100,
    pointerEvents: 'auto',
  },
  toggle: {
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid #444',
    color: '#ccc',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  panel: {
    background: 'rgba(10,10,30,0.92)',
    border: '1px solid #444',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    minWidth: 240,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#aaa',
    width: 80,
    flexShrink: 0,
    fontFamily: 'monospace',
  },
  slider: {
    flex: 1,
    accentColor: '#e94560',
    height: 4,
  },
  value: {
    fontSize: 11,
    color: '#888',
    width: 45,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  resetBtn: {
    marginTop: 4,
    background: 'transparent',
    border: '1px solid #555',
    color: '#888',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'monospace',
  },
};
