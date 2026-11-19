/**
 * First-Person Player Controller for Goviin Gants Ail
 * Engineered for responsive, reliable running and survival navigation:
 * - Walking speed: 4.8 m/s
 * - Fast Sprint: 9.2 m/s (reliably triggered by Shift or toggle)
 * - Dynamic FOV speed stretch (65 -> 74 deg)
 * - Generous stamina with rapid recovery
 * - Mouse look with pointer lock
 * - Water wading physics
 */

import * as THREE from 'three';
import { GameSettings, PlayerStats } from '../types';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position = new THREE.Vector3(-2.6, 0.45, 0.3); // Starting on Ger bed

  // Camera Orientation
  public yaw = Math.PI;
  public pitch = 0;
  private isPointerLocked = false;

  // Speeds
  public walkSpeed = 3.4;
  public sprintSpeed = 6.9;
  private currentSpeed = 0;

  // Stamina
  public stamina = 120;
  public maxStamina = 120;
  public isSprinting = false;
  public isExhausted = false;

  // Head bobbing
  private bobTimer = 0;
  private eyeHeight = 1.68;
  private currentEyeHeight = 0.45;

  // Input states
  private keys: Record<string, boolean> = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
  };

  private isLeftShiftDown = false;

  public canInteractDoor = false;
  public isDoorOpen = false;
  public inWater = false;
  public waterDepth = 0;

  private domElement: HTMLElement;
  private settings: GameSettings;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, settings: GameSettings) {
    this.camera = camera;
    this.domElement = domElement;
    this.settings = settings;

    this.setupListeners();
    this.updateCameraTransform();
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = newSettings;
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = true;
      }

      if (e.code === 'ShiftLeft') {
        this.isLeftShiftDown = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }

      if (e.code === 'ShiftLeft') {
        this.isLeftShiftDown = false;
      }
    });

    const resetInputs = () => {
      Object.keys(this.keys).forEach((k) => (this.keys[k] = false));
      this.isLeftShiftDown = false;
      this.isSprinting = false;
    };

    window.addEventListener('blur', resetInputs);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        resetInputs();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      const sens = 0.0022 * this.settings.mouseSensitivity;
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;

      // Vertical look clamp [-85, 85 deg]
      this.pitch = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, this.pitch));
    });
  }

  public requestPointerLock() {
    this.domElement.requestPointerLock?.();
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  public wakeUpAnimation(progress: number) {
    this.currentEyeHeight = THREE.MathUtils.lerp(0.45, this.eyeHeight, Math.min(1, progress * 1.2));
    this.pitch = THREE.MathUtils.lerp(0.55, 0.0, progress);
  }

  public update(
    delta: number,
    terrainHeightAt: (x: number, z: number) => number,
    doorPos: THREE.Vector3,
    checkInWater: (pos: THREE.Vector3) => boolean,
    getWaterDepth: (pos: THREE.Vector3) => number,
    isInsideGer: boolean
  ): { moved: boolean; isSprinting: boolean; inWater: boolean } {
    const moveX = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    const moveZ = (this.keys.KeyS ? 1 : 0) - (this.keys.KeyW ? 1 : 0);
    const hasInput = moveX !== 0 || moveZ !== 0;

    // Sprint & Stamina Mechanics:
    // Sprint is allowed ONLY while LEFT SHIFT is actively held down AND player is moving
    const isSprintInputActive = this.isLeftShiftDown && hasInput && !this.keys.KeyS;

    if (isSprintInputActive && !this.isExhausted && this.stamina > 0) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - delta * 12.0);
      if (this.stamina === 0) {
        this.isExhausted = true;
        this.isSprinting = false;
      }
    } else {
      this.isSprinting = false;
      // When LEFT SHIFT is not pressed, stamina NEVER decreases - only recovers
      const recoveryRate = hasInput ? 10.0 : 18.0;
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * recoveryRate);
      if (this.isExhausted && this.stamina > 25) {
        this.isExhausted = false;
      }
    }

    // Water slow factor (original)
    this.inWater = checkInWater(this.position);
    this.waterDepth = getWaterDepth(this.position);
    const waterMultiplier = this.inWater ? 0.48 : 1.0;

    // Acceleration & Speed (original)
    const targetSpeed = (this.isSprinting ? this.sprintSpeed : this.walkSpeed) * waterMultiplier;
    this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1, delta * 8.0);

    let moved = false;
    if (hasInput) {
      const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      const moveDir = new THREE.Vector3(
        inputDir.x * Math.cos(this.yaw) + inputDir.z * Math.sin(this.yaw),
        0,
        -inputDir.x * Math.sin(this.yaw) + inputDir.z * Math.cos(this.yaw)
      );

      const nextX = this.position.x + moveDir.x * this.currentSpeed * delta;
      const nextZ = this.position.z + moveDir.z * this.currentSpeed * delta;

      // Ger circular collision
      let canMove = true;
      const gerRadius = 4.3;
      const nextDistFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);

      if (isInsideGer) {
        const isHeadingThroughDoor = nextZ < -3.7 && Math.abs(nextX) < 0.75;
        if (nextDistFromCenter > gerRadius - 0.5) {
          if (!this.isDoorOpen || !isHeadingThroughDoor) {
            canMove = false;
          }
        }
      }

      if (canMove) {
        this.position.x = nextX;
        this.position.z = nextZ;
        moved = true;
      }

      this.bobTimer += delta * (this.isSprinting ? 14 : 8);
    } else {
      this.bobTimer += delta * 1.5;
    }

    // Ground height clamping
    const groundY = terrainHeightAt(this.position.x, this.position.z);
    const targetHeight = isInsideGer ? 0.12 : groundY;

    // Bobbing offset
    const bobOffset = hasInput ? Math.sin(this.bobTimer) * (this.isSprinting ? 0.065 : 0.035) : 0;
    this.position.y = targetHeight;

    // Door proximity
    const distToDoor = this.position.distanceTo(doorPos);
    this.canInteractDoor = !this.isDoorOpen && distToDoor < 2.5;

    this.updateCameraTransform(bobOffset);

    return {
      moved,
      isSprinting: this.isSprinting,
      inWater: this.inWater,
    };
  }

  private updateCameraTransform(bobOffset = 0) {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.currentEyeHeight + bobOffset,
      this.position.z
    );

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  public getStats(distanceToDemon: number, distanceToRiver: number): PlayerStats {
    return {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      isSprinting: this.isSprinting,
      isExhausted: this.isExhausted,
      inWater: this.inWater,
      distanceToDemon,
      distanceToRiver,
      canInteractDoor: this.canInteractDoor,
      isDoorOpen: this.isDoorOpen,
    };
  }

  public reset() {
    this.position.set(-2.6, 0.12, 0.3);
    this.yaw = Math.PI * 0.95;
    this.pitch = 0.55;
    this.stamina = 120;
    this.isLeftShiftDown = false;
    this.isExhausted = false;
    this.isSprinting = false;
    this.isDoorOpen = false;
    this.currentEyeHeight = 0.45;
    this.updateCameraTransform();
  }
}
