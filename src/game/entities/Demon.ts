/**
 * 3D Animated Demon Entity for Goviin Gants Ail
 * Precision-crafted to match the Vision Concept Art:
 * - 4.0 meters tall
 * - Monumental long tangled stringy black hair covering the face and falling past knees
 * - Two milky-white pupil-less dead eyes peering through the dark hair abyss
 * - Torn, aged, dirt-stained bone-white traditional Mongolian deel with ragged shredded hem
 * - Elongated withered arms with long curved black claws
 * - Pale bare feet dangling in mid-air (floating 20cm above ground)
 * - Atmospheric floating levitation and head-turn delay
 */

import * as THREE from 'three';
import { ProceduralTextures } from '../world/ProceduralTextures';
import { DemonState } from '../types';

export class Demon {
  public group: THREE.Group;
  public state: DemonState = 'OBSERVING';

  // Body Parts Hierarchy
  private bodyContainer: THREE.Group;
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;
  private faceVoid: THREE.Mesh;
  private eyesGroup: THREE.Group;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private feetGroup: THREE.Group;
  private hairLayers: THREE.Group;
  private clothTatteredStrips: THREE.Group;

  // Eye Materials & Glints
  private leftEyeMesh: THREE.Mesh;
  private rightEyeMesh: THREE.Mesh;
  private eyeGlowSprite: THREE.Sprite;

  // Animation & AI Variables
  public position = new THREE.Vector3(0, 0, -110);
  public velocity = new THREE.Vector3();
  private floatTime = 0;
  private targetRotationY = Math.PI;
  private currentRotationY = Math.PI;
  private headTargetRotY = 0;
  private headCurrentRotY = 0;

  // AI speed tuning (original)
  public walkSpeed = 3.8;
  public chaseSpeed = 5.72;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GobiDemonVision';

    // 1. PROCEDURAL PBR MATERIALS
    const deelTex = ProceduralTextures.createTornDeelTexture();
    const deelMaterial = new THREE.MeshStandardMaterial({
      map: deelTex,
      color: 0xc8c3b7,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const skinTex = ProceduralTextures.createCreatureSkinTexture();
    const paleSkinMat = new THREE.MeshStandardMaterial({
      map: skinTex,
      color: 0xb5b5ac,
      roughness: 0.78,
      metalness: 0.08,
    });

    const clawMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 0.25,
      metalness: 0.5,
    });

    const hairTex = ProceduralTextures.createHairTexture();
    const hairMat = new THREE.MeshStandardMaterial({
      map: hairTex,
      color: 0x08080a,
      roughness: 0.92,
      metalness: 0.08,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
    });

    const deadEyeTex = ProceduralTextures.createDeadEyeTexture();
    const eyeMat = new THREE.MeshBasicMaterial({
      map: deadEyeTex,
      color: 0xf0f5fc,
    });

    // 2. ROOT BODY CONTAINER (Scale: 4.0 meters tall)
    this.bodyContainer = new THREE.Group();
    this.bodyContainer.position.y = 0.25; // 25cm levitation above terrain
    this.group.add(this.bodyContainer);

    // 3. MAIN SKELETAL TORSO & DEEL ROBE
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 2.2;

