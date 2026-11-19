/**
 * Main Application Component for Goviin Gants Ail
 * Connects Three.js isolated canvas mount with reactive HUD overlay
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameManager } from './game/GameManager';
import { HUD } from './game/ui/HUD';
import { GamePhase, GameSettings, PlayerStats } from './game/types';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  const [phase, setPhase] = useState<GamePhase>('MAIN_MENU');
  const [wakeProgress, setWakeProgress] = useState(0);
  const [revealProgress, setRevealProgress] = useState(0);

  const [settings, setSettings] = useState<GameSettings>({
    masterVolume: 0.85,
    musicVolume: 0.85,
    sfxVolume: 0.9,
    mouseSensitivity: 1.2,
    graphicsQuality: 'high',
  });

  const [stats, setStats] = useState<PlayerStats>({
    stamina: 120,
    maxStamina: 120,
    isSprinting: false,
    isExhausted: false,
    inWater: false,
    distanceToDemon: 265,
    distanceToRiver: 300,
    canInteractDoor: false,
    isDoorOpen: false,
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const gm = new GameManager(mountRef.current, {
      onPhaseChange: (newPhase) => setPhase(newPhase),
      onStatsUpdate: (newStats) => setStats(newStats),
      onWakeProgress: (prog) => setWakeProgress(prog),
      onDemonRevealProgress: (prog) => setRevealProgress(prog),
    });

    gameManagerRef.current = gm;

    return () => {
      gm.destroy();
      gameManagerRef.current = null;
    };
  }, []);

  const handleStart = () => {
    gameManagerRef.current?.startGame();
  };

  const handleOpenDoor = () => {
    gameManagerRef.current?.openDoor();
  };

  const handleResume = () => {
    gameManagerRef.current?.togglePause();
  };

  const handleRestart = () => {
    gameManagerRef.current?.restartGame();
  };

  const handleMainMenu = () => {
    gameManagerRef.current?.returnToMainMenu();
  };

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      gameManagerRef.current?.updateSettings(updated);
      return updated;
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070c] select-none">
      {/* Three.js Isolated Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Low-Occlusion HUD Overlay */}
      <HUD
        phase={phase}
        stats={stats}
        wakeProgress={wakeProgress}
        revealProgress={revealProgress}
        settings={settings}
        onStart={handleStart}
        onOpenDoor={handleOpenDoor}
        onResume={handleResume}
        onRestart={handleRestart}
        onMainMenu={handleMainMenu}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
