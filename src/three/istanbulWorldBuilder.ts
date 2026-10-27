import * as THREE from 'three';
import {
  INITIAL_ISTANBUL_DEPOTS,
  ISTANBUL_DISTRICTS
} from '../data/historicalData';
import {
  createEnterableDepotBuilding,
  createSignboardTexture,
  createTurkishFlagMesh,
  DepotRuntimeInstance
} from './proceduralModels';

export interface IstanbulWorldBuildResult {
  props: THREE.Object3D[];
  colliders: Array<{ x: number; z: number; halfW: number; halfD: number; maxY?: number; mesh: THREE.Object3D }>;
  depots: DepotRuntimeInstance[];
  tramObj: { mesh: THREE.Group; z: number; dir: number } | null;
  ferries: Array<{ mesh: THREE.Group; baseZ: number }>;
}

/**
 * Checks if a world coordinate (x, z) is in deep sea/strait water (excluding bridges, piers, and causeways).
 */
export function isPointInSeaWater(
  x: number,
  z: number,
  chapter: number,
  kurtulusPhase: number
): boolean {
  // Çanakkale Arıburnu Sea (Chapter 2)
  if (chapter === 2) {
    return x < -58;
  }

  // Expanded Istanbul Map (Chapter 5, Phase 1)
  if (chapter === 5 && kurtulusPhase === 1) {
    // 1. Check Golden Horn (Haliç: X from -175 to 34.5, Z from -16.5 to 8.5)
    const inHalicZ = z > -16.2 && z < 8.2;
    if (inHalicZ && x > -175 && x <= 34.5) {
      // Safe on Galata Bridge (X centered at -2, width 14 => [-9.2, 5.2])
      if (x >= -9.2 && x <= 5.2) return false;
      // Safe on Unkapanı / Haliç Bridge (X centered at -112, width 14 => [-119.2, -104.8])
      if (x >= -119.2 && x <= -104.8) return false;
      return true;
    }

    // 2. Check Bosphorus Strait (Boğaz: X from 34.8 to 129.2)
    if (x > 34.8 && x < 129.2) {
      // Safe on South Bosphorus Causeway (Z centered at 28, width 9 => [23.2, 32.8])
      if (z >= 23.2 && z <= 32.8) return false;
      // Safe on North Bosphorus Causeway (Z centered at -42, width 9 => [-46.8, -37.2])
      if (z >= -46.8 && z <= -37.2) return false;
      return true;
    }
  }

  return false;
}

