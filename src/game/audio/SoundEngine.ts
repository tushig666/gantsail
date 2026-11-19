
/**
 * Web Audio Sound Engine for Goviin Gants Ail
 * Synthesized effects and separate intro/victory Goolingoo ambient.
 */

import { GameSettings } from '../types';

const DEMON_AMBIENT_URL = new URL('./ambient/goolingoo_ambient.mp3', import.meta.url).href;
const DEMON_AMBIENT_VOLUME_RATIO = 0.06;
const DEMON_AMBIENT_FADE_SECONDS = 0.8;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music Nodes
  private musicFilter: BiquadFilterNode | null = null;
  private musicWaveShaper: WaveShaperNode | null = null;
  private isMusicPlaying = false;
  private melodyTimer: number | null = null;

  // Legacy demon ambient nodes (kept for safe cleanup; no longer started with melody)
  private demonAmbientBuffer: AudioBuffer | null = null;
  private demonAmbientBufferPromise: Promise<AudioBuffer> | null = null;
  private demonAmbientSource: AudioBufferSourceNode | null = null;
  private demonAmbientGain: GainNode | null = null;
  private demonAmbientStopTimer: number | null = null;

  // Intro and victory ambient nodes
  private introAmbientBuffer: AudioBuffer | null = null;
  private introAmbientBufferPromise: Promise<AudioBuffer> | null = null;
  private introAmbientSource: AudioBufferSourceNode | null = null;
  private introAmbientGain: GainNode | null = null;
  private introAmbientStopTimer: number | null = null;
  private introAmbientRequestId = 0;

  private readonly INTRO_AMBIENT_VOLUME_RATIO = 0.06;
  private readonly INTRO_AMBIENT_FADE_SECONDS = 0.8;

  // Ambient Nodes
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isWindActive = false;

  private riverGain: GainNode | null = null;
  private isRiverActive = false;

  private breathGain: GainNode | null = null;
  private breathOsc: OscillatorNode | null = null;
  private isBreathing = false;
  private breathRate = 1.0;

  // State
  private settings: GameSettings = {
    masterVolume: 0.8,
    musicVolume: 0.85,
    sfxVolume: 0.9,
    mouseSensitivity: 1.2,
    graphicsQuality: 'high',
  };

  private lastStepTime = 0;
  private isInitialized = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Music Channel with dynamic distance filter & saturation
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.ctx.currentTime);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.musicWaveShaper = this.ctx.createWaveShaper();
      this.musicWaveShaper.curve = this.createDistortionCurve(10);
      this.musicWaveShaper.oversample = '2x';

      this.musicGain.connect(this.musicFilter);
      this.musicFilter.connect(this.musicWaveShaper);
      this.musicWaveShaper.connect(this.masterGain);

      // SFX Channel
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startWindAmbience();
      this.startRiverAmbience();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Failed to initialize Web Audio context:', e);
    }
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;

    const t = this.ctx.currentTime;

    this.masterGain.gain.setTargetAtTime(this.settings.masterVolume, t, 0.05);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, t, 0.05);

    if (this.introAmbientGain && this.introAmbientSource) {
      this.introAmbientGain.gain.setTargetAtTime(
        this.settings.musicVolume * this.INTRO_AMBIENT_VOLUME_RATIO,
        t,
        0.05,
      );
    }

    if (this.isMusicPlaying && this.demonAmbientGain) {
      this.demonAmbientGain.gain.setTargetAtTime(
        this.settings.musicVolume * DEMON_AMBIENT_VOLUME_RATIO,
        t,
        0.05,
      );
    }
  }

  // --- INTRO / VICTORY AMBIENT ---

  private loadIntroAmbientBuffer(ctx: AudioContext): Promise<AudioBuffer> {
    if (this.introAmbientBuffer) {
      return Promise.resolve(this.introAmbientBuffer);
    }

    if (!this.introAmbientBufferPromise) {
      this.introAmbientBufferPromise = fetch(DEMON_AMBIENT_URL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load intro ambient audio (${response.status})`);
          }
          return response.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          this.introAmbientBuffer = buffer;
          return buffer;
        })
        .catch((error: unknown) => {
          this.introAmbientBufferPromise = null;
          throw error;
        });
    }

    return this.introAmbientBufferPromise;
  }

  public startIntroAmbient() {
    this.init();

    if (!this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const requestId = ++this.introAmbientRequestId;

    if (this.introAmbientStopTimer !== null) {
      clearTimeout(this.introAmbientStopTimer);
      this.introAmbientStopTimer = null;
    }

    if (this.introAmbientSource && this.introAmbientGain) {
      const t = ctx.currentTime;

      this.introAmbientGain.gain.cancelScheduledValues(t);
      this.introAmbientGain.gain.setValueAtTime(this.introAmbientGain.gain.value, t);
      this.introAmbientGain.gain.linearRampToValueAtTime(
        this.settings.musicVolume * this.INTRO_AMBIENT_VOLUME_RATIO,
        t + this.INTRO_AMBIENT_FADE_SECONDS,
      );

      return;
    }

    this.loadIntroAmbientBuffer(ctx)
      .then((buffer) => {
        if (
          !this.ctx ||
          this.ctx !== ctx ||
          !this.masterGain ||
          requestId !== this.introAmbientRequestId ||
          this.introAmbientSource
        ) {
          return;
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const t = ctx.currentTime;

        source.buffer = buffer;
        source.loop = true;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(
          this.settings.musicVolume * this.INTRO_AMBIENT_VOLUME_RATIO,
          t + this.INTRO_AMBIENT_FADE_SECONDS,
        );

        source.connect(gain);
        gain.connect(this.masterGain);

        source.onended = () => {
          source.disconnect();
          gain.disconnect();

          if (this.introAmbientSource === source) {
            this.introAmbientSource = null;
            this.introAmbientGain = null;
          }
        };

        this.introAmbientSource = source;
        this.introAmbientGain = gain;

        source.start(t);
      })
      .catch((error: unknown) => {
        console.warn('Failed to load intro ambient audio:', error);
      });
  }

  public stopIntroAmbient() {
    // Invalidate pending loads so audio cannot start after the door opens.
    this.introAmbientRequestId++;

    const source = this.introAmbientSource;
    const gain = this.introAmbientGain;

    if (!this.ctx || !source || !gain) return;

    const t = this.ctx.currentTime;

    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(
      0,
      t + this.INTRO_AMBIENT_FADE_SECONDS,
    );

    if (this.introAmbientStopTimer !== null) {
      clearTimeout(this.introAmbientStopTimer);
    }

    this.introAmbientStopTimer = window.setTimeout(() => {
      this.introAmbientStopTimer = null;

      if (this.introAmbientSource !== source) return;

      this.introAmbientSource = null;
      this.introAmbientGain = null;
      source.stop();
    }, this.INTRO_AMBIENT_FADE_SECONDS * 1000);
  }

  // --- AMBIENT SOUNDS ---

  private startWindAmbience() {
    if (!this.ctx || !this.sfxGain || this.isWindActive) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);

    whiteNoise.start();
    this.isWindActive = true;

    this.modulateWind();
  }

  private modulateWind() {
    if (!this.ctx || !this.windFilter || !this.windGain || !this.isWindActive) return;

    const t = this.ctx.currentTime;
    const nextFreq = 180 + Math.random() * 280;
    const nextGain = 0.2 + Math.random() * 0.3;
    const dur = 3 + Math.random() * 4;

    this.windFilter.frequency.linearRampToValueAtTime(nextFreq, t + dur);
    this.windGain.gain.linearRampToValueAtTime(nextGain, t + dur);

    setTimeout(() => this.modulateWind(), dur * 1000);
  }

  private startRiverAmbience() {
    if (!this.ctx || !this.sfxGain || this.isRiverActive) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.03;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.riverGain = this.ctx.createGain();
    this.riverGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.riverGain);
    this.riverGain.connect(this.sfxGain);

    noise.start();
    this.isRiverActive = true;
  }

  public updateRiverProximity(distanceToRiver: number) {
    if (!this.ctx || !this.riverGain) return;

    const norm = Math.max(0, Math.min(1, 1 - (distanceToRiver - 5) / 80));
    const targetVol = norm * 0.55;

    this.riverGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
  }

  // --- GOOLINGOO-INSPIRED HORROR MELODY ---

  public startDemonMelody() {
    if (this.isMusicPlaying) return;

    this.init();
    this.isMusicPlaying = true;

    // Do not start the MP3 ambient here.
    // It is reserved for the intro and victory screen.
    this.playGoolingooPhrase(0);
  }

  public stopDemonMelody() {
    this.isMusicPlaying = false;

    // Keep legacy cleanup in case an older source is still active.
    this.stopDemonAmbient();

    if (this.melodyTimer) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }

    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2);
    }
  }

  private loadDemonAmbientBuffer(ctx: AudioContext): Promise<AudioBuffer> {
    if (this.demonAmbientBuffer) return Promise.resolve(this.demonAmbientBuffer);

    if (!this.demonAmbientBufferPromise) {
      this.demonAmbientBufferPromise = fetch(DEMON_AMBIENT_URL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load Goolingoo ambient audio (${response.status})`);
          }
          return response.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          this.demonAmbientBuffer = buffer;
          return buffer;
        })
        .catch((error: unknown) => {
          this.demonAmbientBufferPromise = null;
          throw error;
        });
    }

    return this.demonAmbientBufferPromise;
  }

  private startDemonAmbient() {
    // Legacy method intentionally not used by startDemonMelody().
    if (!this.ctx || !this.masterGain || !this.isMusicPlaying) return;

    const ctx = this.ctx;

    if (this.demonAmbientSource && this.demonAmbientGain) {
      if (this.demonAmbientStopTimer !== null) {
        clearTimeout(this.demonAmbientStopTimer);
        this.demonAmbientStopTimer = null;
      }

      const t = ctx.currentTime;

      this.demonAmbientGain.gain.cancelScheduledValues(t);
      this.demonAmbientGain.gain.setValueAtTime(this.demonAmbientGain.gain.value, t);
      this.demonAmbientGain.gain.linearRampToValueAtTime(
        this.settings.musicVolume * DEMON_AMBIENT_VOLUME_RATIO,
        t + DEMON_AMBIENT_FADE_SECONDS,
      );

      return;
    }

    this.loadDemonAmbientBuffer(ctx)
      .then((buffer) => {
        if (
          !this.ctx ||
          this.ctx !== ctx ||
          !this.masterGain ||
          !this.isMusicPlaying ||
          this.demonAmbientSource
        ) {
          return;
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const t = ctx.currentTime;

        source.buffer = buffer;
        source.loop = true;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(
          this.settings.musicVolume * DEMON_AMBIENT_VOLUME_RATIO,
          t + DEMON_AMBIENT_FADE_SECONDS,
        );

        source.connect(gain);
        gain.connect(this.masterGain);

        source.onended = () => {
          source.disconnect();
          gain.disconnect();

          if (this.demonAmbientSource === source) {
            this.demonAmbientSource = null;
            this.demonAmbientGain = null;
          }
        };

        this.demonAmbientSource = source;
        this.demonAmbientGain = gain;

        source.start(t);
      })
      .catch((error: unknown) => {
        console.warn('Failed to load Goolingoo ambient audio:', error);
      });
  }

  private stopDemonAmbient() {
    const source = this.demonAmbientSource;
    const gain = this.demonAmbientGain;

    if (!this.ctx || !source || !gain) return;

    const t = this.ctx.currentTime;

    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + DEMON_AMBIENT_FADE_SECONDS);

    if (this.demonAmbientStopTimer !== null) {
      clearTimeout(this.demonAmbientStopTimer);
    }

    this.demonAmbientStopTimer = window.setTimeout(() => {
      this.demonAmbientStopTimer = null;

      if (this.isMusicPlaying || this.demonAmbientSource !== source) return;

      this.demonAmbientSource = null;
      this.demonAmbientGain = null;
      source.stop();
    }, DEMON_AMBIENT_FADE_SECONDS * 1000);
  }

  public updateDemonDistanceAudio(distance: number) {
    if (!this.ctx || !this.musicFilter || !this.musicGain || !this.musicWaveShaper) return;

    const t = this.ctx.currentTime;

    const clampedDist = Math.max(2, Math.min(280, distance));
    const factor = 1 - (clampedDist - 2) / 278;

    const cutoff = 350 + Math.pow(factor, 1.5) * 4000;
    this.musicFilter.frequency.setTargetAtTime(cutoff, t, 0.15);

    const vol = (0.2 + Math.pow(factor, 1.2) * 0.8) * this.settings.musicVolume;
    this.musicGain.gain.setTargetAtTime(vol, t, 0.15);

    if (factor > 0.6) {
      const drive = (factor - 0.6) * 60;
      this.musicWaveShaper.curve = this.createDistortionCurve(drive);
    } else {
      this.musicWaveShaper.curve = this.createDistortionCurve(2);
    }
  }

  /**
   * Synthesizes the authentic mournful Goolingoo melody phrase.
   */
  private playGoolingooPhrase(phraseIndex: number) {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

    const phrases = [
      [
        { f: 196.00, dur: 2.2, slideTo: 220.00 },
        { f: 261.63, dur: 3.5, slideTo: 246.94 },
        { f: 293.66, dur: 1.8, slideTo: 311.13 },
        { f: 261.63, dur: 2.8, slideTo: 246.94 },
        { f: 196.00, dur: 3.0, slideTo: 174.61 },
      ],
      [
        { f: 311.13, dur: 2.4, slideTo: 329.63 },
        { f: 392.00, dur: 3.8, slideTo: 369.99 },
        { f: 349.23, dur: 1.6, slideTo: 311.13 },
        { f: 261.63, dur: 2.5, slideTo: 220.00 },
        { f: 196.00, dur: 3.2, slideTo: 164.81 },
      ],
      [
        { f: 130.81, dur: 4.5, slideTo: 123.47 },
        { f: 261.63, dur: 2.8, slideTo: 293.66 },
        { f: 311.13, dur: 3.2, slideTo: 261.63 },
        { f: 196.00, dur: 4.0, slideTo: 130.81 },
      ],
    ];

    const currentPhrase = phrases[phraseIndex % phrases.length];
    let offset = 0;

    currentPhrase.forEach((note) => {
      setTimeout(() => {
        if (!this.isMusicPlaying) return;
        this.playMorinKhuurNote(note.f, note.dur, note.slideTo);
      }, offset * 1000);

      offset += note.dur * 0.85;
    });

    this.playThroatDrone(currentPhrase[0].f * 0.5, offset);

    this.melodyTimer = window.setTimeout(() => {
      this.playGoolingooPhrase(phraseIndex + 1);
    }, (offset + 1.5) * 1000);
  }

  private playMorinKhuurNote(freq: number, duration: number, slideTo?: number) {
    if (!this.ctx || !this.musicFilter) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration * 0.7);
    }

    vibrato.frequency.setValueAtTime(4.8, t);
    vibratoGain.gain.setValueAtTime(freq * 0.02, t);
    vibrato.connect(osc.frequency);
    vibrato.start(t);
    vibrato.stop(t + duration);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.28, t + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(520, t);
    bodyFilter.Q.setValueAtTime(2.2, t);

    osc.connect(bodyFilter);
    bodyFilter.connect(gain);
    gain.connect(this.musicFilter);

    osc.start(t);
    osc.stop(t + duration);
  }

  private playThroatDrone(freq: number, duration: number) {
    if (!this.ctx || !this.musicFilter) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(Math.max(45, freq), t);

    oscHarmonic.type = 'sawtooth';
    oscHarmonic.frequency.setValueAtTime(Math.max(45, freq) * 3, t);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.06, t);
    oscHarmonic.connect(harmGain);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    harmGain.connect(gain);
    gain.connect(this.musicFilter);

    osc.start(t);
    oscHarmonic.start(t);
    osc.stop(t + duration);
    oscHarmonic.stop(t + duration);
  }

  // --- SOUND EFFECTS (SFX) ---

  public playDoorCreak() {
    this.init();

    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
    osc.frequency.exponentialRampToValueAtTime(110, t + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 1.3);

    setTimeout(() => {
      this.playWoodImpact(0.2);
    }, 400);
  }

  public playGerWoodCreak() {
    this.init();

    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(65, t + 0.4);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  private playWoodImpact(vol: number) {
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playFootstep(isSprinting: boolean, inWater: boolean, insideGer: boolean) {
    this.init();

    if (!this.ctx || !this.sfxGain) return;

    const now = Date.now();
    const minInterval = isSprinting ? 280 : 500;

    if (now - this.lastStepTime < minInterval) return;
    this.lastStepTime = now;

    const t = this.ctx.currentTime;

    if (inWater) {
      const buffer = this.createNoiseBuffer(0.25);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 200, t);
      filter.Q.setValueAtTime(1.8, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isSprinting ? 0.35 : 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      src.start(t);
    } else if (insideGer) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(70 + Math.random() * 20, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.1);
    } else {
      const buffer = this.createNoiseBuffer(0.12);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320 + Math.random() * 150, t);
      filter.Q.setValueAtTime(1.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isSprinting ? 0.24 : 0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      src.start(t);
    }
  }

  public updateBreathing(staminaPercent: number, isChased: boolean) {
    this.init();

    if (!this.ctx || !this.sfxGain) return;

    if (!this.isBreathing) {
      this.isBreathing = true;
      this.loopBreathing();
    }

    if (staminaPercent < 0.25 || isChased) {
      this.breathRate = 2.4;
    } else if (staminaPercent < 0.6) {
      this.breathRate = 1.6;
    } else {
      this.breathRate = 0.9;
    }
  }

  private loopBreathing() {
    if (!this.ctx || !this.sfxGain || !this.isBreathing) return;

    const t = this.ctx.currentTime;
    const inhaleDuration = 0.6 / this.breathRate;
    const exhaleDuration = 0.8 / this.breathRate;

    const noise = this.createNoiseBuffer(inhaleDuration + exhaleDuration + 0.1);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06 * this.breathRate, t + inhaleDuration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, t + inhaleDuration);
    gain.gain.linearRampToValueAtTime(
      0.08 * this.breathRate,
      t + inhaleDuration + exhaleDuration * 0.4,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      t + inhaleDuration + exhaleDuration,
    );

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(t);

    const nextCycle = (inhaleDuration + exhaleDuration + (1.2 / this.breathRate)) * 1000;
    setTimeout(() => this.loopBreathing(), nextCycle);
  }

  public playCaughtJumpscare() {
    this.init();

    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;

    // Sub-bass impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + 1.2);

    subGain.gain.setValueAtTime(0.8, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    sub.start(t);
    sub.stop(t + 1.5);

    // High discordant screech
    const screech = this.ctx.createOscillator();
    const screechGain = this.ctx.createGain();

    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(840, t);
    screech.frequency.linearRampToValueAtTime(420, t + 0.8);

    screechGain.gain.setValueAtTime(0.45, t);
    screechGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    screech.connect(screechGain);
    screechGain.connect(this.sfxGain);

    screech.start(t);
    screech.stop(t + 1.0);

    this.stopDemonMelody();
    this.stopIntroAmbient();
  }

  public playVictoryRelief() {
    this.init();
    this.stopDemonMelody();
    this.startIntroAmbient();
    // Victory screen: ambient plays softly with night wind and river water.
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');

    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    return buffer;
  }

  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }
}
