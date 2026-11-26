/**
 * Full-screen WebGL Shader Visual for Goolingoo Close-Up Jumpscare
 * Preloads /assets/aistudio/image_80904e6a.png and animates:
 * - Sudden close-up lunge into the player's personal space
 * - Aggressive camera shake, directional jolts & unnatural head tilt
 * - Gradual disturbing grin widening & silent laughing/breathing jaw motion
 * - Locked, glistening milky-white eyes staring straight at the player
 * - Settles cleanly to full-screen still pose (zero fade-out) for the YOU DIED screen
 */

import * as THREE from 'three';

const JUMPSCARE_TEXTURE_URL = '/assets/aistudio/image_80904e6a.png';

export class JumpscareVisual {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private texture: THREE.Texture;
  public isLoaded = false;

  public uniforms: {
    uMap: { value: THREE.Texture };
    uTime: { value: number };
    uViewportAspect: { value: number };
    uTexAspect: { value: number };
    uZoom: { value: number };
    uHeadTilt: { value: number };
    uShakeOffset: { value: THREE.Vector2 };
    uGrinExpand: { value: number };
    uJawOpen: { value: number };
    uHairWave: { value: number };
    uEyeGlint: { value: number };
    uDarkPulse: { value: number };
    uFlash: { value: number };
    uVignetteAmount: { value: number };
    uOpacity: { value: number };
  };

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const loader = new THREE.TextureLoader();
    this.texture = loader.load(JUMPSCARE_TEXTURE_URL, (tex) => {
      // Keep NoColorSpace because raw ShaderMaterial outputs directly without linear->sRGB encode pass
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      if (tex.image && tex.image.width && tex.image.height) {
        this.uniforms.uTexAspect.value = tex.image.width / tex.image.height;
      }
      this.isLoaded = true;
    });

