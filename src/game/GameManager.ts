
/**
 * Central Game Orchestrator & Loop for Goviin Gants Ail
 * Integrates Three.js rendering, audio, physics, demon AI, and state machine.
 */

import * as THREE from 'three';
import { GamePhase, GameSettings, PlayerStats } from './types';
import { SoundEngine } from './audio/SoundEngine';
import { GerBuilder, GerInstance } from './world/GerBuilder';
import { TerrainBuilder, TerrainInstance } from './world/TerrainBuilder';
import { RiverBuilder, RiverInstance } from './world/RiverBuilder';
import { Demon } from './entities/Demon';
import { PlayerController } from './entities/PlayerController';

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onStatsUpdate: (stats: PlayerStats) => void;
  onWakeProgress: (progress: number) => void;
  onDemonRevealProgress: (progress: number) => void;
}

export class GameManager {
  private container: HTMLElement;
  private callbacks: GameCallbacks;

  // Three.js Core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private animFrameId: number | null = null;
  private swTimerId: number | null = null;
  private isSoftwareGl = false;

  // Subsystems
  public soundEngine: SoundEngine;
  private ger!: GerInstance;
  private terrain!: TerrainInstance;
  private river!: RiverInstance;
  private demon!: Demon;
  private player!: PlayerController;

  // State
  public phase: GamePhase = 'MAIN_MENU';
  public settings: GameSettings = {
    masterVolume: 0.85,
    musicVolume: 0.85,
    sfxVolume: 0.9,
    mouseSensitivity: 1.2,
    graphicsQuality: 'high',
  };

  private wakeTimer = 0;
  private revealTimer = 0;
  private endingTimer = 0;
  private isDestroyed = false;

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.soundEngine = new SoundEngine();

