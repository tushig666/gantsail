/**
 * River System Builder for Goviin Gants Ail
 * Restores the original dark, translucent, moonlit physical river water
 * embedded naturally at ground/feet level inside the meandering riverbed.
 */

import * as THREE from 'three';

export interface RiverInstance {
  riverGroup: THREE.Group;
  waterMesh: THREE.Mesh;
  waterLevel: number;
  updateWater: (delta: number) => void;
  isPlayerInWater: (pos: THREE.Vector3) => boolean;
  isPlayerPastRiver: (pos: THREE.Vector3) => boolean;
  getWaterDepth: (pos: THREE.Vector3) => number;
  demonStopZ: number;
}

/**
 * Seamless multi-directional river ripple normal map (avoids boxy grid ovals).
 */
function createOrganicRiverRippleNormalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const TAU = Math.PI * 2;
  const h = (u: number, v: number) =>
    Math.sin((u * 2 + v * 3) * TAU) * 0.45 +
    Math.sin((u * 3 - v * 2) * TAU + 1.1) * 0.35 +
    Math.sin((u * 5 + v * 4) * TAU + 2.4) * 0.22 +
    Math.cos((u * 4 - v * 6) * TAU + 0.6) * 0.18 +
    Math.sin((u * 7 + v * 9) * TAU + 1.9) * 0.1;

  const eps = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dhdu = (h(u + eps, v) - h(u - eps, v)) / (2 * eps);
      const dhdv = (h(u, v + eps) - h(u, v - eps)) / (2 * eps);

      const scale = 0.022;
      let nx = -dhdu * scale;
      let ny = -dhdv * scale;
      let nz = 1.0;
      const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(42, 5);
  return texture;
}

/**
 * Generates a subtle nocturnal sky + NW full-moon reflection map applied ONLY
 * to the water surface so ripples catch natural silver moonlight glints
 * while keeping the water dark and leaving the ger interior untouched.
 */
function createRiverMoonSkyReflectionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep midnight nocturnal gradient with subtle cool slate near horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 256);
  skyGrad.addColorStop(0.0, '#040914');
  skyGrad.addColorStop(0.35, '#0b182b');
  skyGrad.addColorStop(0.49, '#172b45');
  skyGrad.addColorStop(0.51, '#060c16');
  skyGrad.addColorStop(1.0, '#020408');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Concentrated silver-white moonlight disk & tight halo aligned with NW moon (-80, 140, -320)
  const moonGlow = ctx.createRadialGradient(76, 66, 2, 76, 66, 56);
  moonGlow.addColorStop(0.0, 'rgba(242, 248, 255, 1.0)');
  moonGlow.addColorStop(0.22, 'rgba(180, 210, 240, 0.62)');
  moonGlow.addColorStop(0.58, 'rgba(72, 108, 152, 0.16)');
  moonGlow.addColorStop(1.0, 'rgba(8, 16, 30, 0.0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, 512, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RiverBuilder {
  public static build(): RiverInstance {
    const riverGroup = new THREE.Group();
    riverGroup.name = 'RiverSystem';

    // River coordinates: Center Z = -220 along main path, recessed waterLevel = -0.92m
    // (sits cleanly below the -0.30m riverbanks & -0.70m approach edge at z = -205)
    const riverLength = 440;
    const riverWidth = 32;
    const waterLevel = -0.92;
    const demonStopZ = -205; // Demon halts here at the riverbank

    const getRiverCenterZ = (x: number): number =>
      -220 + Math.sin(x * 0.032) * 2.5 + Math.sin(x * 0.075) * 0.7;

    const waterGeo = new THREE.PlaneGeometry(riverLength, riverWidth, 120, 22);
    waterGeo.rotateX(-Math.PI / 2);

    // Follow the exact meandering channel so edges remain tucked beneath both sloped banks
    const waterPosAttr = waterGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < waterPosAttr.count; i++) {
      const lx = waterPosAttr.getX(i);
      const lz = waterPosAttr.getZ(i);
      const meanderOffset = getRiverCenterZ(lx) - (-220);
      waterPosAttr.setZ(i, lz + meanderOffset);
    }
    waterGeo.computeVertexNormals();

    const waterNormalTex = createOrganicRiverRippleNormalTexture();

    const riverSkyEnv = createRiverMoonSkyReflectionTexture();
    const waveUniforms = {
      uTime: { value: 0 },
    };

    // Original physical nocturnal river: dark translucent water with clearcoat moonlight glints
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1d2e,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 0.95,
      clearcoatRoughness: 0.12,
      ior: 1.333,
      reflectivity: 0.92,
      envMap: riverSkyEnv,
      envMapIntensity: 1.18,
      normalMap: waterNormalTex,
      normalScale: new THREE.Vector2(0.88, 0.88),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waveUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
transformed.y += sin(transformed.x * 0.35 + uTime * 1.35) * 0.014
               + cos(transformed.z * 0.55 - uTime * 1.1) * 0.011;`
        );
    };

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, waterLevel, -220);
    waterMesh.receiveShadow = true;
    waterMesh.renderOrder = 1;
    riverGroup.add(waterMesh);

    // Slender natural riverbank reeds grounded along both curving shorelines
    const reedGeo = new THREE.CylinderGeometry(0.008, 0.022, 0.72, 5);
    reedGeo.translate(0, 0.36, 0);
    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x2b3127,
      roughness: 0.92,
    });

    const reedInstances = new THREE.InstancedMesh(reedGeo, reedMat, 320);
    const dummy = new THREE.Object3D();
    let rCount = 0;

    for (let i = 0; i < 320; i++) {
      const rx = (Math.random() - 0.5) * 340;
      const centerZ = getRiverCenterZ(rx);
      const onNearBank = Math.random() > 0.5;
      const rz = onNearBank
        ? centerZ + 12.1 + Math.random() * 1.7
        : centerZ - 12.1 - Math.random() * 1.7;
      const ry = waterLevel - 0.14;

      dummy.position.set(rx, ry, rz);
      dummy.scale.set(0.8 + Math.random() * 0.5, 0.65 + Math.random() * 0.65, 0.8 + Math.random() * 0.5);
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
      dummy.updateMatrix();
      reedInstances.setMatrixAt(rCount, dummy.matrix);
      rCount++;
    }
    reedInstances.count = rCount;
    reedInstances.instanceMatrix.needsUpdate = true;
    reedInstances.computeBoundingSphere();
    riverGroup.add(reedInstances);

    // Steady downstream current & gentle surface ripple animation
    let flowOffset = 0;
    const updateWater = (delta: number) => {
      flowOffset += delta * 0.09;
      waveUniforms.uTime.value += delta;
      waterNormalTex.offset.x = flowOffset;
      waterNormalTex.offset.y = Math.sin(flowOffset * 0.7) * 0.04;
    };

    const isPlayerInWater = (pos: THREE.Vector3): boolean => {
      const centerZ = getRiverCenterZ(pos.x);
      return pos.z <= centerZ + 13 && pos.z >= centerZ - 13;
    };

    const isPlayerPastRiver = (pos: THREE.Vector3): boolean => {
      // Reached safe northern bank across the river
      const centerZ = getRiverCenterZ(pos.x);
      return pos.z < centerZ - 14;
    };

    const getWaterDepth = (pos: THREE.Vector3): number => {
      if (!isPlayerInWater(pos)) return 0;
      const centerZ = getRiverCenterZ(pos.x);
      const distFromCenter = Math.abs(pos.z - centerZ);
      return Math.max(0, 0.98 - (distFromCenter / 13) * 0.78);
    };

    return {
      riverGroup,
      waterMesh,
      waterLevel,
      updateWater,
      isPlayerInWater,
      isPlayerPastRiver,
      getWaterDepth,
      demonStopZ,
    };
  }
}