    this.uniforms = {
      uMap: { value: this.texture },
      uTime: { value: 0 },
      uViewportAspect: { value: 16 / 9 },
      uTexAspect: { value: 1672 / 941 },
      uZoom: { value: 1.0 },
      uHeadTilt: { value: 0 },
      uShakeOffset: { value: new THREE.Vector2(0, 0) },
      uGrinExpand: { value: 0 },
      uJawOpen: { value: 0 },
      uHairWave: { value: 0 },
      uEyeGlint: { value: 0 },
      uDarkPulse: { value: 1 },
      uFlash: { value: 0 },
      uVignetteAmount: { value: 0.24 },
      uOpacity: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform float uViewportAspect;
        uniform float uTexAspect;
        uniform float uZoom;
        uniform float uHeadTilt;
        uniform vec2 uShakeOffset;
        uniform float uGrinExpand;
        uniform float uJawOpen;
        uniform float uHairWave;
        uniform float uEyeGlint;
        uniform float uDarkPulse;
        uniform float uFlash;
        uniform float uVignetteAmount;
        uniform float uOpacity;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          if (uOpacity <= 0.001) {
            discard;
          }

          // Aspect-correct cover mapping centered on image_80904e6a.png
          vec2 uv = vUv - 0.5;
          if (uViewportAspect > uTexAspect) {
            uv.y *= uTexAspect / uViewportAspect;
          } else {
            uv.x *= uViewportAspect / uTexAspect;
          }

          // Camera shake + zoom lunge + subtle unnatural head tilt around face pivot
          uv -= uShakeOffset;
          uv /= max(0.5, uZoom);

          float c = cos(uHeadTilt);
          float s = sin(uHeadTilt);
          vec2 rotUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
          vec2 texUv = rotUv + vec2(0.50, 0.50);

          // Lock upper face & eyes for image_80904e6a.png (left eye ~0.415,0.565; right eye ~0.595,0.650)
          vec2 leftEye = vec2(0.415, 0.565);
          vec2 rightEye = vec2(0.595, 0.650);
          float dLeftEye = length((texUv - leftEye) * vec2(1.0, 1.25));
          float dRightEye = length((texUv - rightEye) * vec2(1.0, 1.25));
          float eyeProtect = smoothstep(0.055, 0.135, min(dLeftEye, dRightEye));

          // Mouth & jaw local tilted coordinate frame matching Goolingoo's head tilt
          vec2 mouthCenter = vec2(0.570, 0.405);
          vec2 smileDir = normalize(vec2(0.868, 0.496)); // corner-to-corner axis
          vec2 jawDir = normalize(vec2(0.496, -0.868));  // down toward chin

          vec2 relM = texUv - mouthCenter;
          float sCoord = dot(relM, smileDir);
          float jCoord = dot(relM, jawDir);

          // Mouth/grin mask kept strictly below the eyes
          float upperCutoff = smoothstep(-0.095, -0.02, jCoord);
          float lowerCutoff = 1.0 - smoothstep(0.095, 0.21, jCoord);
          float sideMask = exp(-(sCoord * sCoord) / (0.125 * 0.125));
          float mouthMask = upperCutoff * lowerCutoff * sideMask * eyeProtect;

          // 1) Gradual sinister grin widening + subtle cheek corner curl
          float cornerSign = sign(sCoord);
          float cornerWeight = smoothstep(0.018, 0.11, abs(sCoord)) * exp(-pow(abs(sCoord) - 0.088, 2.0) / (0.058 * 0.058));
          vec2 grinPull = (smileDir * cornerSign * 0.015 - jawDir * 0.008) * cornerWeight * mouthMask * uGrinExpand;

          // 2) Lower jaw silent laughing / breathing quiver (pulls chin & lower teeth down along jawDir)
          float lowerJawMask = smoothstep(-0.01, 0.04, jCoord) * (1.0 - smoothstep(0.10, 0.21, jCoord)) * exp(-(sCoord * sCoord) / (0.095 * 0.095)) * eyeProtect;
          vec2 jawDisp = jawDir * (0.014 * uJawOpen * lowerJawMask);

          // 3) Subtle hair strand movement around outer face & forehead wisps
          float faceCoreDist = length((texUv - vec2(0.51, 0.53)) * vec2(1.15, 0.92));
          float outerHairMask = smoothstep(0.16, 0.34, faceCoreDist) * eyeProtect;
          float strandWave = sin(texUv.y * 26.0 + texUv.x * 9.0 + uTime * 7.5) * 0.55
                           + cos(texUv.y * 41.0 - uTime * 11.0) * 0.45;
          vec2 hairDisp = vec2(strandWave * 0.0075 * uHairWave * outerHairMask, 0.0);

          vec2 sampleUv = clamp(texUv - grinPull - jawDisp - hairDisp, 0.002, 0.998);
          vec3 col = texture2D(uMap, sampleUv).rgb;

          // Restrict hair displacement to dark strand regions so facial skin/edges stay razor sharp
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          if (luma > 0.14 && outerHairMask > 0.2) {
            vec2 cleanUv = clamp(texUv - grinPull - jawDisp, 0.002, 0.998);
            col = mix(col, texture2D(uMap, cleanUv).rgb, smoothstep(0.14, 0.26, luma));
          }

          // Subtle wet glint on locked milky-white eyes during active jumpscare
          float eyeIrisMask = (exp(-dLeftEye * dLeftEye * 850.0) + exp(-dRightEye * dRightEye * 850.0)) * smoothstep(0.24, 0.55, luma);
          col += vec3(0.88, 0.94, 1.0) * (eyeIrisMask * uEyeGlint * 0.16);

          // Subtle cinematic micro-chromatic edge shock during peak camera jolts
          float edgeR = length(vUv - 0.5);
          float aberration = uFlash * 0.0055 + smoothstep(0.28, 0.74, edgeR) * 0.0014 * min(1.0, uHairWave + 0.001);
          if (aberration > 0.0005) {
            col.r = mix(col.r, texture2D(uMap, clamp(sampleUv + vec2(aberration, 0.0), 0.002, 0.998)).r, 0.55);
            col.b = mix(col.b, texture2D(uMap, clamp(sampleUv - vec2(aberration, 0.0), 0.002, 0.998)).b, 0.55);
          }

          // Keep image faithful in full color; settle cleanly without darkening when jumpscare ends
          float vignette = 1.0 - smoothstep(0.42, 0.88, edgeR) * uVignetteAmount;
          float grain = (hash(vUv * 512.0 + fract(uTime * 17.3)) - 0.5) * 0.02 * uHairWave;
          col = col * vignette * uDarkPulse + vec3(grain);

          // Brief harsh impact shock burst on initial burst-in
          col += vec3(0.16, 0.04, 0.04) * uFlash;
          col = clamp(col, 0.0, 1.0);

          gl_FragColor = vec4(col, uOpacity);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  public reset() {
    this.uniforms.uOpacity.value = 0;
    this.uniforms.uTime.value = 0;
    this.uniforms.uZoom.value = 1.0;
    this.uniforms.uHeadTilt.value = 0;
    this.uniforms.uGrinExpand.value = 0;
    this.uniforms.uJawOpen.value = 0;
    this.uniforms.uHairWave.value = 0;
    this.uniforms.uEyeGlint.value = 0;
    this.uniforms.uFlash.value = 0;
    this.uniforms.uDarkPulse.value = 1;
    this.uniforms.uVignetteAmount.value = 0.24;
    this.uniforms.uShakeOffset.value.set(0, 0);
  }

  public setStillBackground(viewportAspect: number) {
    this.uniforms.uViewportAspect.value = viewportAspect;
    this.uniforms.uOpacity.value = this.isLoaded ? 1.0 : 0.0;
    this.uniforms.uZoom.value = 1.0;
    this.uniforms.uHeadTilt.value = 0;
    this.uniforms.uShakeOffset.value.set(0, 0);
    this.uniforms.uGrinExpand.value = 0;
    this.uniforms.uJawOpen.value = 0;
    this.uniforms.uHairWave.value = 0;
    this.uniforms.uEyeGlint.value = 0;
    this.uniforms.uDarkPulse.value = 1.0;
    this.uniforms.uFlash.value = 0;
    this.uniforms.uVignetteAmount.value = 0.0;
  }

  public update(elapsed: number, viewportAspect: number) {
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uViewportAspect.value = viewportAspect;

    if (!this.isLoaded) {
      this.uniforms.uOpacity.value = 0;
      return;
    }

    // Immediate full-screen replacement at catch impact (t = 0.00s) — zero delay or crossfade
    this.uniforms.uOpacity.value = 1.0;

    const activeTime = Math.max(0, elapsed);

    // Smoothly settle motion & distortion between 3.25s and 3.75s so the exact same image
    // remains completely visible and still beneath the fading-in YOU DIED + Play Again UI
    const settleWeight = 1.0 - THREE.MathUtils.smoothstep(elapsed, 3.25, 3.75);

    // 1. Sudden lunge scale + creep + aggressive impact zoom jolts (settling cleanly to 1.0)
    const lungeCurve = 1.0 - Math.pow(1.0 - Math.min(1, activeTime / 0.18), 3.0);
    const creep = Math.min(1, activeTime / 3.1) * 0.10;
    const joltEnvelope =
      Math.exp(-Math.pow((activeTime - 0.02) * 15.0, 2.0)) * 0.095 +
      Math.exp(-Math.pow((activeTime - 0.58) * 11.0, 2.0)) * 0.055 +
      Math.exp(-Math.pow((activeTime - 1.32) * 10.0, 2.0)) * 0.048 +
      Math.exp(-Math.pow((activeTime - 2.12) * 9.5, 2.0)) * 0.04;
    const targetZoom = 0.94 + lungeCurve * 0.17 + creep + joltEnvelope;
    this.uniforms.uZoom.value = THREE.MathUtils.lerp(1.0, targetZoom, settleWeight);

    // 2. Unnatural eerie head tilt + twitchy spasms (settling to 0)
    const tiltProgress = THREE.MathUtils.smoothstep(activeTime, 0.20, 2.1);
    const baseTilt = THREE.MathUtils.lerp(-0.028, 0.068, tiltProgress);
    const tiltTwitch =
      Math.sin(activeTime * 21.0) * 0.008 * Math.exp(-activeTime * 0.35) +
      Math.sin(activeTime * 4.0) * 0.011;
    this.uniforms.uHeadTilt.value = (baseTilt + tiltTwitch) * settleWeight;

    // 3. Aggressive irregular camera shake & directional jolts
    const initialViolence = Math.exp(-activeTime * 2.0) * 0.028;
    const sustainedTremor = 0.0095;
    const shakeAmp = (initialViolence + sustainedTremor + joltEnvelope * 0.18) * settleWeight;

    const sx =
      (Math.sin(activeTime * 51.3) * 0.55 +
        Math.cos(activeTime * 83.1 + 1.3) * 0.3 +
        Math.sin(activeTime * 119.7) * 0.15) *
      shakeAmp;
    const sy =
      (Math.cos(activeTime * 57.9 + 0.7) * 0.55 +
        Math.sin(activeTime * 93.3) * 0.3 +
        Math.cos(activeTime * 131.1) * 0.15) *
      shakeAmp;
    this.uniforms.uShakeOffset.value.set(
      THREE.MathUtils.clamp(sx, -0.032, 0.032),
      THREE.MathUtils.clamp(sy, -0.032, 0.032)
    );

    // 4. Gradual disturbing grin widening + silent laugh/breath jaw motion (settles cleanly)
    this.uniforms.uGrinExpand.value =
      THREE.MathUtils.smoothstep(activeTime, 0.14, 2.4) * settleWeight;

    const laughPulse =
      Math.max(0, Math.sin(activeTime * 15.0) * 0.5 + 0.5) *
      THREE.MathUtils.smoothstep(activeTime, 0.30, 0.60) *
      (1.0 - THREE.MathUtils.smoothstep(activeTime, 2.45, 3.2)) *
      0.6;
    const slowBreath = (Math.sin(activeTime * 3.2 - 0.5) * 0.5 + 0.5) * 0.4;
    this.uniforms.uJawOpen.value = (laughPulse + slowBreath) * settleWeight;

    // 5. Hair strand flutter & locked eye cold glint
    this.uniforms.uHairWave.value = (0.8 + Math.sin(activeTime * 5.2) * 0.2) * settleWeight;
    this.uniforms.uEyeGlint.value = (0.55 + Math.sin(activeTime * 8.0) * 0.25) * settleWeight;

    // 6. Brief impact flash & subtle dark shock pulses (no fade out at end)
    this.uniforms.uFlash.value = Math.exp(-activeTime * 16.0) * settleWeight;
    const flicker =
      Math.sin(activeTime * 31.0) > 0.88 && activeTime < 2.75 ? 0.84 : 1.0;
    this.uniforms.uDarkPulse.value = THREE.MathUtils.lerp(1.0, flicker, settleWeight);
    this.uniforms.uVignetteAmount.value = 0.24 * settleWeight;
  }

  public isOpaque(): boolean {
    return this.isLoaded && this.uniforms.uOpacity.value >= 0.999;
  }

  public render(renderer: THREE.WebGLRenderer) {
    if (this.uniforms.uOpacity.value <= 0.001) return;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }

  public dispose() {
    this.quad.geometry.dispose();
    this.quad.material.dispose();
    this.texture.dispose();
  }
}
