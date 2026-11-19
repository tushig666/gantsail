/**
 * Game state and type definitions for Goviin Gants Ail
 */

export type GamePhase =
  | 'MAIN_MENU'
  | 'WAKE_UP'
  | 'GER_EXPLORATION'
  | 'DOOR_OPENING'
  | 'DEMON_REVEAL'
  | 'CHASE'
  | 'RIVER_CROSSING'
  | 'SURVIVED'
  | 'CAUGHT'
  | 'PAUSED';

export type DemonState =
  | 'DORMANT'
  | 'OBSERVING'
  | 'TURNING'
  | 'CHASING'
  | 'BLOCKED_BY_RIVER'
  | 'ENDING_STARE';

export type GraphicsQuality = 'low' | 'med' | 'high';

export interface GameSettings {
  masterVolume: number; // 0 - 1
  musicVolume: number;  // 0 - 1
  sfxVolume: number;    // 0 - 1
  mouseSensitivity: number; // 0.5 - 2.5
  graphicsQuality: GraphicsQuality;
}

export interface PlayerStats {
  stamina: number; // 0 - 100
  maxStamina: number;
  isSprinting: boolean;
  isExhausted: boolean;
  inWater: boolean;
  distanceToDemon: number;
  distanceToRiver: number;
  canInteractDoor: boolean;
  isDoorOpen: boolean;
}
