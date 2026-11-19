/**
 * High-Fidelity Procedural Textures for Goviin Gants Ail
 * Faithfully matches the visual concept art:
 * - Torn, grime-stained white deel fabric
 * - Tangled stringy black hair with alpha transparency
 * - Milky pale dead eyes with cloudy iris
 * - Dark pebbly Gobi steppe soil
 * - Luminous full moon with lunar maria and soft atmospheric halo
 */

import * as THREE from 'three';

export class ProceduralTextures {
  /**
   * Ultra-detailed Aged & Torn White Deel Robe
   * Matches the reference close-up: weathered coarse linen/wool,
   * vertical organic fabric folds, dust/soot stains, and shredded lower hem.
   */
  public static createTornDeelTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base aged bone-white cloth (#d6d2c4)
    ctx.fillStyle = '#cfcac0';
    ctx.fillRect(0, 0, 1024, 1024);

    // 1. Linen coarse fabric weave noise
    for (let i = 0; i < 90000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const val = 180 + Math.random() * 50;
      ctx.fillStyle = `rgba(${val}, ${val - 4}, ${val - 10}, 0.12)`;
      ctx.fillRect(x, y, 2, 2);
    }

    // 2. Heavy vertical cloth folds / creases (crepe drape)
    for (let x = 0; x < 1024; x += 16) {
      const offset = (Math.random() - 0.5) * 8;
      const foldGrad = ctx.createLinearGradient(x + offset - 8, 0, x + offset + 8, 0);
      foldGrad.addColorStop(0, 'rgba(50, 45, 38, 0)');
      foldGrad.addColorStop(0.5, 'rgba(45, 40, 35, 0.28)');
      foldGrad.addColorStop(1, 'rgba(50, 45, 38, 0)');
      ctx.fillStyle = foldGrad;
      ctx.fillRect(x + offset - 8, 0, 16, 1024);
    }

    // 3. Grime, dampness, and dirt streaks accumulated down the robe
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * 1024;
      const sy = 200 + Math.random() * 400;
      const length = 200 + Math.random() * 400;
      const width = 8 + Math.random() * 24;

      const streak = ctx.createLinearGradient(sx, sy, sx, sy + length);
      streak.addColorStop(0, 'rgba(40, 34, 28, 0.1)');
      streak.addColorStop(0.6, 'rgba(32, 26, 20, 0.35)');
      streak.addColorStop(1, 'rgba(20, 16, 12, 0.55)');
      ctx.fillStyle = streak;
      ctx.fillRect(sx, sy, width, length);
    }

    // 4. Heavily soiled and mud-spattered hem (bottom 35%)
    const hemGrad = ctx.createLinearGradient(0, 600, 0, 1024);
    hemGrad.addColorStop(0, 'rgba(45, 38, 30, 0)');
    hemGrad.addColorStop(0.4, 'rgba(38, 32, 24, 0.45)');
    hemGrad.addColorStop(0.85, 'rgba(25, 20, 15, 0.82)');
    hemGrad.addColorStop(1, 'rgba(15, 12, 10, 0.95)');
    ctx.fillStyle = hemGrad;
    ctx.fillRect(0, 600, 1024, 424);

    // 5. Ragged vertical tears and shredded threads
    ctx.strokeStyle = 'rgba(10, 8, 6, 0.85)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 80; i++) {
      let cx = Math.random() * 1024;
      let cy = 720 + Math.random() * 150;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      while (cy < 1024) {
        cx += (Math.random() - 0.5) * 12;
        cy += 15 + Math.random() * 25;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Tangled Stringy Black Hair Texture with Alpha Transparency
   * Individual dark clumps, messy strands, and gaps for white eyes to peer through
   */
  public static createHairTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, 512, 1024);

