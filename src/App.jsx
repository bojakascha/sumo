import React, { useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import GameScreen from './components/GameScreen.jsx';
import './index.css';

export default function App() {
  const [screen, setScreen] = useState('start'); // 'start' | 'game'
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem('sumo-highscore')) || 0
  );

  function handleStart() {
    setScreen('game');
  }

  function handleGameOver(score) {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumo-highscore', score);
    }
  }

  function handleBack() {
    setScreen('start');
  }

  return screen === 'start' ? (
    <StartScreen onStart={handleStart} highScore={highScore} />
  ) : (
    <GameScreen onGameOver={handleGameOver} onBack={handleBack} />
  );
}
