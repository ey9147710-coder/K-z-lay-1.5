import * as THREE from 'three';
import {
  HorseSpec,
  RaidDepot,
  ReconstructionProjectSpec,
  VolunteerCharacter
} from '../data/historicalData';

export function createCrescentCanvasTexture(): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 256;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#f5eedc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#d4a843';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 240);

  ctx.fillStyle = '#c8102e';
  ctx.beginPath();
  ctx.arc(128, 128, 82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5eedc';
  ctx.beginPath();
  ctx.arc(152, 128, 66, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSignboardTexture(title: string, subtitle: string, bgHex = '#1b1510'): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 160;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#d4a843';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 148);

  ctx.fillStyle = '#c8102e';
  ctx.beginPath();
  ctx.arc(62, 80, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bgHex;
  ctx.beginPath();
  ctx.arc(74, 80, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5eedc';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(title.slice(0, 28), 115, 72);

  ctx.fillStyle = '#d4a843';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(subtitle.slice(0, 38), 115, 112);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTurkishFlagMesh(): THREE.Group {
  const flagGrp = new THREE.Group();
  const bgMat = new THREE.MeshStandardMaterial({ color: 0xd91414, roughness: 0.65 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.08), bgMat);
  flagGrp.add(cloth);

  const crescentOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 16), whiteMat);
  crescentOuter.rotation.x = Math.PI / 2;
  crescentOuter.position.set(-0.45, 0, 0);
  flagGrp.add(crescentOuter);

  const crescentInner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), bgMat);
  crescentInner.rotation.x = Math.PI / 2;
  crescentInner.position.set(-0.32, 0, 0);
  flagGrp.add(crescentInner);

  const starShape = new THREE.Shape();
  const pts = 5;
  const outerR = 0.24;
  const innerR = 0.11;
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(sx, sy);
    else starShape.lineTo(sx, sy);
  }
  starShape.closePath();

  const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false });
  const starMesh = new THREE.Mesh(starGeo, whiteMat);
  starMesh.position.set(0.35, 0, 0.05);
  starMesh.rotation.y = Math.PI;
  flagGrp.add(starMesh);

  return flagGrp;
}

export function createAtaturkModel(): { grp: THREE.Group; flash: THREE.Mesh } {
  const grp = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x3b4d32, roughness: 0.72, metalness: 0.08 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.35, metalness: 0.2 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2ba92, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe6b800, metalness: 0.85, roughness: 0.22 });

  [-0.22, 0.22].forEach((lx) => {
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.45, 12), bootMat);
    boot.position.set(lx, 0.22, 0);
    grp.add(boot);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.45, 12), coatMat);
    leg.position.set(lx, 0.62, 0);
    grp.add(leg);
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.92, 0.46), coatMat);
  torso.position.y = 1.24;
  torso.castShadow = true;
  grp.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.48), bootMat);
  belt.position.y = 1.02;
  grp.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.5), goldMat);
  buckle.position.y = 1.02;
  grp.add(buckle);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 10), coatMat);
  leftArm.position.set(-0.52, 1.22, 0);
  leftArm.rotation.z = 0.12;
  grp.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.72, 10), coatMat);
  rightArm.position.set(0.52, 1.25, 0.22);
  rightArm.rotation.x = Math.PI / 2.5;
  grp.add(rightArm);

  const epL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.32), goldMat);
  epL.position.set(-0.42, 1.71, 0);
  grp.add(epL);

  const epR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.32), goldMat);
  epR.position.set(0.42, 1.71, 0);
  grp.add(epR);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 10), skinMat);
  neck.position.y = 1.76;
  grp.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), skinMat);
  head.position.y = 1.98;
  grp.add(head);

  const kalpak = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.26, 0.34, 16),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 })
  );
  kalpak.position.y = 2.25;
  grp.add(kalpak);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.35, 24),
    new THREE.MeshBasicMaterial({ color: 0xe6b800, side: THREE.DoubleSide })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.05;
  grp.add(auraRing);

  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x1e2229, metalness: 0.7, roughness: 0.3 })
  );
  weapon.position.set(0.52, 1.22, 0.65);
  grp.add(weapon);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  flash.position.set(0.52, 1.22, 1.15);
  flash.visible = false;
  grp.add(flash);

  return { grp, flash };
}