    // Slender inner chest
    const innerTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.5, 8), paleSkinMat);
    this.torsoGroup.add(innerTorso);

    // Traditional Deel Body (Conical flowing draped robe)
    // Upper body down to ankles (~2.8m long)
    const deelBodyGeo = new THREE.CylinderGeometry(0.24, 0.78, 2.75, 20, 12, true);
    // Add organic vertical cloth ripple perturbations
    const deelPos = deelBodyGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < deelPos.count; i++) {
      const y = deelPos.getY(i);
      const angle = Math.atan2(deelPos.getZ(i), deelPos.getX(i));
      const fold = Math.sin(angle * 7) * 0.045 + Math.cos(angle * 11) * 0.025;
      if (y < -0.8) {
        // Jagged tattered hem
        deelPos.setY(i, y + Math.sin(angle * 13) * 0.12);
      }
      const r = Math.sqrt(deelPos.getX(i) ** 2 + deelPos.getZ(i) ** 2) + fold;
      deelPos.setX(i, Math.cos(angle) * r);
      deelPos.setZ(i, Math.sin(angle) * r);
    }
    deelBodyGeo.computeVertexNormals();

    const deelMesh = new THREE.Mesh(deelBodyGeo, deelMaterial);
    deelMesh.position.y = -0.68;
    deelMesh.castShadow = true;
    this.torsoGroup.add(deelMesh);

    // Tattered Hanging Shredded Ribbons along lower hem
    this.clothTatteredStrips = new THREE.Group();
    const stripCount = 20;
    for (let i = 0; i < stripCount; i++) {
      const angle = (i / stripCount) * Math.PI * 2;
      const stripLen = 0.85 + Math.random() * 0.65;
      const stripGeo = new THREE.PlaneGeometry(0.12, stripLen);
      stripGeo.translate(0, -stripLen / 2, 0);
      const strip = new THREE.Mesh(stripGeo, deelMaterial);
      strip.position.set(Math.cos(angle) * 0.72, -1.65, Math.sin(angle) * 0.72);
      strip.rotation.y = angle + Math.PI / 2;
      this.clothTatteredStrips.add(strip);
    }
    this.torsoGroup.add(this.clothTatteredStrips);

    // 4. DANGLING BARE PALE FEET (Visible hanging limply beneath the shredded hem)
    this.feetGroup = new THREE.Group();
    this.feetGroup.position.set(0, -1.8, 0);
    for (const side of [-0.14, 0.14]) {
      const foot = new THREE.Group();
      foot.position.set(side, 0, 0);

      // Thin pale ankle
      const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.4, 6), paleSkinMat);
      ankle.position.y = -0.15;
      foot.add(ankle);

      // Dangling lifeless foot pointing downward
      const footGeo = new THREE.BoxGeometry(0.08, 0.08, 0.22);
      footGeo.translate(0, -0.32, 0.06);
      footGeo.rotateX(0.5); // hanging limp
      const footMesh = new THREE.Mesh(footGeo, paleSkinMat);
      foot.add(footMesh);

      this.feetGroup.add(foot);
    }
    this.torsoGroup.add(this.feetGroup);

    // 5. UNNATURALLY LONG DROOPING ARMS & BLACK TALONS
    this.leftArmGroup = this.createArm(-1, paleSkinMat, deelMaterial, clawMat);
    this.rightArmGroup = this.createArm(1, paleSkinMat, deelMaterial, clawMat);
    this.torsoGroup.add(this.leftArmGroup);
    this.torsoGroup.add(this.rightArmGroup);

    // 6. HEAD, FACE SHADOW VOID & MILKY-WHITE EYES
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.95, 0.05);

    // Elongated Pale Skull
    const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
    headGeo.scale(0.85, 1.25, 0.95);
    const headMesh = new THREE.Mesh(headGeo, paleSkinMat);
    this.headGroup.add(headMesh);

    // Deep Shadow Void across front of face
    const voidGeo = new THREE.PlaneGeometry(0.36, 0.45);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x020204, side: THREE.DoubleSide });
    this.faceVoid = new THREE.Mesh(voidGeo, voidMat);
    this.faceVoid.position.set(0, 0.02, 0.2);
    this.headGroup.add(this.faceVoid);

    // Pure Milky-White Dead Eyes (peering out from the darkness)
    this.eyesGroup = new THREE.Group();
    const eyeSphereGeo = new THREE.SphereGeometry(0.046, 12, 12);

    this.leftEyeMesh = new THREE.Mesh(eyeSphereGeo, eyeMat);
    this.leftEyeMesh.position.set(-0.082, 0.035, 0.215);

    this.rightEyeMesh = new THREE.Mesh(eyeSphereGeo, eyeMat);
    this.rightEyeMesh.position.set(0.082, 0.035, 0.215);

    this.eyesGroup.add(this.leftEyeMesh, this.rightEyeMesh);
    this.headGroup.add(this.eyesGroup);

    // Subtle Eye Specular Glint Halo
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 64;
    eyeCanvas.height = 64;
    const ectx = eyeCanvas.getContext('2d')!;
    const egrad = ectx.createRadialGradient(32, 32, 2, 32, 32, 30);
    egrad.addColorStop(0, 'rgba(235, 245, 255, 0.85)');
    egrad.addColorStop(0.35, 'rgba(160, 195, 230, 0.3)');
    egrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ectx.fillStyle = egrad;
    ectx.fillRect(0, 0, 64, 64);

    const eyeGlowTex = new THREE.CanvasTexture(eyeCanvas);
    this.eyeGlowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: eyeGlowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.75,
      })
    );
    this.eyeGlowSprite.position.set(0, 0.035, 0.23);
    this.eyeGlowSprite.scale.set(0.42, 0.22, 1);
    this.headGroup.add(this.eyeGlowSprite);

    // 7. MONUMENTAL TANGLED BLACK HAIR (CREATURE DESIGN A MANDATE)
    // Multi-layered hair structure:
    // (A) Dense inner hair volume draping past chest & waist
    // (B) 24 individual front strands that veil the face with gaps for the eyes
    // (C) Thick outer cascade falling over shoulders down to lower calves (~2.9m long)
    this.hairLayers = new THREE.Group();

    // Layer A: Head cap & crown volume
    const capGeo = new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.y = 0.08;
    this.hairLayers.add(capMesh);

    // Layer B: Front Face Veil Strands (hanging across forehead, cheeks, between eyes)
    const frontStrandCount = 26;
    for (let i = 0; i < frontStrandCount; i++) {
      const strandLen = 2.0 + Math.random() * 0.8;
      const strandGeo = new THREE.PlaneGeometry(0.04, strandLen);
      strandGeo.translate(0, -strandLen / 2, 0);

      const strand = new THREE.Mesh(strandGeo, hairMat);
      const angle = -0.9 + (i / frontStrandCount) * 1.8;

      // Ensure a subtle gap at dead-center so the pale white eyes clearly glint through!
      const isEyeGap = Math.abs(angle) < 0.12;
      const strandX = Math.sin(angle) * 0.26 + (isEyeGap ? (angle > 0 ? 0.025 : -0.025) : 0);
      const strandZ = Math.cos(angle) * 0.25;

      strand.position.set(strandX, 0.18, strandZ);
      strand.rotation.y = angle;
      strand.rotation.z = (Math.random() - 0.5) * 0.08;
      this.hairLayers.add(strand);
    }

    // Layer C: Heavy Side, Shoulder, and Back Strands (falling past hips and knees)
    const backStrandCount = 42;
    for (let i = 0; i < backStrandCount; i++) {
      const angle = (i / backStrandCount) * Math.PI * 2;
      if (Math.abs(angle) < 0.35) continue; // front is handled by veil

      const hairLen = 2.6 + Math.random() * 0.8;
      const hairGeo = new THREE.PlaneGeometry(0.14, hairLen);
      hairGeo.translate(0, -hairLen / 2, 0);

      const hairMesh = new THREE.Mesh(hairGeo, hairMat);
      hairMesh.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.24);
      hairMesh.rotation.y = angle + Math.PI / 2;
      hairMesh.rotation.x = 0.06 + Math.random() * 0.08; // natural gravity flare
      this.hairLayers.add(hairMesh);
    }

    this.headGroup.add(this.hairLayers);
    this.torsoGroup.add(this.headGroup);
    this.bodyContainer.add(this.torsoGroup);

    // 8. CONTACT SHADOW BENEATH FLOATING FEET
    const shadowGeo = new THREE.CircleGeometry(0.85, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x05080f,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = -0.22;
    this.bodyContainer.add(shadowMesh);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.currentRotationY;
  }

  private createArm(
    dir: number,
    skinMat: THREE.Material,
    deelMat: THREE.Material,
    clawMat: THREE.Material
  ): THREE.Group {
    const armGroup = new THREE.Group();
    armGroup.position.set(dir * 0.42, 0.52, 0);

    // Wide loose hanging sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.15, 0.28, 1.35, 10, 1, true);
    sleeveGeo.translate(0, -0.67, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, deelMat);
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    // Skeletal elongated forearm
    const forearmGeo = new THREE.CylinderGeometry(0.045, 0.035, 1.7, 8);
    forearmGeo.translate(0, -0.95, 0);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    armGroup.add(forearm);

    // Bony Hand & Curved Black Claws (Middle-right concept art panel)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -1.85, 0);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.16, 0.09), skinMat);
    handGroup.add(palm);

    for (let f = 0; f < 5; f++) {
      const clawGeo = new THREE.ConeGeometry(0.013, 0.24, 6);
      clawGeo.rotateX(Math.PI);
      clawGeo.rotateZ((f - 2) * 0.08); // splayed talons
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set((f - 2) * 0.022, -0.18, 0);
      handGroup.add(claw);
    }
    armGroup.add(handGroup);

    return armGroup;
  }

  public update(delta: number, playerPos: THREE.Vector3, terrainHeightAt: (x: number, z: number) => number) {
    this.floatTime += delta;

    // Vector to Player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const distToPlayer = toPlayer.length();
    toPlayer.y = 0;

    switch (this.state) {
      case 'OBSERVING':
        // Stands completely still under the moonlight
        this.targetRotationY = Math.atan2(toPlayer.x, toPlayer.z);
        break;

      case 'TURNING':
        // Eerie head turn precedes the torso
        this.headTargetRotY = Math.atan2(toPlayer.x, toPlayer.z) - this.currentRotationY;
        this.targetRotationY = Math.atan2(toPlayer.x, toPlayer.z);
        break;

      case 'CHASING':
        this.targetRotationY = Math.atan2(toPlayer.x, toPlayer.z);
        this.headTargetRotY = 0;

        if (distToPlayer > 1.2) {
          toPlayer.normalize();
          const currentSpeed = distToPlayer > 60 ? this.chaseSpeed : this.chaseSpeed * 0.95;
          this.position.x += toPlayer.x * currentSpeed * delta;
          this.position.z += toPlayer.z * currentSpeed * delta;
        }
        break;

      case 'BLOCKED_BY_RIVER':
      case 'ENDING_STARE':
        // Halts at the riverbank, staring across
        this.targetRotationY = Math.atan2(toPlayer.x, toPlayer.z);
        this.headTargetRotY = 0;
        break;
    }

    // Ground clamping + floating levitation (20cm + sine bob)
    const groundY = terrainHeightAt(this.position.x, this.position.z);
    const floatBob = Math.sin(this.floatTime * 2.0) * 0.07;
    this.position.y = groundY + floatBob;
    this.group.position.copy(this.position);

    // Smooth Torso Rotation
    let angleDiff = this.targetRotationY - this.currentRotationY;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.currentRotationY += angleDiff * Math.min(1.0, delta * 3.2);
    this.group.rotation.y = this.currentRotationY;

    // Head rotation
    this.headCurrentRotY += (this.headTargetRotY - this.headCurrentRotY) * Math.min(1.0, delta * 3.8);
    this.headGroup.rotation.y = this.headCurrentRotY;

    // Secondary Swaying Animation
    const sway = Math.sin(this.floatTime * 1.6) * 0.035;
    this.torsoGroup.rotation.z = sway;
    this.leftArmGroup.rotation.x = Math.sin(this.floatTime * 1.4) * 0.06;
    this.rightArmGroup.rotation.x = Math.cos(this.floatTime * 1.4) * 0.06;

    // Dangling feet sway
    this.feetGroup.rotation.x = Math.sin(this.floatTime * 1.8) * 0.05;

    // Hair strands subtle wind flutter
    this.hairLayers.children.forEach((c, idx) => {
      c.rotation.z = Math.sin(this.floatTime * 2.2 + idx * 0.4) * 0.04;
    });

    // Ragged cloth ribbons flutter
    this.clothTatteredStrips.children.forEach((strip, idx) => {
      strip.rotation.x = Math.sin(this.floatTime * 2.8 + idx * 0.5) * 0.1;
    });
  }

  public setJumpscareLungePose(worldPos: THREE.Vector3, lookAtPos: THREE.Vector3) {
    this.position.copy(worldPos);
    this.group.position.copy(this.position);

    const dx = lookAtPos.x - worldPos.x;
    const dz = lookAtPos.z - worldPos.z;
    const yaw = Math.atan2(dx, dz);
    this.currentRotationY = yaw;
    this.targetRotationY = yaw;
    this.group.rotation.y = yaw;

    // Slight eerie forward & sideways head lunge for the 0.3s 3D catch impact
    this.headCurrentRotY = 0;
    this.headTargetRotY = 0;
    this.headGroup.rotation.set(0.12, 0, -0.18);
    this.torsoGroup.rotation.z = 0.04;
    this.leftArmGroup.rotation.x = -0.85;
    this.rightArmGroup.rotation.x = -0.95;
  }

  public reset(spawnZ = -110) {
    this.position.set(22, 0, spawnZ);
    this.state = 'OBSERVING';
    this.currentRotationY = Math.PI;
    this.targetRotationY = Math.PI;
    this.headCurrentRotY = 0;
    this.headTargetRotY = 0;
    this.torsoGroup.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.leftArmGroup.rotation.set(0, 0, 0);
    this.rightArmGroup.rotation.set(0, 0, 0);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.currentRotationY;
  }
}