export function buildExpandedIstanbulWorld(
  scene: THREE.Scene,
  crescentTex: THREE.Texture
): IstanbulWorldBuildResult {
  const props: THREE.Object3D[] = [];
  const colliders: Array<{ x: number; z: number; halfW: number; halfD: number; maxY?: number; mesh: THREE.Object3D }> = [];
  const depots: DepotRuntimeInstance[] = [];
  const ferries: Array<{ mesh: THREE.Group; baseZ: number }> = [];

  const stoneWallMat = new THREE.MeshStandardMaterial({ color: 0x7a7267, roughness: 0.88 });
  const stoneWarmMat = new THREE.MeshStandardMaterial({ color: 0x9c8c79, roughness: 0.82 });
  const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x33302c, roughness: 0.95 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb5634b, roughness: 0.78 });
  const leadDomeMat = new THREE.MeshStandardMaterial({ color: 0x565c63, metalness: 0.45, roughness: 0.5 });
  const plasterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe3dcd2, roughness: 0.7 });
  const plasterOchreMat = new THREE.MeshStandardMaterial({ color: 0xc9a97c, roughness: 0.75 });
  const marbleWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.35 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d2616, roughness: 0.85 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, metalness: 0.9, roughness: 0.2 });
  const bridgeBronzeMat = new THREE.MeshStandardMaterial({ color: 0x2e3b33, metalness: 0.75, roughness: 0.35 });
  const steelNavyMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, metalness: 0.8, roughness: 0.3 });

  // 1. BOSPHORUS STRAIT (Between X=35 and X=130) & GOLDEN HORN (Haliç at Z=-4, X=-175 to X=35)
  const bosphorusSea = new THREE.Mesh(
    new THREE.PlaneGeometry(95, 680),
    new THREE.MeshStandardMaterial({ color: 0x0a2338, roughness: 0.16, metalness: 0.78 })
  );
  bosphorusSea.rotation.x = -Math.PI / 2;
  bosphorusSea.position.set(82, 0.08, 0);
  scene.add(bosphorusSea);
  props.push(bosphorusSea);

  const halicWater = new THREE.Mesh(
    new THREE.PlaneGeometry(210, 25),
    new THREE.MeshStandardMaterial({ color: 0x0a2338, roughness: 0.16, metalness: 0.78 })
  );
  halicWater.rotation.x = -Math.PI / 2;
  halicWater.position.set(-70, 0.09, -4);
  scene.add(halicWater);
  props.push(halicWater);

  // Quay Stone Curbs (Low curbs so they don't collide with buildings)
  const euroQuay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 620), stoneWallMat);
  euroQuay.position.set(34.2, 0.32, 0);
  scene.add(euroQuay);
  props.push(euroQuay);

  const asiaQuay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 620), stoneWallMat);
  asiaQuay.position.set(129.8, 0.32, 0);
  scene.add(asiaQuay);
  props.push(asiaQuay);

  // 2. GALATA BRIDGE (X=-2) & UNKAPANI / HALİÇ BRIDGE (X=-112)
  [-2, -112].forEach((bridgeX) => {
    const bridgeGrp = new THREE.Group();
    const bridgeLen = 28;
    const bridgeWidth = 14;
    const roadDeck = new THREE.Mesh(
      new THREE.BoxGeometry(bridgeWidth, 0.45, bridgeLen),
      new THREE.MeshStandardMaterial({ color: 0x47433e, roughness: 0.9 })
    );
    roadDeck.position.y = 0.22;
    bridgeGrp.add(roadDeck);

    [-1, 1].forEach((side) => {
      const walkX = side * (bridgeWidth / 2 - 1.1);
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, bridgeLen), stoneWarmMat);
      walkway.position.set(walkX, 0.32, 0);
      bridgeGrp.add(walkway);

      const railBar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, bridgeLen), bridgeBronzeMat);
      railBar.position.set(side * (bridgeWidth / 2 - 0.15), 1.1, 0);
      bridgeGrp.add(railBar);
    });

    [-bridgeLen / 2, bridgeLen / 2].forEach((endZ) => {
      [-1, 1].forEach((side) => {
        const towerX = side * (bridgeWidth / 2 + 0.8);
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.8, 2.0), stoneWarmMat);
        pillar.position.set(towerX, 3.9, endZ);
        bridgeGrp.add(pillar);
        const cupola = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 8), leadDomeMat);
        cupola.position.set(towerX, 9.0, endZ);
        bridgeGrp.add(cupola);
      });
    });

    bridgeGrp.position.set(bridgeX, 0, -4);
    scene.add(bridgeGrp);
    props.push(bridgeGrp);
  });

  // Bosphorus Safe Causeways (Z=28 and Z=-42) for driving Supply Truck & Horses to Asian Side
  [28, -42].forEach((crossZ) => {
    const causeway = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(96, 0.55, 9.0), woodDarkMat);
    deck.position.set(82, 0.25, crossZ);
    causeway.add(deck);
    scene.add(causeway);
    props.push(causeway);
  });

  // 3. HISTORIC RED ELECTRIC TRAMWAY
  const tramGroup = new THREE.Group();
  const tramBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.1, 6.8),
    new THREE.MeshStandardMaterial({ color: 0x9e1b1b, metalness: 0.4, roughness: 0.35 })
  );
  tramBody.position.y = 1.45;
  tramGroup.add(tramBody);
  const tramCream = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.95, 6.2), plasterWhiteMat);
  tramCream.position.y = 2.2;
  tramGroup.add(tramCream);
  const tramRoof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 7.0), woodDarkMat);
  tramRoof.position.y = 2.85;
  tramGroup.add(tramRoof);
  tramGroup.position.set(-2, 0.2, -4);
  scene.add(tramGroup);
  props.push(tramGroup);
  const tramObj = { mesh: tramGroup, z: -4, dir: 1 };

  // 4. MAIDEN'S TOWER (KIZ KULESİ - Placed in Bosphorus at X=92, Z=-12, well clear of bridges)
  const maidensTower = new THREE.Group();
  const mRock = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 10.5, 2.2, 16), stoneDarkMat);
  mRock.position.y = 0.8;
  maidensTower.add(mRock);
  const mBase = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 5.5, 8), stoneWallMat);
  mBase.position.y = 4.2;
  maidensTower.add(mBase);
  const mShaft = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.4, 11, 16), plasterWhiteMat);
  mShaft.position.y = 12.2;
  maidensTower.add(mShaft);
  const mDome = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5.8, 16), leadDomeMat);
  mDome.position.y = 20.8;
  maidensTower.add(mDome);
  const mFlag = createTurkishFlagMesh();
  mFlag.scale.set(0.6, 0.6, 0.6);
  mFlag.position.set(1.1, 24.5, 0);
  maidensTower.add(mFlag);
  maidensTower.position.set(92, 0, -12);
  scene.add(maidensTower);
  props.push(maidensTower);

  // 5. GALATA TOWER (Placed at X=-56, Z=-88 — completely clear of Pera Depot at X=-44, Z=-52)
  const galataTower = new THREE.Group();
  const gBody = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 7.0, 28, 24), stoneWallMat);
  gBody.position.y = 14;
  galataTower.add(gBody);
  const gTop = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.0, 5.5, 24), plasterWhiteMat);
  gTop.position.y = 30.5;
  galataTower.add(gTop);
  const gRoof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 11, 24), leadDomeMat);
  gRoof.position.y = 38.5;
  galataTower.add(gRoof);
  galataTower.position.set(-56, 0, -88);
  scene.add(galataTower);
  props.push(galataTower);
  colliders.push({ x: -56, z: -88, halfW: 7.0, halfD: 7.0, maxY: 38, mesh: galataTower });

  // 6. SULTANAHMET MOSQUE (Placed at X=-66, Z=56 — completely clear of Divanyolu Depot at X=-36, Z=24)
  const sultanahmetMosque = new THREE.Group();
  const sBase = new THREE.Mesh(new THREE.BoxGeometry(18, 9.5, 18), stoneWarmMat);
  sBase.position.y = 4.75;
  sultanahmetMosque.add(sBase);
  const sDome = new THREE.Mesh(
    new THREE.SphereGeometry(7.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    leadDomeMat
  );
  sDome.position.y = 9.5;
  sultanahmetMosque.add(sDome);
  [
    [-10, -10],
    [10, -10],
    [-10, 10],
    [10, 10],
    [-11.5, 0],
    [11.5, 0]
  ].forEach(([mx, mz]) => {
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 24, 10), marbleWhiteMat);
    minaret.position.set(mx, 12, mz);
    sultanahmetMosque.add(minaret);
    const mCap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 10), leadDomeMat);
    mCap.position.set(mx, 26, mz);
    sultanahmetMosque.add(mCap);
  });
  sultanahmetMosque.position.set(-66, 0, 56);
  scene.add(sultanahmetMosque);
  props.push(sultanahmetMosque);
  colliders.push({ x: -66, z: 56, halfW: 9.5, halfD: 9.5, maxY: 22, mesh: sultanahmetMosque });

  // 7. SİRKECİ GARI (Placed at X=20, Z=86 — well clear of Sirkeci Gümrük Depot at X=18, Z=24 and Dock at X=0, Z=65)
  const sirkeciStation = new THREE.Group();
  const sHall = new THREE.Mesh(new THREE.BoxGeometry(17, 7.5, 6.8), terracottaMat);
  sHall.position.y = 3.75;
  sirkeciStation.add(sHall);
  [-6.5, 6.5].forEach((tx) => {
    const cTower = new THREE.Mesh(new THREE.BoxGeometry(3.0, 12.0, 3.0), stoneWarmMat);
    cTower.position.set(tx, 6.0, 2.0);
    sirkeciStation.add(cTower);
    const oDome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 12), leadDomeMat);
    oDome.position.set(tx, 12.8, 2.0);
    sirkeciStation.add(oDome);
  });
  sirkeciStation.position.set(20, 0, 86);
  scene.add(sirkeciStation);
  props.push(sirkeciStation);
  colliders.push({ x: 20, z: 86, halfW: 8.8, halfD: 3.6, maxY: 12, mesh: sirkeciStation });

  // 8. ÜSKÜDAR SELİMİYE KIŞLASI (Placed at X=198, Z=-42 — 44m east of Selimiye Depot at X=154, Z=-42)
  const selimiyeBarracks = new THREE.Group();
  const selMain = new THREE.Mesh(new THREE.BoxGeometry(26, 9.0, 20), plasterOchreMat);
  selMain.position.y = 4.5;
  selimiyeBarracks.add(selMain);
  [
    [-13, -10],
    [13, -10],
    [-13, 10],
    [13, 10]
  ].forEach(([tx, tz]) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 16.0, 4.2), stoneWarmMat);
    tower.position.set(tx, 8.0, tz);
    selimiyeBarracks.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 4.0, 4), leadDomeMat);
    roof.position.set(tx, 18.0, tz);
    roof.rotation.y = Math.PI / 4;
    selimiyeBarracks.add(roof);
  });
  selimiyeBarracks.position.set(198, 0, -42);
  scene.add(selimiyeBarracks);
  props.push(selimiyeBarracks);
  colliders.push({ x: 198, z: -42, halfW: 13.5, halfD: 10.5, maxY: 18, mesh: selimiyeBarracks });

  // 9. KADIKÖY HAYDARPAŞA GARI (Placed at X=198, Z=82 — 44m east of Haydarpaşa Depot at X=154, Z=82)
  const haydarpasaStation = new THREE.Group();
  const hpBody = new THREE.Mesh(new THREE.BoxGeometry(24, 11.5, 11), stoneWarmMat);
  hpBody.position.y = 5.75;
  haydarpasaStation.add(hpBody);
  const hpRoof = new THREE.Mesh(new THREE.BoxGeometry(24.6, 2.2, 11.6), leadDomeMat);
  hpRoof.position.y = 12.6;
  haydarpasaStation.add(hpRoof);
  [-10.8, 10.8].forEach((tx) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 16, 14), stoneWarmMat);
    tower.position.set(tx, 8.0, 5.2);
    haydarpasaStation.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.7, 5.0, 14), leadDomeMat);
    spire.position.set(tx, 18.5, 5.2);
    haydarpasaStation.add(spire);
  });
  haydarpasaStation.position.set(198, 0, 82);
  scene.add(haydarpasaStation);
  props.push(haydarpasaStation);
  colliders.push({ x: 198, z: 82, halfW: 12.5, halfD: 6.0, maxY: 18, mesh: haydarpasaStation });

  // 10. DISTRICT SIGNPOSTS (Placed 16m away from depots so they never touch any wall)
  ISTANBUL_DISTRICTS.forEach((dist) => {
    const postGrp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 5.2, 8), steelNavyMat);
    pole.position.y = 2.6;
    postGrp.add(pole);

    const signTex = createSignboardTexture(dist.name, `${dist.side} · Tehlike: ${dist.dangerLevel}`, '#172554');
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 1.35, 0.14),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    board.position.y = 5.2;
    postGrp.add(board);

    postGrp.position.set(dist.centerX - 11, 0, dist.centerZ + 14);
    scene.add(postGrp);
    props.push(postGrp);
  });

  // 11. ALL 10 ENTERABLE & RAIDABLE DEPOTS / LOGISTICS CENTERS
  INITIAL_ISTANBUL_DEPOTS.forEach((depotSpec) => {
    const { instance, wallColliders } = createEnterableDepotBuilding(depotSpec, crescentTex);
    scene.add(instance.group);
    props.push(instance.group);
    depots.push(instance);
    colliders.push(...wallColliders);
  });

  // 12. BOSPHORUS STEAM FERRIES
  [8, -24].forEach((fz) => {
    const steamFerry = new THREE.Group();
    const fHull = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 2.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x121417 })
    );
    fHull.position.y = 1.1;
    steamFerry.add(fHull);
    const fCabin = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.4, 16), plasterWhiteMat);
    fCabin.position.y = 3.5;
    steamFerry.add(fCabin);
    const fFunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 5.2, 12), brassMat);
    fFunnel.position.set(0, 7.2, 0);
    steamFerry.add(fFunnel);
    steamFerry.position.set(52, 0, fz);
    scene.add(steamFerry);
    props.push(steamFerry);
    ferries.push({ mesh: steamFerry, baseZ: fz });
  });

  return {
    props,
    colliders,
    depots,
    tramObj,
    ferries
  };
}