    // Dense black background gradient with fading edges
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    bgGrad.addColorStop(0, 'rgba(10, 10, 12, 0.98)');
    bgGrad.addColorStop(0.7, 'rgba(8, 8, 10, 0.92)');
    bgGrad.addColorStop(1, 'rgba(6, 6, 8, 0.85)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(20, 0, 472, 1024);

    // Thousands of individual long, messy, stringy hair strands
    for (let i = 0; i < 1800; i++) {
      let x = 10 + Math.random() * 492;
      let y = Math.random() * 120;
      const strandLen = 600 + Math.random() * 400;
      const alpha = 0.5 + Math.random() * 0.45;

      ctx.strokeStyle = `rgba(12, 12, 16, ${alpha})`;
      ctx.lineWidth = 1.0 + Math.random() * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y);

      const segments = 12;
      for (let s = 0; s < segments; s++) {
        x += (Math.random() - 0.5) * 14;
        y += strandLen / segments;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Subtle silvery-blue moonlight specular highlights on random outer hair strands
    for (let i = 0; i < 90; i++) {
      let x = 30 + Math.random() * 452;
      let y = 150 + Math.random() * 400;
      ctx.strokeStyle = 'rgba(145, 170, 195, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 8, y + 100 + Math.random() * 150);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  /**
   * Photorealistic Dead Pale Milky-White Eye Texture
   * Matches the concept art close-up: pure white cloudy iris, dark veined ring
   */
  public static createDeadEyeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Sclera: dark bruised grayish-white with purple/blue undertones
    ctx.fillStyle = '#8a929e';
    ctx.fillRect(0, 0, 256, 256);

    const cx = 128;
    const cy = 128;

    // Dark outer iris limbal ring
    ctx.fillStyle = '#222730';
    ctx.beginPath();
    ctx.arc(cx, cy, 76, 0, Math.PI * 2);
    ctx.fill();

    // Pale cloudy milky-white dead iris
    const irisGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 72);
    irisGrad.addColorStop(0, '#f2f6fb');
    irisGrad.addColorStop(0.5, '#d6e0ec');
    irisGrad.addColorStop(0.85, '#9faebb');
    irisGrad.addColorStop(1, '#4a5462');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 72, 0, Math.PI * 2);
    ctx.fill();

    // Dilated cloudy pupil (faint, lifeless, cloudy white-gray)
    const pupilGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
    pupilGrad.addColorStop(0, '#eaf0f8');
    pupilGrad.addColorStop(0.8, '#b8c6d4');
    pupilGrad.addColorStop(1, '#8292a4');
    ctx.fillStyle = pupilGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    // Bloodless radial fibers in dead iris
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15);
      ctx.lineTo(cx + Math.cos(angle) * 68, cy + Math.sin(angle) * 68);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Mottled Skeletal Skin with Dirt and Darkened Veins
   */
  public static createCreatureSkinTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Pale ashen corpse-grey base (#b8b8b0)
    ctx.fillStyle = '#b0b0a8';
    ctx.fillRect(0, 0, 512, 512);

    // Mottled discoloration
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const lum = 150 + Math.random() * 45;
      ctx.fillStyle = `rgba(${lum}, ${lum - 2}, ${lum - 6}, 0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Faint dark veins beneath skin
    ctx.strokeStyle = 'rgba(45, 50, 60, 0.18)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 15; i++) {
      let vx = Math.random() * 512;
      let vy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 6; s++) {
        vx += (Math.random() - 0.5) * 35;
        vy += (Math.random() - 0.5) * 35;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Dark, Stony Gobi Steppe Soil matching the concept art
   * Dark earth tones with scattered pebbles and cold moonlight specular sheen
   */
  public static createGobiGroundTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark moody desert earth (#1c1b18)
    ctx.fillStyle = '#1e1c18';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine soil grit noise
    for (let i = 0; i < 120000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const c = 24 + Math.random() * 28;
      ctx.fillStyle = `rgba(${c}, ${c - 2}, ${c - 5}, 0.22)`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Dense pebbles, gravel, and flat desert stones
    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = 1.5 + Math.random() * 4.5;
      const stoneLum = 15 + Math.random() * 35;
      ctx.fillStyle = `rgb(${stoneLum}, ${stoneLum - 1}, ${stoneLum - 3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Top highlight from moonlight
      ctx.fillStyle = 'rgba(160, 180, 205, 0.15)';
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 0.5, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(32, 32);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Luminous Full Moon Texture with Realistic Basalt Maria Plains
   */
  public static createMoonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Brilliant pale moonlight base
    ctx.fillStyle = '#f0f4fa';
    ctx.fillRect(0, 0, 512, 512);

    // Dark lunar maria (Seas of the Moon)
    const maria = [
      { x: 190, y: 160, rx: 75, ry: 60, a: 0.35 },
      { x: 300, y: 210, rx: 80, ry: 90, a: 0.40 },
      { x: 230, y: 310, rx: 90, ry: 75, a: 0.32 },
      { x: 130, y: 270, rx: 65, ry: 50, a: 0.28 },
      { x: 370, y: 160, rx: 50, ry: 45, a: 0.25 },
    ];

    maria.forEach((m) => {
      ctx.fillStyle = `rgba(105, 118, 132, ${m.a})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crater rims
    for (let i = 0; i < 200; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const r = 2 + Math.random() * 7;
      ctx.strokeStyle = 'rgba(80, 95, 110, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Water Ripple Normal Map for River
   */
  public static createWaterNormalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(256, 256);
    const data = imgData.data;

    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const nx = Math.sin((x / 256) * Math.PI * 8) * Math.cos((y / 256) * Math.PI * 4);
        const ny = Math.cos((x / 256) * Math.PI * 4) * Math.sin((y / 256) * Math.PI * 8);

        const r = Math.floor((nx * 0.5 + 0.5) * 255);
        const g = Math.floor((ny * 0.5 + 0.5) * 255);
        const b = 245;

        const idx = (y * 256 + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 2);
    return texture;
  }

  /**
   * Traditional Weathered Mongolian Felt Fabric
   */
  public static createFeltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b8b2a5';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const val = 160 + Math.random() * 40;
      ctx.fillStyle = `rgba(${val}, ${val - 4}, ${val - 8}, 0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Old Weathered Larch Wood for Ger Structure and Furniture
   */
  public static createWoodTexture(tint = '#5a4635'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(30, 22, 15, 0.3)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 512; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < 512; x += 32) {
        const offset = Math.sin((x / 512) * Math.PI * 4 + y * 0.05) * 3;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Traditional Painted Wooden Chest (Avdar) Ornament Texture
   */
  public static createMongolianOrnamentTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6b2016';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#220b08';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, 496, 496);

    ctx.strokeStyle = '#c49b28';
    ctx.lineWidth = 6;
    ctx.strokeRect(32, 32, 448, 448);

    // Center decorative diamond knot
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(256, 186);
    ctx.lineTo(326, 256);
    ctx.lineTo(256, 326);
    ctx.lineTo(186, 256);
    ctx.closePath();
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