export function createVolunteerCharacterMesh(
  vol: VolunteerCharacter,
  crescentTex: THREE.Texture
): THREE.Group {
  const grp = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: vol.coatColor, roughness: 0.65 });
  const hatMat = new THREE.MeshStandardMaterial({ color: vol.hatColor, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0b890, roughness: 0.6 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.75 });
  const armbandMat = new THREE.MeshStandardMaterial({ map: crescentTex, roughness: 0.5 });

  [-0.19, 0.19].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.75, 10), coatMat);
    leg.position.set(lx, 0.38, 0);
    grp.add(leg);
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.96, 0.46), coatMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  grp.add(torso);

  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.48), armbandMat);
  chestBadge.position.set(0, 1.26, 0);
  grp.add(chestBadge);

  const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.22), leatherMat);
  satchel.position.set(-0.48, 0.92, 0.1);
  grp.add(satchel);

  [-0.48, 0.48].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.68, 10), coatMat);
    arm.position.set(ax, 1.18, 0);
    grp.add(arm);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 14), skinMat);
  head.position.y = 1.88;
  grp.add(head);

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.28, 12), hatMat);
  hat.position.y = 2.12;
  grp.add(hat);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  grp.add(ring);

  const signTex = createSignboardTexture(vol.name, vol.bonusTitle, '#0f172a');
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.72, 0.08),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(0, 2.75, 0);
  grp.add(signMesh);

  grp.position.set(vol.x, 0, vol.z);
  return grp;
}

// YÜKSEK KAPASİTELİ AT MODELİ (10 Kişiye Kadar Sedye/Heybe Yuvası)
export function createRideableHorseMesh(
  eqHorse: HorseSpec,
  crescentTex: THREE.Texture,
  passengersCount: number
): {
  horseGrp: THREE.Group;
  legs: THREE.Group[];
  passengerSlots: THREE.Group[];
} {
  const horseGrp = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: eqHorse.color, roughness: 0.68 });
  const maneMat = new THREE.MeshStandardMaterial({ color: eqHorse.maneColor, roughness: 0.9 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b2313, roughness: 0.55 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a843, metalness: 0.85, roughness: 0.25 });

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 1.75, 16), coatMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.38, 0.05);
  barrel.castShadow = true;
  horseGrp.add(barrel);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 14), coatMat);
  chest.position.set(0, 1.38, -0.78);
  horseGrp.add(chest);

  const croup = new THREE.Mesh(new THREE.SphereGeometry(0.57, 14, 14), coatMat);
  croup.position.set(0, 1.42, 0.92);
  horseGrp.add(croup);

  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.56, -0.94);
  neckGroup.rotation.x = 0.58;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.05, 12), coatMat);
  neck.position.y = 0.42;
  neckGroup.add(neck);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.22), maneMat);
  mane.position.set(0, 0.44, 0.24);
  neckGroup.add(mane);

  const headSkull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), coatMat);
  headSkull.position.set(0, 0.95, -0.05);
  neckGroup.add(headSkull);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.62, 12), coatMat);
  muzzle.rotation.x = Math.PI / 2.3;
  muzzle.position.set(0, 0.84, -0.38);
  neckGroup.add(muzzle);

  [-0.12, 0.12].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), coatMat);
    ear.position.set(ex, 1.22, 0.02);
    neckGroup.add(ear);
  });
  horseGrp.add(neckGroup);

  const saddlePad = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.14, 1.25),
    new THREE.MeshStandardMaterial({ map: crescentTex })
  );
  saddlePad.position.set(0, 1.86, -0.05);
  horseGrp.add(saddlePad);

  const saddleSeat = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.9), leatherMat);
  saddleSeat.position.set(0, 1.94, -0.05);
  horseGrp.add(saddleSeat);

  const legs: THREE.Group[] = [];
  [
    [-0.32, 1.08, -0.72],
    [0.32, 1.08, -0.72],
    [-0.34, 1.08, 0.82],
    [0.34, 1.08, 0.82]
  ].forEach(([lx, ly, lz]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, ly, lz);

    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.52, 10), coatMat);
    upperLeg.position.y = -0.24;
    legPivot.add(upperLeg);

    const cannonBone = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.42, 10), coatMat);
    cannonBone.position.y = -0.72;
    legPivot.add(cannonBone);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.125, 0.16, 10), hoofMat);
    hoof.position.y = -0.98;
    legPivot.add(hoof);

    const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 6, 12), brassMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.y = -1.05;
    legPivot.add(shoe);

    horseGrp.add(legPivot);
    legs.push(legPivot);
  });

  // Up to 10 Passenger / Stretcher Pack Visual Slots
  const passengerSlots: THREE.Group[] = [];
  const slotOffsets = [
    new THREE.Vector3(0, 1.98, 0.65),
    new THREE.Vector3(-0.78, 1.48, 0.15),
    new THREE.Vector3(0.78, 1.48, 0.15),
    new THREE.Vector3(-0.78, 1.48, 0.75),
    new THREE.Vector3(0.78, 1.48, 0.75),
    new THREE.Vector3(0, 2.28, 0.65),
    new THREE.Vector3(-0.78, 1.85, 0.15),
    new THREE.Vector3(0.78, 1.85, 0.15),
    new THREE.Vector3(-0.78, 1.85, 0.75),
    new THREE.Vector3(0.78, 1.85, 0.75)
  ];

  slotOffsets.forEach((offset, idx) => {
    const pSlot = new THREE.Group();
    const pBlanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.3, 0.56),
      new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.7 })
    );
    pSlot.add(pBlanket);
    const pHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xdcb48c, roughness: 0.6 })
    );
    pHead.position.set(0, 0.22, -0.18);
    pSlot.add(pHead);
    pSlot.position.copy(offset);
    pSlot.visible = idx < passengersCount;
    horseGrp.add(pSlot);
    passengerSlots.push(pSlot);
  });

  const mountRing = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xe6b800, side: THREE.DoubleSide })
  );
  mountRing.rotation.x = -Math.PI / 2;
  mountRing.position.y = 0.06;
  horseGrp.add(mountRing);

  return { horseGrp, legs, passengerSlots };
}

