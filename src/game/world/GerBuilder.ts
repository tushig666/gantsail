/**
 * Authentic Traditional Mongolian Ger (Yurt) Builder
 * Accurately implements Khana (lattice walls), Uni (roof poles),
 * Toono (circular roof crown), Bagana (twin pillars), and traditional interior.
 */

import * as THREE from 'three';
import { ProceduralTextures } from './ProceduralTextures';

export interface GerInstance {
  group: THREE.Group;
  doorGroup: THREE.Group;
  doorPivot: THREE.Group;
  isDoorOpen: boolean;
  isCandleLit: boolean;
  openDoor: () => void;
  resetDoor: () => void;
  doorInteractionPosition: THREE.Vector3;
  checkInside: (pos: THREE.Vector3) => boolean;
  updateInterior: (delta: number, elapsedTime: number) => void;
}

/**
 * Builds a closed perimeter ribbon BufferGeometry around the wooden door opening.
 * uv.x = normalized arc-length [0..1] monotonically around the perimeter loop
 * uv.y = signed cross-ribbon coordinate [-1..+1] for soft Gaussian edge falloff
 */
function createDoorOutlineRibbonGeometry(
  width: number,
  height: number,
  bottomY: number,
  centerX: number,
  halfRibbonWidth: number
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const corners = [
    { x: centerX - hw, y: bottomY, nx: -1, ny: -1 },
    { x: centerX + hw, y: bottomY, nx: 1, ny: -1 },
    { x: centerX + hw, y: bottomY + height, nx: 1, ny: 1 },
    { x: centerX - hw, y: bottomY + height, nx: -1, ny: 1 },
    { x: centerX - hw, y: bottomY, nx: -1, ny: -1 },
  ];

  const totalPerim = 2 * width + 2 * height;
  const arcDist = [
    0,
    width / totalPerim,
    (width + height) / totalPerim,
    (2 * width + height) / totalPerim,
    1.0,
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    const u = arcDist[i];
    // Inner vertex (v = -1)
    positions.push(c.x - c.nx * halfRibbonWidth, c.y - c.ny * halfRibbonWidth, 0);
    uvs.push(u, -1);
    // Outer vertex (v = +1)
    positions.push(c.x + c.nx * halfRibbonWidth, c.y + c.ny * halfRibbonWidth, 0);
    uvs.push(u, 1);

    if (i < corners.length - 1) {
      const b = i * 2;
      indices.push(b, b + 1, b + 2);
      indices.push(b + 1, b + 3, b + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export class GerBuilder {
  public static build(): GerInstance {
    const gerGroup = new THREE.Group();
    gerGroup.name = 'MongolianGer';

    const radius = 4.4;
    const wallHeight = 1.75;
    const toonoHeight = 3.25;
    const toonoRadius = 1.15;

    // Materials (Aged, soot-darkened abandoned ger materials for realistic low-light moonlight response)
    const feltTexture = ProceduralTextures.createFeltTexture();
    const feltMaterial = new THREE.MeshStandardMaterial({
      map: feltTexture,
      roughness: 0.95,
      metalness: 0.02,
      color: 0x706c65,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
    });

    const woodTexture = ProceduralTextures.createWoodTexture('#5e4c3b');
    const woodMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.86,
      metalness: 0.05,
      shadowSide: THREE.DoubleSide,
    });

    const darkWoodTexture = ProceduralTextures.createWoodTexture('#382c22');
    const darkWoodMaterial = new THREE.MeshStandardMaterial({
      map: darkWoodTexture,
      roughness: 0.9,
      metalness: 0.04,
      shadowSide: THREE.DoubleSide,
    });

    // 1. FLOOR (Aged wooden plank circular deck)
    const floorGeo = new THREE.CylinderGeometry(radius + 0.15, radius + 0.15, 0.12, 32);
    const floorMesh = new THREE.Mesh(floorGeo, darkWoodMaterial);
    floorMesh.position.y = 0.06;
    floorMesh.receiveShadow = true;
    gerGroup.add(floorMesh);

    // 2. KHANA (Cylindrical Outer Felt Wall with door cut-out)
    // Door opening is facing North (Z = -radius, which is theta = Math.PI in Three.js CylinderGeometry)
    const doorAngleGap = 0.24; // radians (~1.05m chord tucked cleanly inside doorposts)
    const wallGeo = new THREE.CylinderGeometry(
      radius,
      radius,
      wallHeight,
      48,
      1,
      true,
      Math.PI + doorAngleGap / 2,
      Math.PI * 2 - doorAngleGap
    );
    const wallMesh = new THREE.Mesh(wallGeo, feltMaterial);
    wallMesh.position.y = wallHeight / 2 + 0.12;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    gerGroup.add(wallMesh);

    // Small felt header closing the narrow strip between door lintel (y=1.75) and roof edge (y=1.87)
    const doorHeaderGeo = new THREE.CylinderGeometry(
      radius,
      radius,
      0.14,
      8,
      1,
      true,
      Math.PI - doorAngleGap / 2,
      doorAngleGap
    );
    const doorHeaderMesh = new THREE.Mesh(doorHeaderGeo, feltMaterial);
    doorHeaderMesh.position.y = 1.81;
    doorHeaderMesh.castShadow = true;
    doorHeaderMesh.receiveShadow = true;
    gerGroup.add(doorHeaderMesh);

    // Inner Khana lattice visual (interlocking wooden slats, open at North doorway)
    const latticeGeo = new THREE.CylinderGeometry(
      radius - 0.04,
      radius - 0.04,
      wallHeight - 0.1,
      36,
      1,
      true,
      Math.PI + doorAngleGap / 2,
      Math.PI * 2 - doorAngleGap
    );
    const latticeMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.89,
      wireframe: true,
      color: 0x584434,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    latticeMesh.position.y = wallHeight / 2 + 0.12;
    latticeMesh.receiveShadow = true;
    gerGroup.add(latticeMesh);

    // 3. ROOF FELT CONE (Truncated cone from wall top to toono ring)
    const roofConeGeo = new THREE.CylinderGeometry(
      toonoRadius,
      radius,
      toonoHeight - wallHeight,
      36,
      1,
      true
    );
    const roofMesh = new THREE.Mesh(roofConeGeo, feltMaterial);
    roofMesh.position.y = wallHeight + (toonoHeight - wallHeight) / 2 + 0.12;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    gerGroup.add(roofMesh);

    // Outer rope straps (Buse) wrapping around the ger and stopping cleanly at the North doorposts
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3b3024, roughness: 0.94 });
    const ropeGeo = new THREE.TorusGeometry(radius + 0.02, 0.025, 6, 44, Math.PI * 2 - doorAngleGap);
    for (let r = 0; r < 3; r++) {
      const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
      ropeMesh.rotation.x = Math.PI / 2;
      ropeMesh.rotation.z = -Math.PI / 2 + doorAngleGap / 2;
      ropeMesh.position.y = 0.4 + r * 0.55;
      ropeMesh.castShadow = true;
      gerGroup.add(ropeMesh);
    }

    // 4. TOONO (Central Circular Wooden Roof Wheel)
    const toonoRimGeo = new THREE.TorusGeometry(toonoRadius, 0.065, 8, 32);
    const toonoRim = new THREE.Mesh(toonoRimGeo, woodMaterial);
    toonoRim.rotation.x = Math.PI / 2;
    toonoRim.position.y = toonoHeight + 0.12;
    toonoRim.castShadow = true;
    toonoRim.receiveShadow = true;
    gerGroup.add(toonoRim);

    // Toono cross-spokes (traditional radial wheel struts casting shadows in moonlight)
    for (let s = 0; s < 4; s++) {
      const spokeGeo = new THREE.CylinderGeometry(0.035, 0.035, toonoRadius * 2, 8);
      const spoke = new THREE.Mesh(spokeGeo, woodMaterial);
      spoke.rotation.x = Math.PI / 2;
      spoke.rotation.z = (s * Math.PI) / 4;
      spoke.position.y = toonoHeight + 0.12;
      spoke.castShadow = true;
      spoke.receiveShadow = true;
      gerGroup.add(spoke);
    }

    // 5. UNI (Radial wooden roof poles)
    const poleCount = 42;
    const uniPolesGroup = new THREE.Group();
    for (let i = 0; i < poleCount; i++) {
      const angle = (i / poleCount) * Math.PI * 2;
      const x1 = Math.cos(angle) * toonoRadius;
      const z1 = Math.sin(angle) * toonoRadius;
      const y1 = toonoHeight + 0.12;

      const x2 = Math.cos(angle) * radius;
      const z2 = Math.sin(angle) * radius;
      const y2 = wallHeight + 0.12;

      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
      const poleGeo = new THREE.CylinderGeometry(0.022, 0.026, length, 6);
      const pole = new THREE.Mesh(poleGeo, woodMaterial);

      pole.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
      pole.lookAt(new THREE.Vector3(x1, y1, z1));
      pole.rotateX(Math.PI / 2);
      pole.castShadow = true;
      pole.receiveShadow = true;
      uniPolesGroup.add(pole);
    }
    gerGroup.add(uniPolesGroup);

    // 6. BAGANA (Twin Central Wooden Support Columns)
    const baganaXOffset = 0.65;
    const baganaHeight = toonoHeight + 0.05;
    for (const dir of [-1, 1]) {
      const colGroup = new THREE.Group();
      const colGeo = new THREE.CylinderGeometry(0.065, 0.075, baganaHeight, 8);
      const col = new THREE.Mesh(colGeo, woodMaterial);
      col.position.y = baganaHeight / 2;
      col.castShadow = true;
      col.receiveShadow = true;
      colGroup.add(col);

      // Capital (carved top bracket)
      const capGeo = new THREE.BoxGeometry(0.24, 0.1, 0.4);
      const cap = new THREE.Mesh(capGeo, woodMaterial);
      cap.position.y = baganaHeight;
      cap.castShadow = true;
      cap.receiveShadow = true;
      colGroup.add(cap);

      colGroup.position.set(dir * baganaXOffset, 0.12, 0);
      gerGroup.add(colGroup);
    }

    // 7. TRADITIONAL STOVE (Zuukh) in Center — cold & unlit
    const stoveGroup = new THREE.Group();
    const stoveMat = new THREE.MeshStandardMaterial({
      color: 0x161515,
      roughness: 0.85,
      metalness: 0.45,
    });
    const stoveBodyGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.6, 16);
    const stoveBody = new THREE.Mesh(stoveBodyGeo, stoveMat);
    stoveBody.position.y = 0.3;
    stoveBody.castShadow = true;
    stoveBody.receiveShadow = true;
    stoveGroup.add(stoveBody);

    // Chimney pipe passing up through Toono
    const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 12);
    const pipe = new THREE.Mesh(pipeGeo, stoveMat);
    pipe.position.y = 2.1;
    pipe.position.x = 0.1;
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    stoveGroup.add(pipe);

    stoveGroup.position.set(0, 0.12, 0);
    gerGroup.add(stoveGroup);

    // 8. INTERIOR FURNITURE
    // A. Bed (where player wakes up) on the West side (X = -2.6, Z = 0.3)
    const bedGroup = new THREE.Group();
    const bedFrameGeo = new THREE.BoxGeometry(2.1, 0.42, 1.15);
    const bedFrame = new THREE.Mesh(bedFrameGeo, darkWoodMaterial);
    bedFrame.position.y = 0.21;
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;
    bedGroup.add(bedFrame);

    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x26211d, roughness: 0.96 });
    const blanketGeo = new THREE.BoxGeometry(1.95, 0.14, 1.05);
    const blanket = new THREE.Mesh(blanketGeo, blanketMat);
    blanket.position.y = 0.46;
    blanket.castShadow = true;
    blanket.receiveShadow = true;
    bedGroup.add(blanket);

    const pillowGeo = new THREE.BoxGeometry(0.45, 0.12, 0.7);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0x56524b, roughness: 0.92 });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(-0.7, 0.56, 0);
    pillow.castShadow = true;
    pillow.receiveShadow = true;
    bedGroup.add(pillow);

    bedGroup.position.set(-2.6, 0.12, 0.3);
    gerGroup.add(bedGroup);

    // B. Avdar (Traditional painted wooden chest) on North-West wall
    const avdarTexture = ProceduralTextures.createMongolianOrnamentTexture();
    const avdarMat = new THREE.MeshStandardMaterial({
      map: avdarTexture,
      color: 0x7e7b75,
      roughness: 0.78,
      metalness: 0.08,
    });
    const avdarGeo = new THREE.BoxGeometry(1.25, 0.65, 0.6);
    const avdar = new THREE.Mesh(avdarGeo, avdarMat);
    avdar.position.set(-1.8, 0.32 + 0.12, -2.6);
    avdar.rotation.y = Math.PI / 4;
    avdar.castShadow = true;
    avdar.receiveShadow = true;
    gerGroup.add(avdar);

    // C. Low wooden tea table (shiree) on East side
    const tableGroup = new THREE.Group();
    const tableTopGeo = new THREE.BoxGeometry(1.2, 0.05, 0.7);
    const tableTop = new THREE.Mesh(tableTopGeo, woodMaterial);
    tableTop.position.y = 0.45;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);
    for (const tx of [-0.5, 0.5]) {
      for (const tz of [-0.25, 0.25]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6), woodMaterial);
        leg.position.set(tx, 0.225, tz);
        leg.castShadow = true;
        leg.receiveShadow = true;
        tableGroup.add(leg);
      }
    }
    const bowlGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.06, 12);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x3b2819, roughness: 0.65 });
    const bowl1 = new THREE.Mesh(bowlGeo, bowlMat);
    bowl1.position.set(-0.2, 0.5, 0.05);
    bowl1.castShadow = true;
    const bowl2 = new THREE.Mesh(bowlGeo, bowlMat);
    bowl2.position.set(0.15, 0.5, -0.1);
    bowl2.castShadow = true;
    tableGroup.add(bowl1, bowl2);

    tableGroup.position.set(2.4, 0.12, -0.6);
    gerGroup.add(tableGroup);

    // D. Worn floor carpet / felt rug
    const rugGeo = new THREE.PlaneGeometry(2.8, 2.2);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x321b18,
      roughness: 0.97,
      side: THREE.DoubleSide,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.13, 0);
    rug.receiveShadow = true;
    gerGroup.add(rug);

    // 9. ENTRANCE & INTERACTIVE DOOR
    const doorFrameGroup = new THREE.Group();
    const doorWidth = 1.05;
    const doorHeight = 1.55;

    const frameMat = darkWoodMaterial;
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorHeight + 0.1, 0.14), frameMat);
    leftPost.position.set(-doorWidth / 2, doorHeight / 2 + 0.12, 0);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorHeight + 0.1, 0.14), frameMat);
    rightPost.position.set(doorWidth / 2, doorHeight / 2 + 0.12, 0);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.24, 0.12, 0.14), frameMat);
    lintel.position.set(0, doorHeight + 0.14, 0);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.24, 0.12, 0.16), frameMat);
    threshold.position.set(0, 0.14, 0);
    threshold.receiveShadow = true;

    doorFrameGroup.add(leftPost, rightPost, lintel, threshold);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(doorWidth / 2 - 0.05, 0.16, 0);

    const doorPanelGeo = new THREE.BoxGeometry(doorWidth - 0.04, doorHeight - 0.04, 0.06);
    const doorPanel = new THREE.Mesh(doorPanelGeo, woodMaterial);
    doorPanel.position.set(-(doorWidth - 0.04) / 2, doorHeight / 2, 0);
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    doorPivot.add(doorPanel);

    const handleRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), stoveMat);
    handleRing.position.set(-(doorWidth - 0.18), doorHeight * 0.52, 0.04);
    doorPivot.add(handleRing);

    doorFrameGroup.add(doorPivot);
    doorFrameGroup.position.set(0, 0, -radius + 0.02);
    gerGroup.add(doorFrameGroup);

    // Subtle animated white perimeter highlight tucked inside the visible wooden door seam
    const doorOutlineGroup = new THREE.Group();
    doorOutlineGroup.name = 'DoorPerimeterHighlight';
    doorOutlineGroup.position.set(0, 0, 0.056);

    const doorOutlineUniforms = {
      uHead: { value: 0 },
      uFade: { value: 1 },
      uColor: { value: new THREE.Color(0xf8fbff) },
    };

    const createDoorOutlineShader = (baseAlpha: number, pulseAlpha: number, edgeFalloff: number) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uHead: doorOutlineUniforms.uHead,
          uFade: doorOutlineUniforms.uFade,
          uColor: doorOutlineUniforms.uColor,
          uBaseAlpha: { value: baseAlpha },
          uPulseAlpha: { value: pulseAlpha },
          uEdgeFalloff: { value: edgeFalloff },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uHead;
          uniform float uFade;
          uniform vec3 uColor;
          uniform float uBaseAlpha;
          uniform float uPulseAlpha;
          uniform float uEdgeFalloff;
          varying vec2 vUv;

          void main() {
            // Thin Gaussian profile concentrated along the door seam
            float edgeSoft = exp(-vUv.y * vUv.y * uEdgeFalloff);

            // Continuous directional traveling highlight with a soft fading comet trail
            float d = mod(uHead - vUv.x + 0.5, 1.0) - 0.5;
            float pulse = d < 0.0 ? exp(-d * d * 650.0) : exp(-d * 5.2);

            float alpha = (uBaseAlpha + uPulseAlpha * pulse) * edgeSoft * uFade;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
      });

    // Positioned strictly inside the clear inner door opening ([-0.465..0.465], [0.20..1.63])
    const coreOutlineGeo = createDoorOutlineRibbonGeometry(0.908, 1.402, 0.214, 0, 0.0085);
    const coreOutlineMat = createDoorOutlineShader(0.14, 0.72, 5.2);
    const coreOutlineMesh = new THREE.Mesh(coreOutlineGeo, coreOutlineMat);
    coreOutlineMesh.renderOrder = 2;

    const softGlowGeo = createDoorOutlineRibbonGeometry(0.908, 1.402, 0.214, 0, 0.022);
    const softGlowMat = createDoorOutlineShader(0.045, 0.22, 4.2);
    const softGlowMesh = new THREE.Mesh(softGlowGeo, softGlowMat);
    softGlowMesh.position.z = -0.002;
    softGlowMesh.renderOrder = 1;

    doorOutlineGroup.add(softGlowMesh, coreOutlineMesh);
    doorFrameGroup.add(doorOutlineGroup);

    // E. Traditional Mongolian Wooden Chest (Avdar) beside the entrance door + dying candle
    const doorChestGroup = new THREE.Group();
    doorChestGroup.name = 'EntranceAvdarChest';

    const agedChestWoodMat = new THREE.MeshStandardMaterial({
      map: darkWoodTexture,
      color: 0x8f8578,
      roughness: 0.88,
      metalness: 0.04,
    });
    const agedOrnamentMat = new THREE.MeshStandardMaterial({
      map: avdarTexture,
      color: 0x686058,
      roughness: 0.82,
      metalness: 0.08,
    });
    const agedIronMat = new THREE.MeshStandardMaterial({
      color: 0x1b1a19,
      roughness: 0.65,
      metalness: 0.45,
    });

    // Carved corner feet (lifts chest body off the planks cleanly)
    const footGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    for (const fx of [-0.41, 0.41]) {
      for (const fz of [-0.18, 0.18]) {
        const foot = new THREE.Mesh(footGeo, agedChestWoodMat);
        foot.position.set(fx, 0.04, fz);
        foot.castShadow = true;
        foot.receiveShadow = true;
        doorChestGroup.add(foot);
      }
    }

    // Main weathered wooden chest carcass
    const chestBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.46), agedChestWoodMat);
    chestBody.position.set(0, 0.29, 0);
    chestBody.castShadow = true;
    chestBody.receiveShadow = true;
    doorChestGroup.add(chestBody);

    // Recessed ornamental Mongolian panel on front face (+Z faces inward toward ger center)
    const chestFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.3, 0.025), agedOrnamentMat);
    chestFrontPanel.position.set(0, 0.29, 0.228);
    chestFrontPanel.receiveShadow = true;
    doorChestGroup.add(chestFrontPanel);

    // Stepped wooden lid (top sits at local y = 0.56)
    const chestLid = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.5), agedChestWoodMat);
    chestLid.position.set(0, 0.53, 0);
    chestLid.castShadow = true;
    chestLid.receiveShadow = true;
    doorChestGroup.add(chestLid);

    // Iron lock plate & hasp clasp on chest front
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.02), agedIronMat);
    lockPlate.position.set(0, 0.36, 0.242);
    doorChestGroup.add(lockPlate);

    const haspStrap = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.026), agedIronMat);
    haspStrap.position.set(0, 0.46, 0.246);
    doorChestGroup.add(haspStrap);

    // Side forged carrying rings
    for (const sx of [-1, 1]) {
      const sideMount = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.06), agedIronMat);
      sideMount.position.set(sx * 0.465, 0.31, 0);
      doorChestGroup.add(sideMount);
    }

    // Small burned-down candle sitting on the door-side front corner of the chest lid
    const candleGroup = new THREE.Group();
    candleGroup.name = 'DyingCandle';
    candleGroup.position.set(0.26, 0.56, 0.11);

    const saucerMat = new THREE.MeshStandardMaterial({
      color: 0x262320,
      roughness: 0.58,
      metalness: 0.52,
    });
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.014, 14), saucerMat);
    saucer.position.y = 0.007;
    saucer.receiveShadow = true;
    candleGroup.add(saucer);

    const waxMat = new THREE.MeshStandardMaterial({
      color: 0xa89b82,
      roughness: 0.72,
      metalness: 0.02,
    });
    const waxPuddle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.012, 12), waxMat);
    waxPuddle.position.y = 0.017;
    candleGroup.add(waxPuddle);

    const candleStub = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.062, 12), waxMat);
    candleStub.position.y = 0.05;
    candleStub.castShadow = true;
    candleGroup.add(candleStub);

    const wickMat = new THREE.MeshStandardMaterial({ color: 0x121010, roughness: 0.95 });
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0024, 0.015, 6), wickMat);
    wick.position.y = 0.086;
    candleGroup.add(wick);

    // Dying candle flame meshes + tiny soft glow halo (no artificial brightness)
    const candleFlameGroup = new THREE.Group();
    candleFlameGroup.position.y = 0.097;

    const outerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xff9438,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const outerFlame = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), outerFlameMat);
    outerFlame.scale.set(0.85, 2.25, 0.85);
    candleFlameGroup.add(outerFlame);

    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffe0a6,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const innerFlame = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), innerFlameMat);
    innerFlame.position.y = -0.002;
    innerFlame.scale.set(0.8, 1.85, 0.8);
    candleFlameGroup.add(innerFlame);

    const flameHaloCanvas = document.createElement('canvas');
    flameHaloCanvas.width = 64;
    flameHaloCanvas.height = 64;
    const fctx = flameHaloCanvas.getContext('2d')!;
    const fgrad = fctx.createRadialGradient(32, 32, 1, 32, 32, 32);
    fgrad.addColorStop(0, 'rgba(255, 196, 110, 0.72)');
    fgrad.addColorStop(0.35, 'rgba(255, 138, 52, 0.24)');
    fgrad.addColorStop(1, 'rgba(255, 90, 20, 0.0)');
    fctx.fillStyle = fgrad;
    fctx.fillRect(0, 0, 64, 64);

    const flameHaloTex = new THREE.CanvasTexture(flameHaloCanvas);
    const flameHaloMat = new THREE.SpriteMaterial({
      map: flameHaloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.42,
      depthWrite: false,
    });
    const flameHalo = new THREE.Sprite(flameHaloMat);
    flameHalo.scale.set(0.2, 0.24, 1);
    candleFlameGroup.add(flameHalo);

    candleGroup.add(candleFlameGroup);

    // Extremely weak, tightly localized warm PointLight illuminating only the chest & adjacent door edge
    const candleBaseIntensity = 0.46;
    const candleLight = new THREE.PointLight(0xff9a44, candleBaseIntensity, 2.75, 2.0);
    candleLight.position.set(0, 0.115, 0);
    candleGroup.add(candleLight);

    doorChestGroup.add(candleGroup);
    // Placed naturally in the left corner beside the entrance door on the NW wall, clear of the doorway path
    doorChestGroup.position.set(-1.38, 0.12, -3.72);
    doorChestGroup.rotation.y = 0.34;
    gerGroup.add(doorChestGroup);

    // 10. SOLE INTERIOR LIGHT SOURCE: COLD NATURAL MOONLIGHT THROUGH TOONO
    // Zero artificial fill lights, zero warm lamps, zero glowing embers.
    // Slightly angled from South-above through the circular Toono so the soft outer
    // penumbra gently grazes the northern wooden entrance door while keeping corners dark.
    const moonOrigin = new THREE.Vector3(-0.15, 5.45, 0.72);
    const moonTargetPos = new THREE.Vector3(0.05, 0.0, -1.15);

    const moonSpot = new THREE.SpotLight(0xa6c1e2, 54.0, 13.0, Math.PI / 4.2, 0.94, 1.56);
    moonSpot.position.copy(moonOrigin);
    moonSpot.target.position.copy(moonTargetPos);
    moonSpot.castShadow = true;
    moonSpot.shadow.mapSize.width = 1024;
    moonSpot.shadow.mapSize.height = 1024;
    moonSpot.shadow.camera.near = 0.8;
    moonSpot.shadow.camera.far = 12.5;
    moonSpot.shadow.bias = -0.0005;
    moonSpot.shadow.normalBias = 0.015;
    gerGroup.add(moonSpot);
    gerGroup.add(moonSpot.target);

    // Subtle cold night-sky glow just above the circular Toono opening (visible looking up from inside)
    const toonoSkyCanvas = document.createElement('canvas');
    toonoSkyCanvas.width = 128;
    toonoSkyCanvas.height = 128;
    const tctx = toonoSkyCanvas.getContext('2d')!;
    const tgrad = tctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    tgrad.addColorStop(0, 'rgba(175, 200, 232, 0.42)');
    tgrad.addColorStop(0.55, 'rgba(92, 122, 165, 0.16)');
    tgrad.addColorStop(1, 'rgba(10, 16, 28, 0.0)');
    tctx.fillStyle = tgrad;
    tctx.fillRect(0, 0, 128, 128);
    const toonoSkyTex = new THREE.CanvasTexture(toonoSkyCanvas);
    const toonoSkyMat = new THREE.MeshBasicMaterial({
      map: toonoSkyTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const toonoSkyDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), toonoSkyMat);
    toonoSkyDisc.rotation.x = Math.PI / 2;
    toonoSkyDisc.position.set(0, toonoHeight + 0.18, 0);
    gerGroup.add(toonoSkyDisc);

    // Volumetric Moonlight Shaft descending from circular Toono opening
    const shaftStart = new THREE.Vector3(0, toonoHeight + 0.08, 0);
    const beamDir = new THREE.Vector3().subVectors(moonTargetPos, moonOrigin).normalize();
    const shaftLength = 3.35;
    const shaftEnd = shaftStart.clone().addScaledVector(beamDir, shaftLength);
    const shaftMid = new THREE.Vector3().addVectors(shaftStart, shaftEnd).multiplyScalar(0.5);

    const shaftGeo = new THREE.CylinderGeometry(toonoRadius * 0.88, toonoRadius * 1.52, shaftLength, 32, 1, true);
    const shaftUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x88a6cc) },
      uOpacity: { value: 0.18 },
    };

    const shaftMat = new THREE.ShaderMaterial({
      uniforms: shaftUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float facing = abs(dot(normalize(vWorldNormal), viewDir));
          float edgeSoft = pow(facing, 1.8);

          // Strongest near the toono crown, fading naturally toward the floor
          float vertFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          float topBoost = mix(0.28, 1.0, pow(vUv.y, 0.7));

          // Subtle shadow streaks from toono spokes
          float angle = vUv.x * 6.2831853;
          float rays = 0.78 + 0.22 * sin(angle * 8.0 + uTime * 0.12);

          float alpha = uOpacity * edgeSoft * vertFade * topBoost * rays;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.position.copy(shaftMid);
    const upVec = new THREE.Vector3(0, 1, 0);
    const shaftQuat = new THREE.Quaternion().setFromUnitVectors(upVec, beamDir.clone().negate());
    shaftMesh.quaternion.copy(shaftQuat);
    gerGroup.add(shaftMesh);

    // Soft circular dust texture for illuminated motes inside the moonlight beam
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 32;
    dustCanvas.height = 32;
    const dctx = dustCanvas.getContext('2d')!;
    const dgrad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    dgrad.addColorStop(0, 'rgba(220, 232, 248, 1.0)');
    dgrad.addColorStop(0.4, 'rgba(180, 204, 232, 0.45)');
    dgrad.addColorStop(1, 'rgba(150, 180, 220, 0.0)');
    dctx.fillStyle = dgrad;
    dctx.fillRect(0, 0, 32, 32);
    const dustSpriteTex = new THREE.CanvasTexture(dustCanvas);

    // Dust particles strictly constrained inside the illuminated moonlight cone
    const dustCount = 110;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustPhases = new Float32Array(dustCount);
    const dustBaseX = new Float32Array(dustCount);
    const dustBaseZ = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const t = Math.random(); // 0 = floor, 1 = toono
      const y = 0.22 + t * (toonoHeight - 0.32);
      const coneRadius = THREE.MathUtils.lerp(toonoRadius * 1.35, toonoRadius * 0.82, t);
      const r = Math.sqrt(Math.random()) * coneRadius;
      const th = Math.random() * Math.PI * 2;
      const offsetAlongDir = (1 - t) * shaftLength;
      const centerX = shaftStart.x + beamDir.x * offsetAlongDir;
      const centerZ = shaftStart.z + beamDir.z * offsetAlongDir;

      const px = centerX + Math.cos(th) * r;
      const pz = centerZ + Math.sin(th) * r;
      dustPos[i * 3] = px;
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = pz;
      dustBaseX[i] = px;
      dustBaseZ[i] = pz;
      dustPhases[i] = Math.random() * Math.PI * 2;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xc2d4ea,
      map: dustSpriteTex,
      size: 0.055,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    gerGroup.add(dustPoints);

    // Door, Candle & Door Outline synchronized state
    let isDoorOpen = false;
    let isCandleLit = true;
    let targetAngle = 0;
    let currentAngle = 0;
    let doorOutlineFade = 1.0;
    let doorOutlineTargetFade = 1.0;

    const extinguishCandle = () => {
      if (!isCandleLit) return;
      isCandleLit = false;
      candleFlameGroup.visible = false;
      candleLight.intensity = 0;
    };

    const resetCandle = () => {
      isCandleLit = true;
      candleFlameGroup.visible = true;
      candleLight.intensity = candleBaseIntensity;
    };

    const openDoor = () => {
      if (isDoorOpen) return;
      isDoorOpen = true;
      targetAngle = -Math.PI * 0.65;
      // Smoothly fade out door perimeter highlight and extinguish candle immediately on door open
      doorOutlineTargetFade = 0.0;
      extinguishCandle();
    };

    const resetDoor = () => {
      isDoorOpen = false;
      targetAngle = 0;
      currentAngle = 0;
      doorPivot.rotation.y = 0;
      doorOutlineFade = 1.0;
      doorOutlineTargetFade = 1.0;
      doorOutlineUniforms.uFade.value = 1.0;
      doorOutlineGroup.visible = true;
      resetCandle();
    };

    const updateInterior = (delta: number, elapsedTime: number) => {
      if (Math.abs(currentAngle - targetAngle) > 0.005) {
        currentAngle += (targetAngle - currentAngle) * 0.08;
        doorPivot.rotation.y = currentAngle;
      }

      // Slow, continuous white perimeter light traveling smoothly around closed door frame
      doorOutlineUniforms.uHead.value = (elapsedTime * 0.14) % 1.0;
      if (Math.abs(doorOutlineFade - doorOutlineTargetFade) > 0.002) {
        doorOutlineFade += (doorOutlineTargetFade - doorOutlineFade) * Math.min(1, delta * 7.5);
        doorOutlineUniforms.uFade.value = doorOutlineFade;
        if (doorOutlineFade <= 0.005 && doorOutlineTargetFade === 0) {
          doorOutlineFade = 0;
          doorOutlineUniforms.uFade.value = 0;
          doorOutlineGroup.visible = false;
        }
      }

      if (isCandleLit) {
        // Dying-flame stutter: weak organic flicker with brief dimming dips
        const primaryWave = Math.sin(elapsedTime * 7.3) * 0.1 + Math.sin(elapsedTime * 17.9) * 0.06;
        const sputterDip = Math.pow(Math.max(0, Math.sin(elapsedTime * 2.1 + 0.8)), 8) * 0.22;
        const flicker = Math.max(0.16, candleBaseIntensity + primaryWave - sputterDip);
        candleLight.intensity = flicker;

        const flameRatio = flicker / candleBaseIntensity;
        candleFlameGroup.scale.set(
          0.86 + flameRatio * 0.16,
          0.74 + flameRatio * 0.34,
          0.86 + flameRatio * 0.16
        );
        candleFlameGroup.rotation.z = Math.sin(elapsedTime * 9.5) * 0.08;
        candleFlameGroup.rotation.x = Math.cos(elapsedTime * 7.1) * 0.05;
        flameHaloMat.opacity = 0.22 + flameRatio * 0.22;
      }

      shaftUniforms.uTime.value = elapsedTime;

      const posAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        const ph = dustPhases[i];
        let y = posAttr.getY(i) + delta * 0.055;
        if (y > toonoHeight - 0.1) y = 0.22;
        posAttr.setY(i, y);
        posAttr.setX(i, dustBaseX[i] + Math.sin(elapsedTime * 0.45 + ph) * 0.05);
        posAttr.setZ(i, dustBaseZ[i] + Math.cos(elapsedTime * 0.38 + ph) * 0.05);
      }
      posAttr.needsUpdate = true;
    };

    return {
      group: gerGroup,
      doorGroup: doorFrameGroup,
      doorPivot,
      get isDoorOpen() {
        return isDoorOpen;
      },
      set isDoorOpen(val: boolean) {
        isDoorOpen = val;
      },
      get isCandleLit() {
        return isCandleLit;
      },
      openDoor,
      resetDoor,
      doorInteractionPosition: new THREE.Vector3(0, 1.0, -radius + 1.2),
      checkInside: (pos: THREE.Vector3) => {
        const distSq = pos.x * pos.x + pos.z * pos.z;
        return distSq < (radius - 0.3) * (radius - 0.3);
      },
      updateInterior,
    };
  }
}
