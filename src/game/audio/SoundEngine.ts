/**
 * Procedural Web Audio Sound Engine for Goviin Gants Ail
 * Zero external audio files required. Completely synthesized in real time.
 */

import { GameSettings } from '../types';

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

  // Ambient Nodes
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isWindActive = false;

  private riverGain: GainNode | null = null;
  private isRiverActive = false;

  private breathGain: GainNode | null = null;
  private breathOsc: OscillatorNode | null = null;
  private isBreathing = false;
  private breathRate = 1.0; // 1 = calm, 2.5 = panicked

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
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      this.musicFilter.frequency.setValueAtTime(450, this.ctx.currentTime); // muffled when far
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
  }

  // --- AMBIENT SOUNDS ---

  private startWindAmbience() {
    if (!this.ctx || !this.sfxGain || this.isWindActive) return;

    // Filtered pink noise buffer for howling Gobi wind
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

    // Modulate wind howling pitch
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

    // Highpass filtered bubbling white noise for water rushing
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
    this.riverGain.gain.setValueAtTime(0.01, this.ctx.currentTime); // silent when far from river

    noise.connect(filter);
    filter.connect(this.riverGain);
    this.riverGain.connect(this.sfxGain);

    noise.start();
    this.isRiverActive = true;
  }

  public updateRiverProximity(distanceToRiver: number) {
    if (!this.ctx || !this.riverGain) return;
    // River becomes audibly louder within 80m, very prominent within 20m
    const norm = Math.max(0, Math.min(1, 1 - (distanceToRiver - 5) / 80));
    const targetVol = norm * 0.55;
    this.riverGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
  }

  // --- GOOLINGOO-INSPIRED HORROR MELODY ---

  public startDemonMelody() {
    if (this.isMusicPlaying) return;
    this.init();
    this.isMusicPlaying = true;
    this.playGoolingooPhrase(0);
  }

  public stopDemonMelody() {
    this.isMusicPlaying = false;
    if (this.melodyTimer) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2);
    }
  }

  public updateDemonDistanceAudio(distance: number) {
    if (!this.ctx || !this.musicFilter || !this.musicGain || !this.musicWaveShaper) return;
    const t = this.ctx.currentTime;

    // Distance ranges from 280m (quiet, muffled) down to 2m (intense, screaming overtone)
    const clampedDist = Math.max(2, Math.min(280, distance));
    const factor = 1 - (clampedDist - 2) / 278; // 0 = far, 1 = right behind

    // Lowpass cutoff: 350Hz (distant) -> 4500Hz (close)
    const cutoff = 350 + Math.pow(factor, 1.5) * 4000;
    this.musicFilter.frequency.setTargetAtTime(cutoff, t, 0.15);

    // Volume scaling
    const vol = (0.2 + Math.pow(factor, 1.2) * 0.8) * this.settings.musicVolume;
    this.musicGain.gain.setTargetAtTime(vol, t, 0.15);

    // Distortion increases dramatically as demon closes in
    if (factor > 0.6) {
      const drive = (factor - 0.6) * 60;
      this.musicWaveShaper.curve = this.createDistortionCurve(drive);
    } else {
      this.musicWaveShaper.curve = this.createDistortionCurve(2);
    }
  }

  /**
   * Synthesizes the authentic mournful Goolingoo melody phrase.
   * Goolingoo traditional melody notes in Eb minor / C minor pentatonic:
   * Notes with characteristic crying slides (morin khuur bowed harmonics)
   */
  private playGoolingooPhrase(phraseIndex: number) {
    if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

    // Pentatonic haunting motif pitches in Hz:
    // C3, Eb3, F3, G3, Bb3, C4, Eb4, D4, C4
    const phrases = [
      [
        { f: 196.00, dur: 2.2, slideTo: 220.00 }, // G3 slide
        { f: 261.63, dur: 3.5, slideTo: 246.94 }, // C4 lingering mournful note
        { f: 293.66, dur: 1.8, slideTo: 311.13 }, // D4 -> Eb4
        { f: 261.63, dur: 2.8, slideTo: 246.94 }, // C4
        { f: 196.00, dur: 3.0, slideTo: 174.61 }, // G3 -> F3 long fade
      ],
      [
        { f: 311.13, dur: 2.4, slideTo: 329.63 }, // Eb4 weeping
        { f: 392.00, dur: 3.8, slideTo: 369.99 }, // G4 high sorrow note
        { f: 349.23, dur: 1.6, slideTo: 311.13 }, // F4 -> Eb4
        { f: 261.63, dur: 2.5, slideTo: 220.00 }, // C4 -> A3
        { f: 196.00, dur: 3.2, slideTo: 164.81 }, // G3 -> E3
      ],
      [
        { f: 130.81, dur: 4.5, slideTo: 123.47 }, // Deep C3 throat drone note
        { f: 261.63, dur: 2.8, slideTo: 293.66 }, // C4 -> D4
        { f: 311.13, dur: 3.2, slideTo: 261.63 }, // Eb4 -> C4
        { f: 196.00, dur: 4.0, slideTo: 130.81 }, // G3 -> C3
      ]
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

    // Also trigger low throat-drone backing chord
    this.playThroatDrone(currentPhrase[0].f * 0.5, offset);

    // Schedule next phrase after current finishes
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

    // Morin Khuur has rich bowed harmonics like a cello/horsehead fiddle: sawtooth
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration * 0.7);
    }

    // Morin khuur vibrato (slow, expressive folk vibrato)
    vibrato.frequency.setValueAtTime(4.8, t);
    vibratoGain.gain.setValueAtTime(freq * 0.02, t);
    vibrato.connect(osc.frequency);
    vibrato.start(t);
    vibrato.stop(t + duration);

    // Envelope
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.28, t + duration * 0.25); // slow bow attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Formant filter for wooden body resonance
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
    oscHarmonic.frequency.setValueAtTime(Math.max(45, freq) * 3, t); // overtone 3rd harmonic

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
    // Frequency sweeps down and up like a heavy rustic wood hinge groaning
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

    // Latch click at end
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
      // Water splash step
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
      // Wood floor / felt carpet muffled thud
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
      // Dry earth / gravel crunch
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
      this.breathRate = 2.4; // fast, panicked panting
    } else if (staminaPercent < 0.6) {
      this.breathRate = 1.6;
    } else {
      this.breathRate = 0.9; // quiet, slow breath
    }
  }

  private loopBreathing() {
    if (!this.ctx || !this.sfxGain || !this.isBreathing) return;

    const t = this.ctx.currentTime;
    const inhaleDuration = 0.6 / this.breathRate;
    const exhaleDuration = 0.8 / this.breathRate;

    // Breath inhale (filtered air noise)
    const noise = this.createNoiseBuffer(inhaleDuration + exhaleDuration + 0.1);
    const src = this.ctx.createBufferSource();
    src.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    // Inhale
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.06 * this.breathRate, t + inhaleDuration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, t + inhaleDuration);
    // Exhale
    gain.gain.linearRampToValueAtTime(0.08 * this.breathRate, t + inhaleDuration + exhaleDuration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + inhaleDuration + exhaleDuration);

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

    // 1. Sub-bass massive impact
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

    // 2. High discordant screech
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

    // Stop melody abruptly
    this.stopDemonMelody();
  }

  public playVictoryRelief() {
    this.init();
    this.stopDemonMelody();
    // Complete silence except night wind and gentle river water
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

  private createDistortionCurve(amount: number): any {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const buffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