export function createTruckSignboardTexture(loadedCount: number, maxCapacity = 6): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 640;
  cvs.height = 220;
  const ctx = cvs.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 640, 220);

  // Brass border
  ctx.strokeStyle = loadedCount >= maxCapacity ? '#10b981' : '#d4a843';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 628, 208);

  // Crescent emblem on left
  ctx.fillStyle = '#c8102e';
  ctx.beginPath();
  ctx.arc(64, 76, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(77, 76, 30, 0, Math.PI * 2);
  ctx.fill();

  // Header Title
  ctx.fillStyle = '#f5eedc';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('MİM MİM NAKLİYE KAMYONU', 120, 56);

  // Dynamic Crate Count Label
  const ratio = Math.min(1, Math.max(0, loadedCount / maxCapacity));
  const pct = Math.round(ratio * 100);
  ctx.fillStyle = loadedCount >= maxCapacity ? '#34d399' : '#fbbf24';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`YÜKLENEN SANDIK: ${loadedCount} / ${maxCapacity} (%${pct})`, 120, 96);

  // 2D Progress Bar Track on Signboard
  const barX = 36;
  const barY = 124;
  const barW = 568;
  const barH = 34;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(barX, barY, barW, barH);

  // Segmented Fill Blocks
  const segGap = 6;
  const segWidth = (barW - segGap * (maxCapacity + 1)) / maxCapacity;
  for (let i = 0; i < maxCapacity; i++) {
    const sx = barX + segGap + i * (segWidth + segGap);
    if (i < loadedCount) {
      ctx.fillStyle = loadedCount >= maxCapacity ? '#10b981' : '#f59e0b';
    } else {
      ctx.fillStyle = '#334155';
    }
    ctx.fillRect(sx, barY + 5, segWidth, barH - 10);
  }

  // Footer Controls Hint
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('[E] Sandık Yükle · [G] Sür · [V] Kamera Açısı Değiştir', 82, 192);

  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 1920 MODEL MİM MİM GRUBU & HİLÂL-İ AHMER NAKLİYE KAMYONU (Çalınan Malları Yükleme ve Sürme Aracı)
