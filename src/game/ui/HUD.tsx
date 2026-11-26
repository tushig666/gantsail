/**
 * Goviin Gants Ail - Cinematic Horror UI & HUD
 * Matches the dark folk-horror visual identity in English across all states:
 * - Gameplay HUD: Top-right objective & red demon distance, bottom-left stamina,
 *   bottom-right keycaps, center door prompt (no top-left title during gameplay).
 * - Main Menu: Full-screen moonlit ger interior with slow drift, dust motes,
 *   aged serif lockup, and bespoke dark hairline controls.
 * - Death, Survival Ending, Pause, Settings, and How To Play screens.
 */

import React, { useEffect, useState } from 'react';
import { GamePhase, GameSettings, GraphicsQuality, PlayerStats } from '../types';
import { Play, RotateCcw, HelpCircle, SlidersHorizontal, Home, X } from 'lucide-react';

interface HUDProps {
  phase: GamePhase;
  stats: PlayerStats;
  wakeProgress: number;
  revealProgress: number;
  settings: GameSettings;
  onStart: () => void;
  onOpenDoor: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

const DUST_MOTES = [
  { left: '42%', top: '62%', size: 2, duration: '15s', delay: '0s' },
  { left: '48%', top: '70%', size: 1.5, duration: '18s', delay: '-4s' },
  { left: '53%', top: '56%', size: 2, duration: '13s', delay: '-7s' },
  { left: '46%', top: '44%', size: 1.5, duration: '16s', delay: '-2s' },
  { left: '57%', top: '66%', size: 2.5, duration: '20s', delay: '-9s' },
  { left: '39%', top: '52%', size: 1.5, duration: '14s', delay: '-5s' },
  { left: '51%', top: '38%', size: 2, duration: '17s', delay: '-11s' },
];

export const HUD: React.FC<HUDProps> = ({
  phase,
  stats,
  wakeProgress,
  settings,
  onStart,
  onResume,
  onRestart,
  onMainMenu,
  onUpdateSettings,
}) => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuBgError, setMenuBgError] = useState(false);

  const isPlaying =
    phase === 'GER_EXPLORATION' ||
    phase === 'DEMON_REVEAL' ||
    phase === 'CHASE' ||
    phase === 'RIVER_CROSSING';

  // Ensure mouse cursor is unlocked whenever a menu or end screen is shown
  useEffect(() => {
    if (
      phase === 'MAIN_MENU' ||
      phase === 'PAUSED' ||
      phase === 'JUMPSCARE' ||
      phase === 'CAUGHT' ||
      phase === 'SURVIVED'
    ) {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
    if (isPlaying) {
      setShowHowToPlay(false);
      setShowSettings(false);
    }
  }, [phase, isPlaying]);

  // Keyboard shortcuts for modals & main menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showHowToPlay) {
          setShowHowToPlay(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
      }
      if (
        phase === 'MAIN_MENU' &&
        !showHowToPlay &&
        !showSettings &&
        e.code === 'Enter'
      ) {
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showHowToPlay, showSettings, onStart]);

  const staminaPercent = Math.max(
    0,
    Math.min(100, (stats.stamina / (stats.maxStamina || 1)) * 100)
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* ============================================================== */}
      {/* 1. TOP-RIGHT: OBJECTIVE & DYNAMIC PROXIMITY HUD                */}
      {/* ============================================================== */}
      {isPlaying && (
        <div className="absolute top-6 right-7 pointer-events-none z-30 flex flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular tracking-[0.18em] text-[#c2c7cf]/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.92)]">
            <svg
              className="w-2.5 h-2.5 text-[#b8bec8]/80 shrink-0"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <rect
                x="6"
                y="1.2"
                width="6.8"
                height="6.8"
                transform="rotate(45 6 1.2)"
                fill="rgba(184,190,200,0.12)"
                stroke="currentColor"
              />
              <circle cx="6" cy="6" r="0.85" fill="currentColor" />
            </svg>

            <span className="font-normal text-[#b7bdc7]/85">
              REACH THE RIVER
            </span>
            <span className="text-[#666d78]/80">•</span>
            <span className="font-medium text-[#d8dce2]/90">
              {Math.max(0, Math.round(stats.distanceToRiver))} m
            </span>
          </div>

          {(phase === 'CHASE' || phase === 'RIVER_CROSSING') && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular tracking-[0.18em] text-[#a3383b]/90 pr-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              <span>DEMON</span>
              <span className="text-[#66282a]/85">•</span>
              <span className="font-medium">
                {Math.max(0, Math.round(stats.distanceToDemon))} m
              </span>
            </div>
          )}

          {stats.inWater && (
            <div className="text-[9px] font-mono-tabular tracking-[0.22em] text-[#7c90a6]/75 pr-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              IN WATER
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. BOTTOM-LEFT: STAMINA HUD                                    */}
      {/* ============================================================== */}
      {isPlaying && (
        <div className="absolute bottom-7 left-7 pointer-events-none z-30 flex items-center gap-2.5">
          <div className="shrink-0 text-[#bec4cd]/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="17" cy="4" r="2" />
              <path d="M15 9l-4 3 2 4 4 1" />
              <path d="M9 14l-4 4" />
              <path d="M11 7l-4 3 1 3" />
            </svg>
          </div>

          <div className="flex flex-col gap-1.5 w-36 sm:w-44">
            <span
              className={`text-[9px] tracking-[0.24em] font-mono-tabular uppercase leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
                stats.isExhausted ? 'text-[#a3383b]/90' : 'text-[#b5bcc6]/75'
              }`}
            >
              {stats.isExhausted ? 'EXHAUSTED' : 'STAMINA'}
            </span>

            <div className="w-full h-[2px] bg-[#0a0d12]/65 ring-1 ring-[#6c7482]/25 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  stats.isExhausted ? 'bg-[#943134]/90' : 'bg-[#c9ced6]/80'
                }`}
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. BOTTOM-RIGHT: CONTROL KEYCAPS                               */}
      {/* ============================================================== */}
      {isPlaying && (
        <div className="absolute bottom-7 right-7 pointer-events-none z-30 flex flex-col items-end gap-1.5 text-right">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {['W', 'A', 'S', 'D'].map((key) => (
                <span
                  key={key}
                  className="min-w-[17px] h-[17px] px-1 flex items-center justify-center font-mono-tabular text-[9px] font-medium text-[#c5cbd3]/80 bg-[#05070b]/25 border border-[#727a87]/35 rounded-[1px]"
                >
                  {key}
                </span>
              ))}
            </div>
            <span className="text-[9.5px] font-mono-tabular tracking-[0.18em] text-[#98a0ac]/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              MOVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-[17px] px-1.5 flex items-center justify-center font-mono-tabular text-[8.5px] font-medium tracking-wider text-[#c5cbd3]/80 bg-[#05070b]/25 border border-[#727a87]/35 rounded-[1px]">
              SHIFT
            </span>
            <span className="text-[9.5px] font-mono-tabular tracking-[0.18em] text-[#98a0ac]/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              SPRINT
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="min-w-[17px] h-[17px] px-1 flex items-center justify-center font-mono-tabular text-[9px] font-medium text-[#c5cbd3]/80 bg-[#05070b]/25 border border-[#727a87]/35 rounded-[1px]">
              E
            </span>
            <span className="text-[9.5px] font-mono-tabular tracking-[0.18em] text-[#98a0ac]/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              OPEN DOOR
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CENTER: CONTEXTUAL INTERACTION PROMPT & CROSSHAIR           */}
      {/* ============================================================== */}
      {stats.canInteractDoor && isPlaying && (
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 animate-fade-in">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] font-mono-tabular text-[#d2d6dd]/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#05070b]/35 text-[#dce0e6]/90 border border-[#848d9b]/45 rounded-[1px] text-[9.5px] font-medium">
                E
              </span>
              <span>OPEN DOOR</span>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#7d8694]/35 to-transparent" />
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
          <div className="w-1 h-1 rounded-full bg-[#c9d0db]" />
        </div>
      )}


      {/* ============================================================== */}
      {/* 5. EYE-OPENING WAKE UP OVERLAY                                 */}
      {/* ============================================================== */}
      {phase === 'WAKE_UP' && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <div
            className="absolute top-0 left-0 right-0 bg-[#020306] transition-all ease-out"
            style={{
              height: `${Math.max(0, (1 - wakeProgress) * 55)}%`,
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#020306] transition-all ease-out"
            style={{
              height: `${Math.max(0, (1 - wakeProgress) * 55)}%`,
            }}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CINEMATIC HORROR MAIN MENU                                  */}
      {/* ============================================================== */}
      {phase === 'MAIN_MENU' && (
        <div className="absolute inset-0 bg-[#030508] pointer-events-auto z-40 overflow-hidden animate-fade-in">
          {/* Full-screen Atmospheric Reference Image */}
          {!menuBgError && (
            <img
              src="/assets/aistudio/goviin_gants_ail_ger_dotorh_7489a7fb.png"
              alt="Moonlit Mongolian Ger Interior"
              referrerPolicy="no-referrer"
              onError={() => setMenuBgError(true)}
              className="absolute inset-0 w-full h-full object-cover object-center animate-slow-drift opacity-85"
            />
          )}

          {/* Corner & Edge Vignette Scrims (masking corners while framing moonlit interior) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 64% 66% at 54% 46%, rgba(4,7,12,0.12) 0%, rgba(4,7,12,0.58) 54%, rgba(2,3,6,0.97) 92%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(2,3,6,0.94) 0%, rgba(3,5,9,0.78) 34%, rgba(3,5,9,0.22) 68%, rgba(2,3,6,0.78) 100%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(2,3,6,0.82) 0%, transparent 24%, transparent 72%, rgba(2,3,6,0.94) 100%)',
            }}
          />

          {/* Subtle Moonlight Dust Motes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {DUST_MOTES.map((mote, index) => (
              <span
                key={index}
                className="absolute rounded-full bg-[#dfe6f0] animate-dust-float"
                style={
                  {
                    left: mote.left,
                    top: mote.top,
                    width: `${mote.size}px`,
                    height: `${mote.size}px`,
                    '--dust-duration': mote.duration,
                    '--dust-delay': mote.delay,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Left-Aligned Cinematic Menu Composition */}
          <div className="relative z-10 h-full w-full flex flex-col justify-between px-8 sm:px-16 md:px-24 py-10 sm:py-14">
            {/* Top Subtle Classification Line */}
            <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-mono-tabular tracking-[0.32em] text-[#8d96a3] uppercase">
              <span className="w-6 h-px bg-[#8f2424]" />
              <span>GOBI STEPPE • PSYCHOLOGICAL FOLK HORROR</span>
            </div>

            {/* Centerpiece Lockup & Menu Navigation */}
            <div className="max-w-xl space-y-8 my-auto">
              <div className="space-y-4">
                <h1 className="font-cinzel flex flex-col leading-[0.95] tracking-[0.14em]">
                  <span
                    className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold text-[#eae5da]"
                    style={{
                      textShadow:
                        '0 2px 18px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8)',
                    }}
                  >
                    GOVIIN
                  </span>

                  <span className="flex flex-wrap items-baseline gap-x-4 mt-1.5">
                    <span
                      className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold text-[#eae5da]"
                      style={{
                        textShadow:
                          '0 2px 18px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8)',
                      }}
                    >
                      GANTS
                    </span>

                    <span className="relative inline-flex items-center">
                      <span
                        className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold text-[#b82020]"
                        style={{
                          textShadow:
                            '0 0 22px rgba(155,20,20,0.65), 0 4px 14px rgba(0,0,0,0.98)',
                        }}
                      >
                        AIL
                      </span>
                      <span className="absolute left-[-6px] right-[-8px] top-[52%] h-[2px] bg-[#b82020]/90 pointer-events-none -rotate-1 shadow-[0_0_8px_rgba(165,20,20,0.9)]" />
                    </span>
                  </span>
                </h1>

                <div className="w-40 h-px bg-gradient-to-r from-[#8f2424] via-[#4a5260]/60 to-transparent" />

                <p className="text-xs sm:text-sm text-[#a6adb8] max-w-md leading-relaxed tracking-wide font-normal">
                  Wake alone beneath the full moon. Unlatch the wooden door only
                  if you are ready to run for the river.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-start gap-3 pt-1 w-full max-w-[260px]">
                <button
                  onClick={onStart}
                  className="group relative w-full py-3.5 px-5 bg-[#0b0f17]/90 hover:bg-[#141b28] text-[#ebe7de] border border-[#3e4756] hover:border-[#9e2828] rounded-[2px] text-xs font-mono-tabular tracking-[0.26em] uppercase transition-all duration-200 flex items-center justify-between cursor-pointer shadow-[0_8px_28px_rgba(0,0,0,0.85)]"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-[#9e2828] opacity-80 group-hover:opacity-100 transition-opacity" />
                  <span className="flex items-center gap-3">
                    <Play className="w-3.5 h-3.5 text-[#c73434] fill-current" />
                    <span>START</span>
                  </span>
                  <span className="text-[10px] text-[#6d7685] group-hover:text-[#b8bec9] transition-colors">
                    ENTER
                  </span>
                </button>

                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full py-3 px-5 bg-[#070a10]/85 hover:bg-[#101621] text-[#b4bac4] hover:text-[#eae5da] border border-[#242b36] hover:border-[#4b5566] rounded-[2px] text-xs font-mono-tabular tracking-[0.24em] uppercase transition-all duration-200 flex items-center gap-3 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#7e8796]" />
                  <span>SETTINGS</span>
                </button>

                <button
                  onClick={() => setShowHowToPlay(true)}
                  className="w-full py-3 px-5 bg-[#070a10]/85 hover:bg-[#101621] text-[#b4bac4] hover:text-[#eae5da] border border-[#242b36] hover:border-[#4b5566] rounded-[2px] text-xs font-mono-tabular tracking-[0.24em] uppercase transition-all duration-200 flex items-center gap-3 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#7e8796]" />
                  <span>HOW TO PLAY</span>
                </button>
              </div>
            </div>

            {/* Quiet Bottom Control Hint */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono-tabular tracking-[0.2em] text-[#78808d] uppercase">
              <span>
                WASD Move · Shift Sprint · E Open Door · Esc Pause
              </span>
              <span className="text-[#5d6470]">Headphones Recommended</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. HOW TO PLAY MODAL                                           */}
      {/* ============================================================== */}
      {showHowToPlay && (
        <div className="absolute inset-0 bg-[#020306]/90 pointer-events-auto flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-[#080c13] border border-[#2c3442] p-7 sm:p-8 rounded-[2px] max-w-md w-full space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.98)]">
            <div className="flex items-center justify-between border-b border-[#1c232e] pb-4">
              <div className="space-y-1">
                <h2 className="font-cinzel text-lg font-bold tracking-[0.22em] text-[#eae5da]">
                  HOW TO PLAY
                </h2>
                <p className="text-[10px] font-mono-tabular tracking-[0.2em] text-[#747d8c] uppercase">
                  Survival Field Notes
                </p>
              </div>
              <button
                onClick={() => setShowHowToPlay(false)}
                aria-label="Close How To Play"
                className="text-[#788291] hover:text-[#eae5da] p-1 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono-tabular text-[#adb4c0]">
              <div className="flex items-center justify-between py-1.5 border-b border-[#141a24]">
                <span className="text-[#e4e0d6] font-semibold">[W] [A] [S] [D]</span>
                <span className="tracking-wider text-[#9ba3b0]">MOVE</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#141a24]">
                <span className="text-[#e4e0d6] font-semibold">[LEFT SHIFT]</span>
                <span className="tracking-wider text-[#9ba3b0]">HOLD TO SPRINT</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#141a24]">
                <span className="text-[#e4e0d6] font-semibold">[E]</span>
                <span className="tracking-wider text-[#9ba3b0]">OPEN DOOR</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#141a24]">
                <span className="text-[#e4e0d6] font-semibold">[ESC]</span>
                <span className="tracking-wider text-[#9ba3b0]">PAUSE GAME</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#05080d] border-l-2 border-[#9e2828] text-xs text-[#9aa2af] leading-relaxed">
              Manage your stamina carefully. Once you step outside the ger, follow
              the river marker across the steppe and reach the far bank—it cannot
              cross running water.
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 bg-[#111722] hover:bg-[#192232] text-[#e5e1d8] border border-[#343e4f] hover:border-[#626e82] rounded-[2px] text-xs tracking-[0.24em] uppercase cursor-pointer transition-all font-mono-tabular"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. SETTINGS MODAL                                              */}
      {/* ============================================================== */}
      {showSettings && (
        <div className="absolute inset-0 bg-[#020306]/90 pointer-events-auto flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-[#080c13] border border-[#2c3442] p-7 sm:p-8 rounded-[2px] max-w-md w-full space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.98)]">
            <div className="flex items-center justify-between border-b border-[#1c232e] pb-4">
              <div className="space-y-1">
                <h2 className="font-cinzel text-lg font-bold tracking-[0.22em] text-[#eae5da]">
                  SETTINGS
                </h2>
                <p className="text-[10px] font-mono-tabular tracking-[0.2em] text-[#747d8c] uppercase">
                  Audio, Controls & Visuals
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Close Settings"
                className="text-[#788291] hover:text-[#eae5da] p-1 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs font-mono-tabular">
              {/* Master Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-[#c6ccd6]">
                  <span className="tracking-[0.16em]">MASTER VOLUME</span>
                  <span className="text-[#e5e1d8]">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) =>
                    onUpdateSettings({ masterVolume: parseFloat(e.target.value) })
                  }
                  className="horror-slider"
                />
              </div>

              {/* Music Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-[#c6ccd6]">
                  <span className="tracking-[0.16em]">MUSIC & MELODY</span>
                  <span className="text-[#e5e1d8]">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.musicVolume}
                  onChange={(e) =>
                    onUpdateSettings({ musicVolume: parseFloat(e.target.value) })
                  }
                  className="horror-slider"
                />
              </div>

              {/* SFX Volume */}
              <div className="space-y-2">
                <div className="flex justify-between text-[#c6ccd6]">
                  <span className="tracking-[0.16em]">SOUND EFFECTS</span>
                  <span className="text-[#e5e1d8]">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })
                  }
                  className="horror-slider"
                />
              </div>

              {/* Mouse Sensitivity */}
              <div className="space-y-2">
                <div className="flex justify-between text-[#c6ccd6]">
                  <span className="tracking-[0.16em]">MOUSE SENSITIVITY</span>
                  <span className="text-[#e5e1d8]">
                    {settings.mouseSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateSettings({
                      mouseSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="horror-slider"
                />
              </div>

              {/* Graphics Quality */}
              <div className="space-y-2 pt-1">
                <div className="text-[#c6ccd6] tracking-[0.16em]">
                  GRAPHICS QUALITY
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'low', label: 'LOW' },
                      { id: 'med', label: 'MEDIUM' },
                      { id: 'high', label: 'HIGH' },
                    ] as { id: GraphicsQuality; label: string }[]
                  ).map((tier) => {
                    const active = settings.graphicsQuality === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() =>
                          onUpdateSettings({ graphicsQuality: tier.id })
                        }
                        className={`py-2 text-[11px] tracking-[0.18em] border rounded-[2px] cursor-pointer transition-all ${
                          active
                            ? 'bg-[#1a1115] border-[#a82929] text-[#f0ece3]'
                            : 'bg-[#05080d] border-[#262e3a] text-[#8d96a3] hover:border-[#4b5668] hover:text-[#d5d8de]'
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2.5 bg-[#111722] hover:bg-[#192232] text-[#e5e1d8] border border-[#343e4f] hover:border-[#626e82] rounded-[2px] text-xs tracking-[0.24em] uppercase cursor-pointer transition-all font-mono-tabular"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. DEATH SCREEN (CAUGHT)                                       */}
      {/* ============================================================== */}
      {phase === 'CAUGHT' && (
        <div className="absolute inset-0 bg-transparent pointer-events-auto flex flex-col items-center justify-center p-8 z-50 text-center">
          {/* Same Full-Screen Color Goolingoo Jumpscare Image Kept Permanently Visible */}
          <img
            src="/assets/aistudio/image_80904e6a.png"
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Subtle Contrast Vignette Fading In Behind Foreground Typography */}
          <div
            className="absolute inset-0 pointer-events-none animate-fade-in"
            style={{
              background:
                'radial-gradient(circle at 50% 60%, rgba(2,3,5,0.48) 0%, rgba(18,4,6,0.28) 52%, rgba(2,2,4,0.62) 100%)',
            }}
          />

          {/* Layout Spacer Preserving Exact Original YOU DIED & Button Positions */}
          <div
            aria-hidden="true"
            className="relative w-[290px] h-[340px] sm:w-[360px] sm:h-[410px] mb-[-115px] sm:mb-[-135px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col items-center max-w-md animate-fade-in">
            <h2
              className="font-cinzel text-5xl sm:text-7xl font-bold tracking-[0.24em] text-[#ebe6dc]"
              style={{
                textShadow:
                  '0 0 28px rgba(160,20,20,0.55), 0 4px 16px rgba(0,0,0,0.98)',
              }}
            >
              YOU DIED
            </h2>

            <div className="w-28 h-px bg-gradient-to-r from-transparent via-[#a62626] to-transparent my-5" />

            <p className="text-xs font-mono-tabular tracking-[0.2em] text-[#9a8f92] uppercase mb-9">
              Caught in the dark of the steppe
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center">
              <button
                onClick={onRestart}
                className="w-48 py-3 px-6 bg-[#140c0f]/90 hover:bg-[#221217] text-[#efeae1] border border-[#7c2323] hover:border-[#b53232] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#c73434]" />
                <span>PLAY AGAIN</span>
              </button>

              <button
                onClick={onMainMenu}
                className="w-48 py-3 px-6 bg-[#090d14]/90 hover:bg-[#121926] text-[#aeb5c2] hover:text-[#ebe6dc] border border-[#293240] hover:border-[#4c596e] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase flex items-center justify-center gap-2.5 cursor-pointer transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>MAIN MENU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. SURVIVAL ENDING (SURVIVED)                                 */}
      {/* ============================================================== */}
      {phase === 'SURVIVED' && (
        <div
          className="absolute inset-0 pointer-events-auto flex flex-col items-center justify-between py-14 sm:py-20 px-8 z-50 text-center animate-fade-in"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,4,8,0.86) 0%, rgba(3,6,12,0.22) 38%, rgba(3,6,12,0.34) 62%, rgba(2,4,8,0.94) 100%)',
          }}
        >
          {/* Upper Atmospheric Headline (leaves middle horizon open for river/demon view) */}
          <div className="flex flex-col items-center pt-4 sm:pt-8">
            <h2
              className="font-cinzel text-4xl sm:text-6xl font-bold tracking-[0.24em] text-[#edeae2]"
              style={{
                textShadow:
                  '0 4px 20px rgba(0,0,0,0.98), 0 0 36px rgba(0,0,0,0.85)',
              }}
            >
              YOU SURVIVED
            </h2>

            <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#6f7b8f]/80 to-transparent my-4" />

            <p
              className="font-cinzel text-xs sm:text-sm tracking-[0.28em] text-[#b4bcc9] uppercase animate-subtitle-reveal"
              style={{
                textShadow: '0 2px 12px rgba(0,0,0,0.98)',
              }}
            >
              BUT IT NEVER STOPPED WATCHING.
            </p>
          </div>

          {/* Bottom Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 pb-2">
            <button
              onClick={onRestart}
              className="w-48 py-3 px-6 bg-[#0d131d]/92 hover:bg-[#172131] text-[#eeeae1] border border-[#424f63] hover:border-[#788aa6] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-[0_8px_24px_rgba(0,0,0,0.92)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>PLAY AGAIN</span>
            </button>

            <button
              onClick={onMainMenu}
              className="w-48 py-3 px-6 bg-[#070a10]/90 hover:bg-[#111824] text-[#aeb5c2] hover:text-[#eeeae1] border border-[#262e3c] hover:border-[#4b576b] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. PAUSE MENU                                                 */}
      {/* ============================================================== */}
      {phase === 'PAUSED' && !showSettings && (
        <div className="absolute inset-0 bg-[#020408]/82 pointer-events-auto flex flex-col items-center justify-center p-8 z-40 animate-fade-in">
          <div className="bg-[#080c13]/95 border border-[#2a3240] p-8 rounded-[2px] max-w-xs w-full flex flex-col items-center space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.98)]">
            <div className="text-center space-y-2 w-full">
              <h3 className="font-cinzel text-2xl font-bold tracking-[0.26em] text-[#eae5da]">
                PAUSED
              </h3>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#343e4f] to-transparent" />
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={onResume}
                className="w-full py-2.5 px-4 bg-[#111824] hover:bg-[#1a2435] text-[#eeeae1] border border-[#445166] hover:border-[#72839e] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase cursor-pointer transition-all"
              >
                RESUME
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 px-4 bg-[#070a10] hover:bg-[#101621] text-[#b4bac4] hover:text-[#eeeae1] border border-[#242c38] hover:border-[#495569] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase cursor-pointer transition-all"
              >
                SETTINGS
              </button>

              <button
                onClick={onRestart}
                className="w-full py-2.5 px-4 bg-[#070a10] hover:bg-[#101621] text-[#b4bac4] hover:text-[#eeeae1] border border-[#242c38] hover:border-[#495569] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase cursor-pointer transition-all"
              >
                RESTART
              </button>

              <button
                onClick={onMainMenu}
                className="w-full py-2.5 px-4 bg-[#0b080a] hover:bg-[#180e12] text-[#b09a9d] hover:text-[#f0e5e7] border border-[#3a2024] hover:border-[#8f2929] rounded-[2px] text-xs font-mono-tabular tracking-[0.22em] uppercase cursor-pointer transition-all"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
