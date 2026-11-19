/**
 * Gobi Desert Steppe Environment Builder
 * Vast moonlit terrain, dense realistic low-height instanced steppe grass with
 * natural + demon-driven directional wind shaders, desert stones,
 * distant mountain silhouettes, and celestial sky with bright full moon.
 */

import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures';

export interface TerrainInstance {
  terrainMesh: THREE.Mesh;
  getHeightAt: (x: number, z: number) => number;
  updateFoliageWind: (
    time: number,
    demonPos?: THREE.Vector3,
    playerPos?: THREE.Vector3,
    demonWindStrength?: number
  ) => void;
  environmentGroup: THREE.Group;
  moonMesh: THREE.Mesh;
  moonLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
}

/**
 * Builds a wider, denser multi-blade curved Gobi steppe grass cluster (~0.70m natural tussock)
 * with 2-segment tapered blades (zero geometric cones/pyramids).
 */
function createSteppeGrassTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bladeConfigs = [
    { angle: 0.1, ox: 0.0, oz: 0.0, height: 0.36, width: 0.026, lean: 0.11 },
    { angle: 0.9, ox: 0.14, oz: 0.08, height: 0.31, width: 0.024, lean: 0.15 },
    { angle: 1.7, ox: -0.11, oz: 0.15, height: 0.38, width: 0.025, lean: 0.13 },
    { angle: 2.5, ox: -0.18, oz: -0.05, height: 0.27, width: 0.023, lean: 0.16 },
    { angle: 3.3, ox: 0.06, oz: -0.17, height: 0.34, width: 0.024, lean: 0.14 },
    { angle: 4.1, ox: 0.21, oz: -0.08, height: 0.25, width: 0.022, lean: 0.18 },
    { angle: 4.9, ox: -0.04, oz: 0.22, height: 0.32, width: 0.024, lean: 0.14 },
    { angle: 5.7, ox: -0.22, oz: 0.11, height: 0.29, width: 0.023, lean: 0.17 },
    { angle: 2.9, ox: 0.03, oz: 0.04, height: 0.4, width: 0.024, lean: 0.09 },
  ];

  const segments = 2;
  let vertexOffset = 0;

  for (const cfg of bladeConfigs) {
    const cosA = Math.cos(cfg.angle);
    const sinA = Math.sin(cfg.angle);
    const tx = -sinA;
    const tz = cosA;

    for (let s = 0; s <= segments; s++) {
      const t = s / segments; // 0 at root, 1 at tip
      const y = t * cfg.height;
      const arch = t * t * cfg.lean;
      const cx = cfg.ox + cosA * arch;
      const cz = cfg.oz + sinA * arch;
      const halfW = cfg.width * 0.5 * (1.0 - t * 0.88);

      positions.push(cx - tx * halfW, y, cz - tz * halfW);
      positions.push(cx + tx * halfW, y, cz + tz * halfW);

      normals.push(cosA * 0.35, 0.9, sinA * 0.35);
      normals.push(cosA * 0.35, 0.9, sinA * 0.35);

      uvs.push(0, t);
      uvs.push(1, t);

      if (s < segments) {
        const b0 = vertexOffset + s * 2;
        const b1 = b0 + 1;
        const t0 = b0 + 2;
        const t1 = b0 + 3;
        indices.push(b0, b1, t0);
        indices.push(b1, t1, t0);
      }
    }

    vertexOffset += (segments + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export class TerrainBuilder {
  public static build(): TerrainInstance {
    const environmentGroup = new THREE.Group();
    environmentGroup.name = 'GobiEnvironment';

    // 1. TERRAIN MESH
    // Dimensions: 460m wide (X), 560m deep (Z)
    // Ger is at (0, 0, 0). River center is at Z = -220m.
    const terrainWidth = 460;
    const terrainDepth = 560;
    const segmentsX = 140;
    const segmentsZ = 160;

    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, segmentsX, segmentsZ);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;

    // Organic river meander: centered at Z = -220 along main approach, curving naturally east/west
    const getRiverCenterZ = (x: number): number =>
      -220 + Math.sin(x * 0.032) * 2.5 + Math.sin(x * 0.075) * 0.7;

    // Mathematical elevation function: gentle Gobi undulations, embedded river valley, flat ger clearing
    const computeHeight = (x: number, z: number): number => {
      // Flat clearing around Ger (radius 18m)
      const distFromGer = Math.sqrt(x * x + z * z);
      let flattenFactor = 1.0;
      if (distFromGer < 18) {
        flattenFactor = Math.max(0, (distFromGer - 6) / 12);
      }

      // Gentle rolling steppe noise
      let h =
        (Math.sin(x * 0.015) * 1.8 +
          Math.cos(z * 0.012) * 2.2 +
          Math.sin((x + z) * 0.025) * 1.1) *
        flattenFactor;

      // Embed the river channel cleanly below natural riverbank elevation (waterLevel = -0.92)
      const distToRiverZ = Math.abs(z - getRiverCenterZ(x));
      if (distToRiverZ < 46) {
        const bankBase = -0.3 + Math.sin(x * 0.04) * 0.09 + Math.cos(z * 0.08) * 0.04;
        let valleyBlend = 0;
        if (distToRiverZ > 18) {
          const u = (distToRiverZ - 18) / 28;
          valleyBlend = u * u * (3 - 2 * u);
        }
        h = bankBase + (h - bankBase) * valleyBlend;

        if (distToRiverZ < 22) {
          const t = distToRiverZ / 22;
          const basin = 0.5 + 0.5 * Math.cos(t * Math.PI);
          h -= basin * 1.6;
        }
      }

      // Distant rolling mountain ridges on borders
      if (Math.abs(x) > 160 || z < -360 || z > 160) {
        const edgeDist = Math.max(Math.abs(x) - 160, Math.max(-360 - z, z - 160));
        h += Math.pow(edgeDist * 0.08, 1.4) * (2.0 + Math.sin(x * 0.05) * 1.5);
      }

      return h;
    };

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = computeHeight(x, z);
      posAttr.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const groundTexture = ProceduralTextures.createGobiGroundTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.92,
      metalness: 0.04,
      color: 0x8a8475,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    environmentGroup.add(terrainMesh);

    // 2. DENSE REALISTIC LOW-HEIGHT GOBI STEPPE GRASS WITH WIND & DEMON WIND PHYSICS
    const grassCount = 30000;
    const grassGeo = createSteppeGrassTuftGeometry();

    const windUniforms = {
      uTime: { value: 0 },
      uDemonPos: { value: new THREE.Vector3(0, 0, -110) },
      uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
      uDemonWind: { value: 0 },
    };

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.uniforms.uDemonPos = windUniforms.uDemonPos;
      shader.uniforms.uPlayerPos = windUniforms.uPlayerPos;
      shader.uniforms.uDemonWind = windUniforms.uDemonWind;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
uniform vec3 uDemonPos;
uniform vec3 uPlayerPos;
uniform float uDemonWind;`
        )
        .replace(
          '#include <project_vertex>',
          `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  vec3 instWorldBase = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#else
  vec3 instWorldBase = vec3(0.0);
#endif

// Height factor along grass blade (root = 0 pinned to ground, tip = 1 sways freely)
float hFrac = clamp(transformed.y / 0.40, 0.0, 1.0);
float bendWeight = hFrac * hFrac;

// Per-tuft deterministic phase so blades never sway in robotic unison
float ph = fract(sin(dot(instWorldBase.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;

// 1. Subtle natural Gobi steppe night breeze (slowly shifting direction & travelling gusts)
float windAngle = 0.42 + sin(uTime * 0.11) * 0.36;
vec2 breezeDir = vec2(cos(windAngle), sin(windAngle));
vec2 breezePerp = vec2(-breezeDir.y, breezeDir.x);

float gustWave = sin(dot(instWorldBase.xz, breezeDir) * 0.22 - uTime * 1.45 + ph * 0.4)
               + 0.45 * cos(dot(instWorldBase.xz, breezePerp) * 0.31 - uTime * 0.95 + ph * 0.6);
float flutter = sin(uTime * 2.7 + ph) * 0.35;
vec2 normalDisp = breezeDir * (0.024 + 0.03 * gustWave) + breezePerp * (0.014 * flutter);

// 2. Demon-driven directional wind (travels from Demon toward Player & immediate path)
vec2 fromDemon = instWorldBase.xz - uDemonPos.xz;
float distToDemon = length(fromDemon);
vec2 awayDir = distToDemon > 0.05 ? fromDemon / distToDemon : vec2(0.0, 1.0);

vec2 toPlayer = uPlayerPos.xz - uDemonPos.xz;
float dpLen = length(toPlayer);
vec2 chaseDir = dpLen > 0.1 ? toPlayer / dpLen : vec2(0.0, 1.0);

float corridorAlign = max(0.0, dot(awayDir, chaseDir));
float proxMask = smoothstep(32.0, 2.5, distToDemon);
float pathMask = smoothstep(56.0, 5.0, distToDemon) * pow(corridorAlign, 2.2) * 0.9;
float demonMask = clamp(max(proxMask, pathMask), 0.0, 1.0) * uDemonWind;

vec2 demonWindDir = normalize(mix(awayDir, chaseDir, 0.58) + vec2(0.0001));
float demonSurge = 0.72 + 0.28 * sin(distToDemon * 0.55 - uTime * 6.4 + ph * 0.35);
vec2 demonDisp = demonWindDir * (0.19 * demonMask * demonSurge);

vec2 totalDisp = (normalDisp + demonDisp) * bendWeight;
mvPosition.xz += totalDisp;
mvPosition.y -= length(totalDisp) * 0.32 * bendWeight;

mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`
        );
    };

    const instancedGrass = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    instancedGrass.receiveShadow = true;
    instancedGrass.castShadow = false;

    const dummy = new THREE.Object3D();
    const grassColorPalette = [
      new THREE.Color(0x4d4634), // dry steppe straw
      new THREE.Color(0x413c2d), // muted dry grass
      new THREE.Color(0x373d2f), // sage-ash grass
      new THREE.Color(0x58503a), // pale dry hay patch
      new THREE.Color(0x2e3225), // dark sparse steppe scrub
    ];
    const tmpColor = new THREE.Color();
    let placed = 0;

    for (let i = 0; i < grassCount; i++) {
      // Dense coverage across the playable steppe & near ger/riverbanks, plus broad surrounding ground
      const inMainZone = i < grassCount * 0.72;
      const inOuterZone = i >= grassCount * 0.72 && i < grassCount * 0.9;
      let gx: number;
      let gz: number;
      if (inMainZone) {
        gx = (Math.random() - 0.5) * 145;
        gz = -255 + Math.random() * 295;
      } else if (inOuterZone) {
        gx = (Math.random() - 0.5) * 280;
        gz = -315 + Math.random() * 400;
      } else {
        // Extra dense ring around the ger exterior & approach path
        const ang = Math.random() * Math.PI * 2;
        const rad = 5.2 + Math.random() * 42;
        gx = Math.cos(ang) * rad;
        gz = Math.sin(ang) * rad - 8;
      }

      // Organic irregularity & occasional natural stony soil clearings (~12% gaps)
      const patchSignal =
        Math.sin(gx * 0.085) * Math.cos(gz * 0.08) +
        0.55 * Math.sin((gx - gz) * 0.16) +
        0.35 * Math.cos((gx + gz) * 0.28);
      if (patchSignal < -1.05 && Math.random() > 0.25) continue;

      // Exclude ger interior/foundation (radius 5.1m) and submerged river channel
      const distFromGer = Math.sqrt(gx * gx + gz * gz);
      const distFromRiver = Math.abs(gz - getRiverCenterZ(gx));
      if (distFromGer < 5.1 || distFromRiver < 13.2) continue;

      const gy = computeHeight(gx, gz);
      if (gy < -0.82) continue;

      dummy.position.set(gx, gy - 0.02, gz);

      // Slightly taller, realistic steppe grass (0.22m - 0.52m) with organic clump variation
      const isDryPatch = patchSignal > 0.35;
      const xzScale = 0.85 + Math.random() * 0.65;
      const yScale = isDryPatch ? 0.88 + Math.random() * 0.48 : 0.68 + Math.random() * 0.54;
      dummy.scale.set(xzScale, yScale, xzScale);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.14,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.14
      );
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(placed, dummy.matrix);

      const baseIdx = isDryPatch
        ? Math.random() < 0.6
          ? 0
          : 3
        : Math.floor(Math.random() * grassColorPalette.length);
      tmpColor.copy(grassColorPalette[baseIdx]);
      const shadeJitter = 0.85 + Math.random() * 0.3;
      tmpColor.multiplyScalar(shadeJitter);
      instancedGrass.setColorAt(placed, tmpColor);

      placed++;
    }
    instancedGrass.count = placed;
    instancedGrass.instanceMatrix.needsUpdate = true;
    if (instancedGrass.instanceColor) instancedGrass.instanceColor.needsUpdate = true;
    instancedGrass.computeBoundingSphere();
    environmentGroup.add(instancedGrass);

    // 3. INSTANCED DESERT STONES & PEBBLES
    const rockCount = 450;
    const rockGeo = new THREE.DodecahedronGeometry(0.35, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x3d3932,
      roughness: 0.85,
      metalness: 0.1,
    });
    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    let rockPlaced = 0;

    for (let i = 0; i < rockCount; i++) {
      const rx = (Math.random() - 0.5) * 340;
      const rz = -340 + Math.random() * 440;
      const distFromGer = Math.sqrt(rx * rx + rz * rz);
      if (distFromGer < 6) continue;

      const ry = computeHeight(rx, rz);
      dummy.position.set(rx, ry + 0.06, rz);
      dummy.scale.set(
        0.5 + Math.random() * 0.8,
        0.25 + Math.random() * 0.42,
        0.5 + Math.random() * 0.8
      );
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      instancedRocks.setMatrixAt(rockPlaced, dummy.matrix);
      rockPlaced++;
    }
    instancedRocks.count = rockPlaced;
    instancedRocks.instanceMatrix.needsUpdate = true;
    instancedRocks.computeBoundingSphere();
    environmentGroup.add(instancedRocks);

    // 4. SKY DOME & STARRY NIGHT
    const starCount = 1800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 380;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.max(15, Math.abs(r * Math.cos(phi))); // keep above horizon
      const z = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe8eff8,
      size: 1.4,
      transparent: true,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    environmentGroup.add(starPoints);

    // 5. BRIGHT FULL MOON (Dominant light source in the North-West sky)
    const moonPos = new THREE.Vector3(-80, 140, -320);
    const moonTexture = ProceduralTextures.createMoonTexture();
    const moonGeo = new THREE.SphereGeometry(18, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      map: moonTexture,
      color: 0xffffff,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.copy(moonPos);
    environmentGroup.add(moonMesh);

    // Moon Glow Halo (soft radial sprite)
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hctx = haloCanvas.getContext('2d')!;
    const hgrad = hctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    hgrad.addColorStop(0, 'rgba(180, 205, 235, 0.8)');
    hgrad.addColorStop(0.35, 'rgba(140, 175, 215, 0.25)');
    hgrad.addColorStop(1, 'rgba(10, 15, 28, 0)');
    hctx.fillStyle = hgrad;
    hctx.fillRect(0, 0, 128, 128);

    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    const moonHalo = new THREE.Sprite(haloMat);
    moonHalo.position.copy(moonPos);
    moonHalo.scale.set(70, 70, 1);
    environmentGroup.add(moonHalo);

    // 6. MOONLIGHT DIRECTIONAL LIGHT (Key Light)
    const moonLight = new THREE.DirectionalLight(0xb2c6dc, 2.8);
    moonLight.position.set(-60, 120, -260);
    moonLight.target.position.set(0, 0, -100);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 450;
    const shadowD = 180;
    moonLight.shadow.camera.left = -shadowD;
    moonLight.shadow.camera.right = shadowD;
    moonLight.shadow.camera.top = shadowD;
    moonLight.shadow.camera.bottom = -shadowD;
    moonLight.shadow.bias = -0.0004;
    moonLight.shadow.normalBias = 0.02;

    environmentGroup.add(moonLight);
    environmentGroup.add(moonLight.target);

    // Cool Hemisphere Night Fill (subtle sky bounce outdoors; attenuated indoors)
    const hemiLight = new THREE.HemisphereLight(0x132036, 0x05070a, 0.26);
    environmentGroup.add(hemiLight);

    // GPU-driven wind foliage animation (natural steppe wind + demon-driven directional wind)
    const updateFoliageWind = (
      time: number,
      demonPos?: THREE.Vector3,
      playerPos?: THREE.Vector3,
      demonWindStrength = 0
    ) => {
      windUniforms.uTime.value = time;
      if (demonPos) windUniforms.uDemonPos.value.copy(demonPos);
      if (playerPos) windUniforms.uPlayerPos.value.copy(playerPos);
      windUniforms.uDemonWind.value = demonWindStrength;
    };

    return {
      terrainMesh,
      getHeightAt: computeHeight,
      updateFoliageWind,
      environmentGroup,
      moonMesh,
      moonLight,
      hemiLight,
    };
  }
}