export function createSupplyTruckMesh(
  crescentTex: THREE.Texture,
  loadedCratesCount: number,
  maxCapacity = 6
): {
  truckGrp: THREE.Group;
  wheels: THREE.Mesh[];
  frontWheelPivots: THREE.Group[];
  steeringWheel: THREE.Mesh;
  crateSlots: THREE.Group[];
  updateCargoProgress: (newLoadedCount: number, targetCap?: number) => void;
} {
  const truckGrp = new THREE.Group();
  truckGrp.rotation.order = 'YXZ';

  const bodyOliveMat = new THREE.MeshStandardMaterial({ color: 0x384230, roughness: 0.65, metalness: 0.2 });
  const woodBedMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xd6cbb5, roughness: 0.85 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e2226, metalness: 0.75, roughness: 0.35 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4a843, metalness: 0.9, roughness: 0.2 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x85582a, roughness: 0.75 });

  // 1. Main Steel Chassis Frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 6.4), darkMetalMat);
  chassis.position.set(0, 0.75, 0);
  chassis.castShadow = true;
  truckGrp.add(chassis);

  // 2. 1920s Engine Hood & Brass Radiator Grille (Front at -Z)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.15, 1.65), bodyOliveMat);
  hood.position.set(0, 1.45, -2.35);
  hood.castShadow = true;
  truckGrp.add(hood);

  const radiator = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.05, 0.14), brassMat);
  radiator.position.set(0, 1.45, -3.18);
  truckGrp.add(radiator);

  // Dual Brass Headlights
  [-0.65, 0.65].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 12), brassMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(hx, 1.25, -3.22);
    truckGrp.add(lamp);
  });

  // 3. Driver Cab, Steering Wheel & Roof
  const cabBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 0.2), bodyOliveMat);
  cabBack.position.set(0, 1.85, -0.55);
  truckGrp.add(cabBack);

  const cabSeat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 0.85), woodBedMat);
  cabSeat.position.set(0, 1.2, -0.95);
  truckGrp.add(cabSeat);

  // Steering Column & Wheel inside Cab (visible in 1st-person & 3rd-person camera)
  const steeringColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), darkMetalMat);
  steeringColumn.rotation.x = -0.55;
  steeringColumn.position.set(-0.45, 1.55, -1.35);
  truckGrp.add(steeringColumn);

  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 16), brassMat);
  steeringWheel.rotation.x = Math.PI / 2 - 0.55;
  steeringWheel.position.set(-0.45, 1.92, -1.12);
  truckGrp.add(steeringWheel);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.35), bodyOliveMat);
  cabRoof.position.set(0, 2.85, -1.05);
  truckGrp.add(cabRoof);

  [-1.08, 1.08].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), darkMetalMat);
    pillar.position.set(px, 2.15, -1.55);
    truckGrp.add(pillar);
  });

  // 4. Flatbed Wooden Cargo Bed & Side Rails (Rear at +Z)
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.22, 3.85), woodBedMat);
  bedFloor.position.set(0, 0.98, 1.4);
  bedFloor.castShadow = true;
  truckGrp.add(bedFloor);

  [-1.28, 1.28].forEach((sx) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 3.85), woodBedMat);
    sideRail.position.set(sx, 1.52, 1.4);
    truckGrp.add(sideRail);

    const crescentSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.75, 1.2),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    crescentSign.position.set(sx, 1.55, 1.4);
    truckGrp.add(crescentSign);
  });

  // Overhead Canvas Canopy Top
  const canopyTop = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.18, 3.7), canvasMat);
  canopyTop.position.set(0, 2.92, 1.35);
  truckGrp.add(canopyTop);

  // 5. 4 Spoked Truck Wheels (Front 2 inside steerable Ackermann Pivots, Rear 2 on Drive Axle)
  const wheels: THREE.Mesh[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  [-1.32, 1.32].forEach((wx) => {
    // Steerable Front Wheel Pivot (wz = -2.25)
    const frontPivot = new THREE.Group();
    frontPivot.position.set(wx, 0.58, -2.25);

    const frontWheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.36, 16), darkMetalMat);
    frontWheelMesh.rotation.z = Math.PI / 2;
    frontPivot.add(frontWheelMesh);

    const frontHub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 12), brassMat);
    frontHub.rotation.z = Math.PI / 2;
    frontWheelMesh.add(frontHub);

    truckGrp.add(frontPivot);
    frontWheelPivots.push(frontPivot);
    wheels.push(frontWheelMesh);

    // Rear Drive Axle Wheel (wz = 1.85)
    const rearWheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.36, 16), darkMetalMat);
    rearWheelMesh.rotation.z = Math.PI / 2;
    rearWheelMesh.position.set(wx, 0.58, 1.85);

    const rearHub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 12), brassMat);
    rearHub.rotation.z = Math.PI / 2;
    rearWheelMesh.add(rearHub);

    truckGrp.add(rearWheelMesh);
    wheels.push(rearWheelMesh);
  });

  // 6. 6 Individual Stolen Crate Slots in the Truck Bed
  const crateSlots: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const cGrp = new THREE.Group();
    const cBox = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 0.95), crateMat);
    cBox.position.y = 0.34;
    cGrp.add(cBox);

    const cBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.98),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    cBadge.position.y = 0.36;
    cGrp.add(cBadge);

    const col = i % 2 === 0 ? -0.56 : 0.56;
    const row = Math.floor(i / 2);
    cGrp.position.set(col, 1.1, 0.15 + row * 1.18);
    cGrp.visible = i < loadedCratesCount;
    truckGrp.add(cGrp);
    crateSlots.push(cGrp);
  }

  // Rear Loading & Driving Highlight Ring
  const rearRing = new THREE.Mesh(
    new THREE.RingGeometry(1.8, 2.3, 28),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
  );
  rearRing.rotation.x = -Math.PI / 2;
  rearRing.position.set(0, 0.07, 3.8);
  truckGrp.add(rearRing);

  // 7. 3D Physical Progress Bar Mounted on the Truck Roof (Visible from all angles)
  const barTrackWidth = 3.8;
  const barHousing = new THREE.Mesh(
    new THREE.BoxGeometry(barTrackWidth + 0.25, 0.34, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 })
  );
  barHousing.position.set(0, 3.28, 1.35);
  truckGrp.add(barHousing);

  const barSegmentMeshes: THREE.Mesh[] = [];
  const segSpan = barTrackWidth / 6;
  for (let i = 0; i < 6; i++) {
    const segMat = new THREE.MeshStandardMaterial({
      color: i < loadedCratesCount ? 0x10b981 : 0x334155,
      emissive: i < loadedCratesCount ? 0x059669 : 0x000000,
      emissiveIntensity: i < loadedCratesCount ? 0.65 : 0,
      roughness: 0.3
    });
    const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segSpan - 0.08, 0.22, 0.28), segMat);
    const segX = -barTrackWidth / 2 + segSpan / 2 + i * segSpan;
    segMesh.position.set(segX, 3.28, 1.35);
    truckGrp.add(segMesh);
    barSegmentMeshes.push(segMesh);
  }

  // 8. Dynamic 3D Signboard Above Progress Bar
  const signMat = new THREE.MeshBasicMaterial({
    map: createTruckSignboardTexture(loadedCratesCount, maxCapacity)
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.38, 0.14), signMat);
  signMesh.position.set(0, 4.22, 1.35);
  truckGrp.add(signMesh);

  const updateCargoProgress = (newLoadedCount: number, targetCap = 6) => {
    crateSlots.forEach((slot, idx) => {
      slot.visible = idx < newLoadedCount;
    });

    const isFull = newLoadedCount >= targetCap;
    barSegmentMeshes.forEach((seg, idx) => {
      const mat = seg.material as THREE.MeshStandardMaterial;
      if (idx < newLoadedCount) {
        mat.color.setHex(isFull ? 0x10b981 : 0xf59e0b);
        mat.emissive.setHex(isFull ? 0x059669 : 0xd97706);
        mat.emissiveIntensity = 0.75;
      } else {
        mat.color.setHex(0x334155);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    (rearRing.material as THREE.MeshBasicMaterial).color.setHex(isFull ? 0x10b981 : 0x00e5ff);

    if (signMat.map) {
      signMat.map.dispose();
    }
    signMat.map = createTruckSignboardTexture(newLoadedCount, targetCap);
    signMat.needsUpdate = true;
  };

  return { truckGrp, wheels, frontWheelPivots, steeringWheel, crateSlots, updateCargoProgress };
}

export interface DepotRuntimeInstance {
  depot: RaidDepot;
  group: THREE.Group;
  doorMesh: THREE.Mesh;
  statusRing: THREE.Mesh;
  crateMeshes: THREE.Group[];
  isUnlocked: boolean;
  lockpickProgress: number;
}

export function createEnterableDepotBuilding(
  depot: RaidDepot,
  crescentTex: THREE.Texture
): {
  instance: DepotRuntimeInstance;
  wallColliders: Array<{ x: number; z: number; halfW: number; halfD: number; maxY: number; mesh: THREE.Object3D }>;
} {
  const grp = new THREE.Group();
  grp.position.set(depot.x, 0, depot.z);

  const w = depot.width;
  const d = depot.depth;
  const h = 6.2;

  const brickMat = new THREE.MeshStandardMaterial({
    color: depot.type === 'Gümrük Silosu' ? 0x8b4c39 : depot.type === 'Lojistik Merkezi' ? 0x5a626a : 0x7c6f5a,
    roughness: 0.82,
    metalness: 0.12
  });
  const ironRoofMat = new THREE.MeshStandardMaterial({
    color: 0x2d3748,
    roughness: 0.45,
    metalness: 0.65
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.9
  });
  const doorIronMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.4,
    metalness: 0.75
  });
  const woodCrateMat = new THREE.MeshStandardMaterial({
    color: 0x85582a,
    roughness: 0.75
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 0.24, d + 2.5), floorMat);
  floor.position.set(0, 0.12, 0.5);
  floor.receiveShadow = true;
  grp.add(floor);

  const wallColliders: Array<{ x: number; z: number; halfW: number; halfD: number; maxY: number; mesh: THREE.Object3D }> = [];

  const addWall = (lx: number, lz: number, ww: number, wh: number, wd: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), brickMat);
    wall.position.set(lx, wh / 2, lz);
    wall.castShadow = true;
    wall.receiveShadow = true;
    grp.add(wall);
    wallColliders.push({
      x: depot.x + lx,
      z: depot.z + lz,
      halfW: ww / 2,
      halfD: wd / 2,
      maxY: wh,
      mesh: wall
    });
  };

  addWall(0, -d / 2, w, h, 0.7);
  addWall(-w / 2, 0, 0.7, h, d);
  addWall(w / 2, 0, 0.7, h, d);

  const frontSideWidth = (w - 4.8) / 2;
  addWall(-w / 2 + frontSideWidth / 2, d / 2, frontSideWidth, h, 0.7);
  addWall(w / 2 - frontSideWidth / 2, d / 2, frontSideWidth, h, 0.7);

  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.8, 0.75), brickMat);
  doorHeader.position.set(0, h - 0.9, d / 2);
  grp.add(doorHeader);

  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.7, 4.4, 0.35), doorIronMat);
  doorMesh.position.set(0, 2.2, d / 2);
  grp.add(doorMesh);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.6, d + 1.4), ironRoofMat);
  roof.position.set(0, h + 0.3, 0);
  grp.add(roof);

  const craneBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
  );
  craneBeam.position.set(0, h - 0.3, d / 2 + 1.4);
  grp.add(craneBeam);

  const signTex = createSignboardTexture(depot.name, `${depot.districtName} · ${depot.lootCratesTotal} Sandık`, '#1e1b18');
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.5, 0.18),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signBoard.position.set(0, h + 1.35, d / 2 + 0.2);
  grp.add(signBoard);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 28, 8),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.32 })
  );
  beacon.position.set(0, 14, d / 2 + 2.2);
  grp.add(beacon);

  const statusRing = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.65, 28),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
  );
  statusRing.rotation.x = -Math.PI / 2;
  statusRing.position.set(0, 0.08, d / 2 + 2.2);
  grp.add(statusRing);

  const crateMeshes: THREE.Group[] = [];
  for (let i = 0; i < depot.lootCratesTotal; i++) {
    const cGrp = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.95, 1.15), woodCrateMat);
    box.position.y = 0.48;
    box.castShadow = true;
    cGrp.add(box);

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.65, 1.18),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    badge.position.y = 0.5;
    cGrp.add(badge);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.4, 18),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    cGrp.add(ring);

    const col = (i % 3) - 1;
    const row = Math.floor(i / 3);
    cGrp.position.set(col * 3.0, 0, -1.2 - row * 2.5);
    grp.add(cGrp);
    crateMeshes.push(cGrp);
  }

  return {
    instance: {
      depot: { ...depot },
      group: grp,
      doorMesh,
      statusRing,
      crateMeshes,
      isUnlocked: false,
      lockpickProgress: 0
    },
    wallColliders
  };
}