    this.initThree();
    this.initWorld();
    this.setupInputEvents();
    this.startLoop();
  }

  private initThree() {
    // Software WebGL detection per skill guideline
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.scene = new THREE.Scene();
    // Deep midnight-blue atmospheric fog matching vision image
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.0062);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;

    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // No artificial RoomEnvironment IBL so enclosed spaces remain genuinely dark
    this.scene.environment = null;

    this.container.appendChild(this.renderer.domElement);
  }

  private initWorld() {
    // 1. Terrain & Environment
    this.terrain = TerrainBuilder.build();
    this.scene.add(this.terrain.environmentGroup);

    // 2. River System
    this.river = RiverBuilder.build();
    this.scene.add(this.river.riverGroup);

    // 3. Mongolian Ger
    this.ger = GerBuilder.build();
    this.scene.add(this.ger.group);

    // 4. Demon (Creature Design A)
    this.demon = new Demon();
    this.scene.add(this.demon.group);

    // 5. Player Controller
    this.player = new PlayerController(this.camera, this.renderer.domElement, this.settings);

    // Player spawns inside closed ger: start with zero exterior sunlight and minimal cold bounce
    this.terrain.moonLight.intensity = 0;
    this.terrain.hemiLight.intensity = 0.045;
  }

  private setupInputEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', (e) => {
      // Escape for pause
      if (e.code === 'Escape') {
        if (this.phase !== 'MAIN_MENU' && this.phase !== 'CAUGHT' && this.phase !== 'SURVIVED') {
          this.togglePause();
        }
      }

      // E or Space to open door
      if ((e.code === 'KeyE' || e.code === 'Space') && this.player.canInteractDoor) {
        this.openDoor();
      }
    });

    // Click canvas to request pointer lock during gameplay
    this.renderer.domElement.addEventListener('click', () => {
      if (
        this.phase === 'GER_EXPLORATION' ||
        this.phase === 'DEMON_REVEAL' ||
        this.phase === 'CHASE' ||
        this.phase === 'RIVER_CROSSING'
      ) {
        this.player.requestPointerLock();
      }
    });
  }

  public startGame() {
    this.soundEngine.init();

    // Start the intro ambient when a new game begins.
    this.soundEngine.startIntroAmbient();

    this.setPhase('WAKE_UP');
    this.wakeTimer = 0;
    this.player.requestPointerLock();
    this.soundEngine.playGerWoodCreak();
  }

  public openDoor() {
    if (this.ger.isDoorOpen) return;

    // Synchronized event:
    // 1. Entrance door begins opening + 2. Dying candle immediately extinguishes
    this.ger.openDoor();
    this.player.isDoorOpen = true;
    this.soundEngine.playDoorCreak();

    // Stop the intro ambient as the ger door opens.
    this.soundEngine.stopIntroAmbient();

    // 3. Demon chase sequence begins immediately with zero delay
    if (this.phase === 'GER_EXPLORATION' || this.phase === 'WAKE_UP') {
      this.demon.state = 'CHASING';
      this.setPhase('CHASE');

      // Start Goolingoo melody softly in the distance.
      // The intro ambient has already been stopped above.
      this.soundEngine.startDemonMelody();
    }
  }

  public togglePause() {
    if (this.phase === 'PAUSED') {
      this.setPhase(this.previousPhase);
      this.player.requestPointerLock();
    } else {
      this.previousPhase = this.phase;
      this.setPhase('PAUSED');
      this.player.exitPointerLock();
    }
  }

  private previousPhase: GamePhase = 'GER_EXPLORATION';

  public restartGame() {
    this.soundEngine.stopDemonMelody();
    this.soundEngine.stopIntroAmbient();

    this.player.reset();
    this.demon.reset(-95);
    this.ger.resetDoor();
    this.terrain.moonLight.intensity = 0;
    this.terrain.hemiLight.intensity = 0.045;

    this.wakeTimer = 0;
    this.revealTimer = 0;
    this.endingTimer = 0;

    // startGame() starts the intro ambient again from the beginning.
    this.startGame();
  }

  public returnToMainMenu() {
    this.soundEngine.stopDemonMelody();
    this.soundEngine.stopIntroAmbient();

    this.player.exitPointerLock();
    this.player.reset();
    this.demon.reset(-95);
    this.ger.resetDoor();
    this.terrain.moonLight.intensity = 0;
    this.terrain.hemiLight.intensity = 0.045;

    this.setPhase('MAIN_MENU');
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.soundEngine.updateSettings(newSettings);
    this.player.updateSettings(this.settings);

    // Apply Graphics Quality adjustments
    if (newSettings.graphicsQuality) {
      if (newSettings.graphicsQuality === 'low') {
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(1);
      } else if (newSettings.graphicsQuality === 'med') {
        this.renderer.shadowMap.enabled = !this.isSoftwareGl;
        this.renderer.setPixelRatio(1);
      } else {
        this.renderer.shadowMap.enabled = !this.isSoftwareGl;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    }
  }

  private setPhase(newPhase: GamePhase) {
    this.phase = newPhase;
    this.callbacks.onPhaseChange(newPhase);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.swTimerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.swTimerId = window.setTimeout(cb, 80);
        }
      };
      this.swTimerId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.isDestroyed) return;

      const rawDt = this.clock.getDelta();
      const delta = Math.min(rawDt, 0.05); // clamped delta per standard

      if (this.phase !== 'PAUSED') {
        this.updateGame(delta);
      }

      this.renderer.render(this.scene, this.camera);
      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateGame(delta: number) {
    const isInside = this.ger.checkInside(this.player.position);
    this.ger.updateInterior(delta, this.clock.elapsedTime);

    // Physical occlusion of exterior sky & horizon moonlight while inside the ger:
    // Closed ger -> zero exterior directional/hemisphere bleed (sole light = Toono moonlight).
    // Door open while inside -> keep interior hemisphere near-black while exterior steppe is lit.
    // Outside -> full moonlit nocturnal steppe illumination.
    let targetMoonIntensity = 2.6;
    let targetHemiIntensity = 0.26;
    if (isInside && !this.ger.isDoorOpen) {
      targetMoonIntensity = 0.0;
      targetHemiIntensity = 0.045;
    } else if (isInside && this.ger.isDoorOpen) {
      targetMoonIntensity = this.isSoftwareGl ? 0.55 : 2.6;
      targetHemiIntensity = 0.05;
    }
    const lightLerp = Math.min(1, delta * 6.0);
    this.terrain.moonLight.intensity = THREE.MathUtils.lerp(
      this.terrain.moonLight.intensity,
      targetMoonIntensity,
      lightLerp
    );
    this.terrain.hemiLight.intensity = THREE.MathUtils.lerp(
      this.terrain.hemiLight.intensity,
      targetHemiIntensity,
      lightLerp
    );

    // Update natural wind & demon-driven directional wind on outdoor steppe grass
    const demonWindStrength =
      this.phase === 'DEMON_REVEAL'
        ? 0.45
        : this.phase === 'CHASE' || this.phase === 'RIVER_CROSSING'
          ? 1.0
          : 0.0;
    this.terrain.updateFoliageWind(
      this.clock.elapsedTime,
      this.demon.position,
      this.player.position,
      demonWindStrength
    );

    // 1. Phase Updates
    if (this.phase === 'WAKE_UP') {
      this.wakeTimer += delta;
      const progress = Math.min(1.0, this.wakeTimer / 4.0);
      this.player.wakeUpAnimation(progress);
      this.callbacks.onWakeProgress(progress);

      if (progress >= 1.0) {
        this.setPhase('GER_EXPLORATION');
      }
    } else if (this.phase === 'DEMON_REVEAL') {
      this.revealTimer += delta;
      const progress = Math.min(1.0, this.revealTimer / 3.8);
      this.callbacks.onDemonRevealProgress(progress);

      if (this.revealTimer > 1.4 && this.demon.state === 'OBSERVING') {
        this.demon.state = 'TURNING';
      }

      if (this.revealTimer > 3.8 && this.demon.state === 'TURNING') {
        this.demon.state = 'CHASING';
        this.setPhase('CHASE');
      }
    }

    // 2. Player Controller Update
    const moveInfo = this.player.update(
      delta,
      this.terrain.getHeightAt,
      this.ger.doorInteractionPosition,
      this.river.isPlayerInWater,
      this.river.getWaterDepth,
      isInside
    );

    // Play footstep sounds when moving
    if (moveInfo.moved) {
      this.soundEngine.playFootstep(moveInfo.isSprinting, moveInfo.inWater, isInside);
    }

    // Update player breathing
    this.soundEngine.updateBreathing(
      this.player.stamina / this.player.maxStamina,
      this.phase === 'CHASE' || this.phase === 'RIVER_CROSSING'
    );

    // 3. Water surface & River proximity update
    this.river.updateWater(delta);
    const distToRiver = Math.abs(this.player.position.z - (-220));
    this.soundEngine.updateRiverProximity(distToRiver);

    // 4. Demon AI Update
    const distToDemon = this.player.position.distanceTo(this.demon.position);

    // Check River boundary for Demon! (Section 10.5: Demon CANNOT cross river)
    if (this.demon.position.z <= this.river.demonStopZ) {
      this.demon.position.z = this.river.demonStopZ;
      if (this.demon.state === 'CHASING') {
        this.demon.state = 'BLOCKED_BY_RIVER';
      }
    }

    this.demon.update(delta, this.player.position, this.terrain.getHeightAt);

    // Update dynamic music intensity with distance
    if (this.phase === 'DEMON_REVEAL' || this.phase === 'CHASE' || this.phase === 'RIVER_CROSSING') {
      this.soundEngine.updateDemonDistanceAudio(distToDemon);
    }

    // 5. River Crossing & Survival Win Detection
    if (this.river.isPlayerInWater(this.player.position)) {
      if (this.phase === 'CHASE') {
        this.setPhase('RIVER_CROSSING');
      }
    }

    if (this.river.isPlayerPastRiver(this.player.position) && this.phase !== 'SURVIVED') {
      // Player crossed to northern riverbank!
      this.setPhase('SURVIVED');
      this.demon.state = 'ENDING_STARE';
      this.soundEngine.playVictoryRelief();
    }

    // 6. Demon Catch Detection (Attack distance <= 2.2m)
    if (
      distToDemon <= 2.2 &&
      (this.phase === 'CHASE' || this.phase === 'RIVER_CROSSING' || this.phase === 'DEMON_REVEAL')
    ) {
      this.setPhase('CAUGHT');
      this.soundEngine.playCaughtJumpscare();
      this.player.exitPointerLock();
    }

    // 7. Update HUD stats
    this.callbacks.onStatsUpdate(this.player.getStats(distToDemon, distToRiver));
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.swTimerId !== null) clearTimeout(this.swTimerId);
    window.removeEventListener('resize', this.onResize);
    this.player.exitPointerLock();

    this.soundEngine.stopDemonMelody();
    this.soundEngine.stopIntroAmbient();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