export function createDefenseStructureMesh(
  type: 'sandbag_bastion' | 'barbed_wire' | 'field_aid_tent' | 'krupp_battery' | 'ammo_wagon',
  crescentTex: THREE.Texture
): THREE.Group {
  const grp = new THREE.Group();
  const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8b7755, roughness: 0.85 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.8, roughness: 0.3 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.78 });

  if (type === 'sandbag_bastion') {
    for (let row = 0; row < 3; row++) {
      for (let col = -2; col <= 2; col++) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.75), sandbagMat);
        bag.position.set(col * 1.25 + (row % 2) * 0.3, 0.24 + row * 0.42, 0);
        bag.castShadow = true;
        grp.add(bag);
      }
    }
  } else if (type === 'barbed_wire') {
    for (let i = -2; i <= 2; i++) {
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), woodMat);
      post1.position.set(i * 1.4, 0.65, 0);
      post1.rotation.x = 0.45;
      grp.add(post1);

      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), woodMat);
      post2.position.set(i * 1.4, 0.65, 0);
      post2.rotation.x = -0.45;
      grp.add(post2);
    }
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 6.2, 12), ironMat);
    coil.rotation.z = Math.PI / 2;
    coil.position.y = 0.65;
    grp.add(coil);
  } else if (type === 'field_aid_tent') {
    const tentBody = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.6, 4.6),
      new THREE.MeshStandardMaterial({ map: crescentTex, roughness: 0.6 })
    );
    tentBody.position.y = 1.3;
    tentBody.castShadow = true;
    grp.add(tentBody);

    const tentRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.6, 1.8, 4),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 })
    );
    tentRoof.position.y = 3.5;
    tentRoof.rotation.y = Math.PI / 4;
    grp.add(tentRoof);

    const healRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.6, 24),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    healRing.rotation.x = -Math.PI / 2;
    healRing.position.y = 0.06;
    grp.add(healRing);
  } else if (type === 'krupp_battery') {
    [-0.95, 0.95].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.16, 14), woodMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.68, 0);
      grp.add(wheel);
    });
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.15), ironMat);
    shield.position.set(0, 1.0, -0.2);
    grp.add(shield);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.9, 12), ironMat);
    barrel.rotation.x = Math.PI / 2.4;
    barrel.position.set(0, 1.2, -1.0);
    grp.add(barrel);
  } else {
    const wagonBed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 3.6), woodMat);
    wagonBed.position.y = 0.85;
    grp.add(wagonBed);
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 3.4, 12, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    canopy.rotation.x = Math.PI / 2;
    canopy.position.y = 1.3;
    grp.add(canopy);
  }

  return grp;
}

export function createReconstructionFacilityMesh(
  project: ReconstructionProjectSpec,
  crescentTex: THREE.Texture
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(project.x, 0, project.z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  if (project.id === 'rec_container_city') {
    for (let i = 0; i < Math.max(1, project.level); i++) {
      const unit = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 2.8), whiteMat);
      box.position.y = 1.3;
      box.castShadow = true;
      unit.add(box);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.25, 0.35, 2.85), redMat);
      stripe.position.y = 2.2;
      unit.add(stripe);
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.1, 2.88),
        new THREE.MeshStandardMaterial({ map: crescentTex })
      );
      badge.position.y = 1.35;
      unit.add(badge);
      unit.position.set((i - 1) * 6.0, 0, 0);
      grp.add(unit);
    }
  } else if (project.id === 'rec_soup_kitchen') {
    const truckBox = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 2.8), redMat);
    truckBox.position.y = 1.9;
    truckBox.castShadow = true;
    grp.add(truckBox);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.15, 2.2), whiteMat);
    awning.position.set(0, 2.8, 2.2);
    grp.add(awning);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.6, 2.86),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    sign.position.y = 2.0;
    grp.add(sign);
  } else if (project.id === 'rec_blood_center') {
    const mainLab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.6, 5.2), whiteMat);
    mainLab.position.y = 1.8;
    grp.add(mainLab);
    const crossRoof = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.5, 5.4), redMat);
    crossRoof.position.y = 3.7;
    grp.add(crossRoof);
  } else if (project.id === 'rec_psychosocial') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      blueMat
    );
    grp.add(dome);
  } else {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 7.5, 12), darkMat);
    tower.position.y = 3.75;
    grp.add(tower);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.2, 16), blueMat);
    tank.position.y = 8.2;
    grp.add(tank);
  }

  const signTex = createSignboardTexture(project.name, `Seviye ${project.level}/${project.maxLevel} · ${project.category}`, '#0f172a');
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.1, 0.15),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(0, 4.6, 0);
  grp.add(signMesh);

  return grp;
}
