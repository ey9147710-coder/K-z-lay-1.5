import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from './audio/soundEngine';
import {
  DynamicEconomyModal,
  IstanbulDistrictModal,
  PlevneDefenseModal,
  ReconstructionModal,
  VolunteerDialogModal
} from './components/StrategicModals';
import {
  CHAPTERS_DATA,
  KIZILAY_ARCHIVES,
  KIZILAY_MAP_LOCATIONS
} from './data/campaignsAndArchives';
import {
  DefenseStructureSpec,
  EconomyCommodity,
  HorseSpec,
  INITIAL_DEFENSE_STRUCTURES,
  INITIAL_ECONOMY_COMMODITIES,
  INITIAL_HORSES,
  INITIAL_ISTANBUL_DEPOTS,
  INITIAL_RECONSTRUCTION_PROJECTS,
  INITIAL_WEAPONS,
  ISTANBUL_DISTRICTS,
  RaidDepot,
  ReconstructionProjectSpec,
  VOLUNTEER_CHARACTERS,
  VolunteerCharacter,
  WeaponSpec
} from './data/historicalData';
import {
  buildExpandedIstanbulWorld,
  isPointInSeaWater
} from './three/istanbulWorldBuilder';
import {
  createAtaturkModel,
  createCrescentCanvasTexture,
  createDefenseStructureMesh,
  createReconstructionFacilityMesh,
  createRideableHorseMesh,
  createSupplyTruckMesh,
  createTurkishFlagMesh,
  createVolunteerCharacterMesh,
  DepotRuntimeInstance
} from './three/proceduralModels';

const TENT_MODELS_CATALOG = {
  standard: { id: 'standard' as const, name: 'Standart Afet Çadırı', cost: 80, sellPrice: 150 },
  winter: { id: 'winter' as const, name: 'Kışlık İzoleli Çadır', cost: 160, sellPrice: 280 },
  vip: { id: 'vip' as const, name: 'VIP Lojistik Büyük Çadır', cost: 260, sellPrice: 450 }
};

// Pre-allocated scratch vectors for zero-GC 60fps game loop
const _fwdVec = new THREE.Vector3();
const _rgtVec = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _muzzleWorld = new THREE.Vector3();
const _targetWorld = new THREE.Vector3();
const _spotterWorld = new THREE.Vector3();
const _camOffsetVec = new THREE.Vector3();

const TRUCK_CAMERA_MODES = [
  { id: 0, name: '1. Şahıs Şoför Kabini (Direksiyon Açısı)', offset: new THREE.Vector3(-0.42, 2.18, -0.95), pitchAdd: 0 },
  { id: 1, name: '3. Şahıs Dış Takip Kamerası (Geniş Açı)', offset: new THREE.Vector3(0, 4.45, 8.2), pitchAdd: -0.14 },
  { id: 2, name: 'Kasa & 3B Yük Barı Kamerası (Çapraz Açı)', offset: new THREE.Vector3(2.85, 3.85, 5.6), pitchAdd: -0.12 },
  { id: 3, name: 'Kuşbakışı Taktik Konvoy Kamerası', offset: new THREE.Vector3(0, 10.5, 10.2), pitchAdd: -0.42 }
];

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [uiTick, setUiTick] = useState(0);
  const triggerUiSync = () => setUiTick((t) => t + 1);

  const [activeModal, setActiveModal] = useState<
    | 'main_menu'
    | 'briefing'
    | 'shop'
    | 'horse_stable'
    | 'tent_sale'
    | 'timeline'
    | 'map'
    | 'archive'
    | 'pause'
    | 'martyr'
    | 'newspaper'
    | 'pressure'
    | 'istanbul_depots'
    | 'economy'
    | 'plevne_defense'
    | 'reconstruction'
    | 'gamepad_help'
    | null
  >('main_menu');

  const [activeVolunteer, setActiveVolunteer] = useState<VolunteerCharacter | null>(null);
  const [selectedMapPin, setSelectedMapPin] = useState(KIZILAY_MAP_LOCATIONS[0]);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; color: string }>>([]);
  const [controlsBarVisible, setControlsBarVisible] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [pressureVal, setPressureVal] = useState(50);
  const [currentDistrictName, setCurrentDistrictName] = useState('Eminönü & Sirkeci Garı');

  const gameRef = useRef({
    isPlaying: false,
    isPaused: false,
    isDead: false,
    isSurgeryMode: false,
    isEndless: false,
    pendingChapter: 1,
    chapter: 1,
    savedCount: 0,
    targetCount: 4,
    health: 100,
    points: 320,
    warMorale: 78,
    bastionRating: 35,
    welfareScore: 28,
    // Drowning & Water State
    isInWater: false,
    oxygenLevel: 100,
    // Stealth & Supply Truck State (Kurtuluş Savaşı Phase 1)
    stealthSuspicion: 0,
    truckLoadedCrates: 0,
    drivingSupplyTruck: false,
    truckCameraMode: 1,
    truckSpeed: 0,
    truckHeading: 0,
    truckSteerAngle: 0,
    truckPitchAngle: 0,
    truckRollAngle: 0,
    truckGearLabel: 'N',
    truckRpm: 720,
    // 2023 Ambulance & Tent Sales State
    ambulanceHasPatient: false,
    ambulanceThirdPerson: true,
    vehicleSpeed: 0,
    vehicleSteer: 0,
    vehicleHeading: 0,
    tentsSold: 0,
    // Gamepad / Controller State
    gamepadConnected: false,
    gamepadName: '',
    gamepadSensitivity: 1.0,
    gamepadVibrationEnabled: true,
    gamepadDeadzone: 0.14,
    gpLeftStickX: 0,
    gpLeftStickY: 0,
    gpRightStickX: 0,
    gpRightStickY: 0,
    gpRightTrigger: 0,
    gpLeftTrigger: 0,
    currentModal: 'main_menu' as string | null,
    currentVolunteer: null as VolunteerCharacter | null,
    currentWeaponId: 'pistol',
    currentHorseId: 'boz',
    weapons: structuredClone(INITIAL_WEAPONS) as Record<string, WeaponSpec>,
    horses: structuredClone(INITIAL_HORSES) as Record<string, HorseSpec>,
    depots: structuredClone(INITIAL_ISTANBUL_DEPOTS) as RaidDepot[],
    unlockedDepotIds: [] as string[],
    commodities: structuredClone(INITIAL_ECONOMY_COMMODITIES) as EconomyCommodity[],
    defenseStructures: structuredClone(INITIAL_DEFENSE_STRUCTURES) as DefenseStructureSpec[],
    reconstructionProjects: structuredClone(INITIAL_RECONSTRUCTION_PROJECTS) as ReconstructionProjectSpec[],
    claimedVolunteerIds: [] as string[],
    tentsInventory: { standard: 3, winter: 2, vip: 1 },
    currentCustomer: null as {
      name: string;
      wantedModel: 'standard' | 'winter' | 'vip';
      hasEnoughMoney: boolean;
      wallet: number;
      dialogue: string;
    } | null,
    horsePassengersCount: 0,
    pendingBatchHealCount: 1,
    artillerySilenced: false,
    artilleryAliveCount: 3,
    isAds: false,
    lastShotTime: 0,
    ammo: 6,
    maxAmmo: 6,
    isReloading: false,
    isCrouching: false,
    carryingSoldier: false,
    carryingMedicalCrate: false,
    kurtulusPhase: 1,
    kurtulusPhaseProgress: 0,
    kurtulusPhaseTarget: 6,
    drivingCarriage: false,
    usingAAGun: false,
    weaponRecoil: 0,
    interactionPrompt: '',
    destroyerAlertActive: false,
    destroyerAlertCountdown: 10.0,
    martyrCause: '',
    startChapterFn: (_chp: number) => {},
    rebuildHorseFn: () => {},
    rebuildWeaponFn: () => {},
    teleportPlayerFn: (_x: number, _z: number, _bringTruck?: boolean) => {},
    summonSupplyTruckNearPlayerFn: () => {},
    cycleTruckCameraFn: () => {},
    testGamepadRumbleFn: () => {},
    unlockDepotInSceneFn: (_depotId: string) => {},
    spawnDefenseMeshFn: (_type: DefenseStructureSpec['type']) => {},
    rebuildReconstructionMeshesFn: () => {},
    completeSurgeryFn: () => {},
    generateNewCustomerFn: () => {}
  });

  useEffect(() => {
    gameRef.current.currentModal = activeModal;
    gameRef.current.currentVolunteer = activeVolunteer;
  }, [activeModal, activeVolunteer]);

  const showToast = (msg: string, color = '#d4a843') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, msg, color }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  };

  const getCurrencyName = (chp = gameRef.current.chapter) => {
    if (chp === 6 || chp === 1 || chp === 2) return 'Akçe';
    if (chp === 5 || chp === 3) return 'Kuruş';
    return 'TL';
  };

  useEffect(() => {
    if (activeModal !== 'pressure') return;
    let dir = 1;
    let val = 50;
    const timer = window.setInterval(() => {
      val += dir * 2.8;
      if (val >= 100) {
        val = 100;
        dir = -1;
      } else if (val <= 0) {
        val = 0;
        dir = 1;
      }
      setPressureVal(val);
    }, 45);
    return () => window.clearInterval(timer);
  }, [activeModal]);

  useEffect(() => {
    if (!gameRef.current.isSurgeryMode) return;
    const cvs = ecgCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#060c10';
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    let xPos = 0;
    let animId = 0;

    const draw = () => {
      if (!gameRef.current.isSurgeryMode) return;
      ctx.fillStyle = 'rgba(6, 12, 16, 0.08)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      const phase = (xPos % 70) / 70;
      let yOffset = 0;
      if (phase > 0.42 && phase < 0.46) yOffset = -20;
      else if (phase >= 0.46 && phase < 0.5) yOffset = 16;
      else if (phase > 0.6 && phase < 0.7) yOffset = -6;
      else yOffset = (Math.random() - 0.5) * 2;

      const nextX = (xPos + 2) % cvs.width;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xPos, cvs.height / 2);
      ctx.lineTo(nextX, cvs.height / 2 + yOffset);
      ctx.stroke();

      if (phase > 0.43 && phase < 0.46) soundEngine.playSfx('heartbeat');
      xPos = nextX;
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [uiTick]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x98aab8, 0.0085);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 480);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b2f2f, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4db, 1.15);
    sunLight.position.set(55, 95, 45);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const clock = new THREE.Clock();
    const crescentTex = createCrescentCanvasTexture();
    crescentTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const weaponGroup = new THREE.Group();
    let muzzleFlashMesh: THREE.Mesh | null = null;
    camera.add(weaponGroup);

    const carriedSoldierVisual = new THREE.Group();
    const stretcherFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.08, 1.45),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 })
    );
    stretcherFrame.position.set(0, -0.12, 0);
    carriedSoldierVisual.add(stretcherFrame);
    const stretcherMattress = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.1, 1.35),
      new THREE.MeshStandardMaterial({ color: 0xd91414, roughness: 0.7 })
    );
    stretcherMattress.position.set(0, -0.05, 0);
    carriedSoldierVisual.add(stretcherMattress);
    const patientBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.22, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x475569 })
    );
    patientBody.position.set(0, 0.1, 0);
    carriedSoldierVisual.add(patientBody);
    const patientHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9b38c })
    );
    patientHead.position.set(0, 0.24, -0.42);
    carriedSoldierVisual.add(patientHead);
    carriedSoldierVisual.position.set(0, -0.52, -1.25);
    carriedSoldierVisual.visible = false;
    camera.add(carriedSoldierVisual);

    const carriedCrateVisual = new THREE.Group();
    const crateBoxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.42, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x85582a, roughness: 0.75 })
    );
    carriedCrateVisual.add(crateBoxMesh);
    const crateBadgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.57),
      new THREE.MeshStandardMaterial({ map: crescentTex })
    );
    carriedCrateVisual.add(crateBadgeMesh);
    carriedCrateVisual.position.set(0, -0.38, -0.95);
    carriedCrateVisual.visible = false;
    camera.add(carriedCrateVisual);

    scene.add(camera);

    // 3D Surgery Scene
    const surgeryScene = new THREE.Scene();
    surgeryScene.background = new THREE.Color(0x090d16);
    const surgeryCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
    surgeryCamera.position.set(0, 4.2, 3.2);
    surgeryCamera.lookAt(0, 0.2, -0.3);
    const sLight = new THREE.PointLight(0xffeedd, 1.8, 20);
    sLight.position.set(0, 5.0, 2);
    surgeryScene.add(sLight);
    surgeryScene.add(new THREE.AmbientLight(0x999999));

    const surgeryTableGroup = new THREE.Group();
    const sTable = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.4, 4.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    sTable.position.y = -0.2;
    surgeryTableGroup.add(sTable);

    const sArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 4.4, 20),
      new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 })
    );
    sArm.rotation.z = Math.PI / 2;
    sArm.position.set(0, 0.25, 0.2);
    surgeryTableGroup.add(sArm);

    const veinMeshRef = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.5, 20),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.85 })
    );
    veinMeshRef.rotation.z = Math.PI / 2;
    veinMeshRef.position.set(0.55, 0.62, 0.2);
    veinMeshRef.userData = { type: 'VEIN' };
    surgeryTableGroup.add(veinMeshRef);

    const wrongZoneMeshRef = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 1.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.45 })
    );
    wrongZoneMeshRef.rotation.z = Math.PI / 2;
    wrongZoneMeshRef.position.set(-1.1, 0.6, 0.2);
    wrongZoneMeshRef.userData = { type: 'WRONG' };
    surgeryTableGroup.add(wrongZoneMeshRef);

    const headGrp = new THREE.Group();
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.45, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbcfe8 })
    );
    headGrp.add(neck);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbcfe8 })
    );
    head.position.set(0, 0.75, 0);
    headGrp.add(head);

    const carotidTrapMeshRef = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.9 })
    );
    carotidTrapMeshRef.position.set(0.22, 0.28, 0.42);
    carotidTrapMeshRef.userData = { type: 'CAROTID_TRAP' };
    headGrp.add(carotidTrapMeshRef);
    headGrp.position.set(0, 0.25, -1.75);
    surgeryTableGroup.add(headGrp);

    const syringeMesh = new THREE.Group();
    const sBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.95, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 })
    );
    sBarrel.position.y = 0.65;
    syringeMesh.add(sBarrel);
    const sLiquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.55, 12),
      new THREE.MeshBasicMaterial({ color: 0xd91414 })
    );
    sLiquid.position.y = 0.55;
    syringeMesh.add(sLiquid);
    const sNeedle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1 })
    );
    sNeedle.position.y = 0.12;
    syringeMesh.add(sNeedle);
    syringeMesh.rotation.z = 0.25;
    syringeMesh.position.set(0.55, 1.1, 0.2);
    surgeryScene.add(syringeMesh);
    surgeryScene.add(surgeryTableGroup);

    // Dynamic Scene Collections
    let hospitalGroup: THREE.Group | null = null;
    let transportVehicle: THREE.Group | null = null;
    let horsePartsRef: { legs: THREE.Group[]; passengerSlots: THREE.Group[] } | null = null;
    let supplyTruckGroup: THREE.Group | null = null;
    let supplyTruckWheels: THREE.Mesh[] = [];
    let supplyTruckFrontPivots: THREE.Group[] = [];
    let supplyTruckSteeringWheel: THREE.Mesh | null = null;
    let supplyTruckCrateSlots: THREE.Group[] = [];
    let supplyTruckUpdateProgress: ((loadedCount: number, targetCap?: number) => void) | null = null;
    let truckUiSyncTimer = 0;
    let ambulanceWheels: THREE.Mesh[] = [];
    let ambulanceStretcherPatientMesh: THREE.Group | null = null;
    let sirenLightRed: THREE.Mesh | null = null;
    let sirenLightBlue: THREE.Mesh | null = null;
    let weaponSmithBooth: THREE.Group | null = null;
    let horseStableBooth: THREE.Group | null = null;
    let tentSalesBooth: THREE.Group | null = null;
    let aaGunGroup: THREE.Group | null = null;
    let aaGunPivot: THREE.Group | null = null;
    let aaGunFlashL: THREE.Mesh | null = null;
    let aaGunFlashR: THREE.Mesh | null = null;
    let ataturkHeroObj: { mesh: THREE.Group; flash: THREE.Mesh; shootTimer: number } | null = null;
    let istanbulTramObj: { mesh: THREE.Group; z: number; dir: number } | null = null;
    let istanbulFerriesList: Array<{ mesh: THREE.Group; baseZ: number }> = [];
    let depotInstances: DepotRuntimeInstance[] = [];
    let volunteerMeshes: Array<{ vol: VolunteerCharacter; mesh: THREE.Group }> = [];
    let defenseMeshes: THREE.Group[] = [];
    let reconstructionMeshes: THREE.Group[] = [];
    let fireBarrelsList: Array<{ flame: THREE.Mesh; light: THREE.PointLight }> = [];
    let tentBuyerList: Array<{ mesh: THREE.Group }> = [];
    let doctorNpcList: Array<{ mesh: THREE.Group }> = [];
    let kruppBatteriesTimer = 6.0;
    let fieldAidHealTimer = 10.0;
    let economyTickTimer = 14.0;
    let hoistSoundTimer = 0;

    let britishDestroyersList: Array<{
      mesh: THREE.Group;
      spotterMesh: THREE.Group;
      targetRing: THREE.Mesh;
      spotLightGroup: THREE.Group;
      spotDisc: THREE.Mesh;
      baseZ: number;
      sweepAngle: number;
      spotterAlive: boolean;
    }> = [];
    let activeSpottingDestroyer: (typeof britishDestroyersList)[0] | null = null;

    let woundedList: Array<{ mesh: THREE.Group; rescued: boolean; isRubble?: boolean }> = [];
    let enemyList: Array<{
      mesh: THREE.Group;
      flash: THREE.Mesh;
      alive: boolean;
      hp: number;
      shootTimer: number;
      name: string;
    }> = [];
    let allyList: Array<{
      mesh: THREE.Group;
      flash: THREE.Mesh;
      alive: boolean;
      hp: number;
      shootTimer: number;
    }> = [];
    let looterList: Array<{
      mesh: THREE.Group;
      armPivot: THREE.Group;
      alive: boolean;
      hp: number;
      hitCooldown: number;
      swingPhase: number;
    }> = [];
    let zabitaList: Array<{
      mesh: THREE.Group;
      armPivot: THREE.Group;
      alive: boolean;
      hp: number;
      hitCooldown: number;
      swingPhase: number;
    }> = [];
    let bulletList: Array<{
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      isEnemy: boolean;
      shooterName: string;
      damage: number;
      life: number;
    }> = [];
    let particlesList: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }> = [];
    let coverHitboxes: Array<{
      x: number;
      z: number;
      halfW: number;
      halfD: number;
      maxY?: number;
      mesh: THREE.Object3D;
    }> = [];
    let environmentProps: THREE.Object3D[] = [];
    let planesList: Array<{ mesh: THREE.Group; prop: THREE.Mesh; speed: number; dir: number }> = [];
    let cloudsList: Array<{ group: THREE.Group; speed: number }> = [];
    let artilleryBatteriesList: Array<{
      mesh: THREE.Group;
      gunnerMesh: THREE.Group;
      flash: THREE.Mesh;
      alive: boolean;
      hp: number;
    }> = [];
    let ankaraWaypointsList: Array<{
      mesh: THREE.Group;
      ring: THREE.Mesh;
      pillar: THREE.Mesh;
      x: number;
      z: number;
      name: string;
      reached: boolean;
    }> = [];
    let weatherParticles: THREE.Points | null = null;
    const operatingRoomTriggerPos = new THREE.Vector3(0, 0, 65);

    const moveFlags = { w: false, a: false, s: false, d: false, shift: false, space: false };
    let yaw = 0;
    let pitch = 0;
    let prevGamepadButtons: boolean[] = new Array(20).fill(false);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const triggerGamepadRumble = (weakMag = 0.4, strongMag = 0.6, durationMs = 110) => {
      const st = gameRef.current;
      if (!st.gamepadVibrationEnabled || typeof navigator.getGamepads !== 'function') return;
      try {
        const pads = navigator.getGamepads();
        for (const gp of pads) {
          if (!gp || !gp.connected) continue;
          const actuator = (
            gp as unknown as {
              vibrationActuator?: {
                playEffect?: (
                  type: string,
                  params: { startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }
                ) => Promise<void>;
              };
            }
          ).vibrationActuator;
          if (actuator && typeof actuator.playEffect === 'function') {
            actuator
              .playEffect('dual-rumble', {
                startDelay: 0,
                duration: durationMs,
                weakMagnitude: THREE.MathUtils.clamp(weakMag, 0, 1),
                strongMagnitude: THREE.MathUtils.clamp(strongMag, 0, 1)
              })
              .catch(() => {});
          }
          break;
        }
      } catch {
        // Ignore rumble errors
      }
    };

    const cycleOwnedWeapon = () => {
      const st = gameRef.current;
      if (st.chapter === 4) return;
      const ownedList = Object.values(st.weapons).filter((w) => w.id !== 'pickaxe' && w.owned);
      if (ownedList.length <= 1) return;
      const curIdx = ownedList.findIndex((w) => w.id === st.currentWeaponId);
      const nextWeapon = ownedList[(curIdx + 1) % ownedList.length];
      st.currentWeaponId = nextWeapon.id;
      st.ammo = nextWeapon.maxAmmo;
      st.maxAmmo = nextWeapon.maxAmmo;
      createWeaponMesh();
      soundEngine.playSfx('reload');
      triggerGamepadRumble(0.2, 0.3, 70);
      triggerUiSync();
      showToast(`Silah Değiştirildi: ${nextWeapon.name}`, '#d4a843');
    };

    const tagGroupWithRef = (group: THREE.Object3D, key: string, refObj: unknown) => {
      group.traverse((child) => {
        child.userData[key] = refObj;
      });
    };

    const createWeaponMesh = () => {
      while (weaponGroup.children.length > 0) {
        weaponGroup.remove(weaponGroup.children[0]);
      }
      const st = gameRef.current;

      if (st.chapter === 4) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4720, roughness: 0.8 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
        const gripMat = new THREE.MeshStandardMaterial({ color: 0xd91414, roughness: 0.6 });

        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 1.15, 12), woodMat);
        handle.position.set(0, -0.1, -0.2);
        handle.rotation.x = 0.35;
        weaponGroup.add(handle);

        const rubberGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.35, 12), gripMat);
        rubberGrip.position.set(0, -0.35, -0.11);
        rubberGrip.rotation.x = 0.35;
        weaponGroup.add(rubberGrip);

        const centerCollar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16), steelMat);
        centerCollar.position.set(0, 0.38, -0.36);
        weaponGroup.add(centerCollar);

        const leftSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8), steelMat);
        leftSpike.rotation.z = Math.PI / 2;
        leftSpike.position.set(-0.26, 0.38, -0.36);
        weaponGroup.add(leftSpike);

        const rightBlade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.04), steelMat);
        rightBlade.position.set(0.24, 0.38, -0.36);
        weaponGroup.add(rightBlade);

        weaponGroup.position.set(0.35, -0.3, -0.5);
        return;
      }

      const metalMat = new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.75, roughness: 0.3 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.78 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.22 });

      if (st.currentWeaponId === 'pistol' || st.currentWeaponId === 'luger') {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.44, 12), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.07, -0.18);
        weaponGroup.add(barrel);

        if (st.currentWeaponId === 'pistol') {
          const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10), brassMat);
          cylinder.rotation.x = Math.PI / 2;
          cylinder.position.set(0, 0.04, -0.02);
          weaponGroup.add(cylinder);
        } else {
          const receiverToggle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.065, 0.22), metalMat);
          receiverToggle.position.set(0, 0.05, -0.02);
          weaponGroup.add(receiverToggle);
        }

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.2, 0.09), woodMat);
        grip.position.set(0, -0.06, 0.05);
        grip.rotation.x = 0.3;
        weaponGroup.add(grip);
      } else {
        const len = st.currentWeaponId === 'heavy' ? 1.08 : st.currentWeaponId === 'sniper' ? 1.02 : 0.88;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, len, 12), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.07, -0.42);
        weaponGroup.add(barrel);

        if (st.currentWeaponId === 'heavy') {
          const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.65, 14), brassMat);
          jacket.rotation.x = Math.PI / 2;
          jacket.position.set(0, 0.07, -0.44);
          weaponGroup.add(jacket);
        } else if (st.currentWeaponId === 'smg') {
          const drumMag = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14), metalMat);
          drumMag.rotation.z = Math.PI / 2;
          drumMag.position.set(-0.07, 0.03, -0.22);
          weaponGroup.add(drumMag);
        } else if (st.currentWeaponId === 'sniper') {
          const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.34, 12), brassMat);
          scope.rotation.x = Math.PI / 2;
          scope.position.set(0, 0.145, -0.14);
          weaponGroup.add(scope);
        }

        const recMat = st.currentWeaponId === 'repeater' ? brassMat : metalMat;
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.45), recMat);
        receiver.position.set(0, 0.03, -0.1);
        weaponGroup.add(receiver);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.48), woodMat);
        stock.position.set(0, -0.03, 0.2);
        weaponGroup.add(stock);
      }

      muzzleFlashMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffbb22 })
      );
      muzzleFlashMesh.position.set(
        0,
        0.07,
        st.currentWeaponId === 'pistol' || st.currentWeaponId === 'luger' ? -0.42 : -0.92
      );
      muzzleFlashMesh.visible = false;
      weaponGroup.add(muzzleFlashMesh);
      weaponGroup.position.set(0.32, -0.28, -0.55);
    };

    const createSoldierModel = (coatColor: number, hatColor: number, hatStyle: string) => {
      const grp = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 1.28, 0.46),
        new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.75 })
      );
      torso.position.y = 0.65;
      torso.castShadow = true;
      grp.add(torso);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.65 })
      );
      head.position.y = 1.56;
      grp.add(head);

      if (hatStyle === 'helmet') {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.7),
          new THREE.MeshStandardMaterial({ color: 0x3f4d36, roughness: 0.5, metalness: 0.3 })
        );
        dome.position.y = 1.65;
        grp.add(dome);
      } else {
        const hat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.27, 0.28, 12),
          new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.8 })
        );
        hat.position.y = 1.82;
        grp.add(hat);
      }

      const rifle = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.12, 1.25),
        new THREE.MeshStandardMaterial({ color: 0x1e1e1e, metalness: 0.6, roughness: 0.4 })
      );
      rifle.position.set(0.42, 0.95, 0.45);
      grp.add(rifle);

      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      flash.position.set(0.42, 0.95, 1.15);
      flash.visible = false;
      grp.add(flash);

      return { grp, flash };
    };

    const clearSceneCollections = () => {
      woundedList.forEach((w) => scene.remove(w.mesh));
      enemyList.forEach((e) => scene.remove(e.mesh));
      allyList.forEach((a) => scene.remove(a.mesh));
      looterList.forEach((l) => scene.remove(l.mesh));
      zabitaList.forEach((z) => scene.remove(z.mesh));
      tentBuyerList.forEach((b) => scene.remove(b.mesh));
      doctorNpcList.forEach((d) => scene.remove(d.mesh));
      bulletList.forEach((b) => scene.remove(b.mesh));
      particlesList.forEach((p) => scene.remove(p.mesh));
      coverHitboxes.forEach((c) => scene.remove(c.mesh));
      environmentProps.forEach((p) => scene.remove(p));
      ankaraWaypointsList.forEach((w) => scene.remove(w.mesh));
      cloudsList.forEach((cl) => scene.remove(cl.group));
      artilleryBatteriesList.forEach((ab) => scene.remove(ab.mesh));
      volunteerMeshes.forEach((vm) => scene.remove(vm.mesh));
      defenseMeshes.forEach((dm) => scene.remove(dm));
      reconstructionMeshes.forEach((rm) => scene.remove(rm));
      if (tentSalesBooth) {
        scene.remove(tentSalesBooth);
        tentSalesBooth = null;
      }
      if (weaponSmithBooth) {
        scene.remove(weaponSmithBooth);
        weaponSmithBooth = null;
      }
      if (horseStableBooth) {
        scene.remove(horseStableBooth);
        horseStableBooth = null;
      }
      if (aaGunGroup) {
        scene.remove(aaGunGroup);
        aaGunGroup = null;
        aaGunPivot = null;
      }
      if (hospitalGroup) {
        scene.remove(hospitalGroup);
        hospitalGroup = null;
      }
      if (transportVehicle) {
        scene.remove(transportVehicle);
        transportVehicle = null;
      }
      if (supplyTruckGroup) {
        scene.remove(supplyTruckGroup);
        supplyTruckGroup = null;
        supplyTruckWheels = [];
        supplyTruckFrontPivots = [];
        supplyTruckSteeringWheel = null;
        supplyTruckCrateSlots = [];
        supplyTruckUpdateProgress = null;
      }
      soundEngine.stopTruckEngine();
      if (ataturkHeroObj) {
        scene.remove(ataturkHeroObj.mesh);
        ataturkHeroObj = null;
      }
      if (weatherParticles) {
        scene.remove(weatherParticles);
        weatherParticles = null;
      }

      woundedList = [];
      enemyList = [];
      allyList = [];
      looterList = [];
      zabitaList = [];
      tentBuyerList = [];
      doctorNpcList = [];
      fireBarrelsList = [];
      bulletList = [];
      particlesList = [];
      coverHitboxes = [];
      environmentProps = [];
      planesList = [];
      cloudsList = [];
      artilleryBatteriesList = [];
      ankaraWaypointsList = [];
      ambulanceWheels = [];
      ambulanceStretcherPatientMesh = null;
      sirenLightRed = null;
      sirenLightBlue = null;
      britishDestroyersList = [];
      depotInstances = [];
      volunteerMeshes = [];
      defenseMeshes = [];
      reconstructionMeshes = [];
      istanbulTramObj = null;
      istanbulFerriesList = [];
      horsePartsRef = null;
      activeSpottingDestroyer = null;
      gameRef.current.destroyerAlertActive = false;
      gameRef.current.destroyerAlertCountdown = 10.0;
      gameRef.current.isInWater = false;
      gameRef.current.oxygenLevel = 100;
      gameRef.current.drivingSupplyTruck = false;
      gameRef.current.ambulanceHasPatient = false;
      gameRef.current.ambulanceThirdPerson = false;
      gameRef.current.vehicleSpeed = 0;
      gameRef.current.vehicleSteer = 0;
      gameRef.current.vehicleHeading = 0;
      gameRef.current.truckSpeed = 0;
      gameRef.current.truckSteerAngle = 0;
      gameRef.current.truckGearLabel = 'N';
      gameRef.current.truckRpm = 720;
    };

    const spawnCloudsAndShops = () => {
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.82,
        roughness: 0.9
      });
      for (let i = 0; i < 14; i++) {
        const grp = new THREE.Group();
        for (let j = 0; j < 4; j++) {
          const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5 + Math.random() * 2.5, 1), cloudMat);
          puff.position.set((j - 1.5) * 3.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.5);
          puff.scale.set(1.2, 0.6, 1.0);
          grp.add(puff);
        }
        grp.position.set((Math.random() - 0.5) * 320, 44 + Math.random() * 16, (Math.random() - 0.5) * 320);
        scene.add(grp);
        cloudsList.push({ group: grp, speed: 1.5 + Math.random() * 2.0 });
      }

      if (gameRef.current.chapter !== 4) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

        weaponSmithBooth = new THREE.Group();
        const wCounter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 1.4), woodMat);
        wCounter.position.y = 0.55;
        weaponSmithBooth.add(wCounter);
        const wCanopy = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 3.0), roofMat);
        wCanopy.position.set(0, 3.0, -0.4);
        weaponSmithBooth.add(wCanopy);
        const wRing = new THREE.Mesh(
          new THREE.RingGeometry(2.6, 3.1, 24),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
        );
        wRing.rotation.x = -Math.PI / 2;
        wRing.position.set(0, 0.06, 1.0);
        weaponSmithBooth.add(wRing);
        weaponSmithBooth.position.set(-20, 0, 56);
        scene.add(weaponSmithBooth);

        horseStableBooth = new THREE.Group();
        const hFence = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.3, 0.2), woodMat);
        hFence.position.set(0, 0.65, -1.8);
        horseStableBooth.add(hFence);
        const hRing = new THREE.Mesh(
          new THREE.RingGeometry(2.9, 3.4, 24),
          new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
        );
        hRing.rotation.x = -Math.PI / 2;
        hRing.position.set(0, 0.06, 1.2);
        horseStableBooth.add(hRing);
        horseStableBooth.position.set(22, 0, 56);
        scene.add(horseStableBooth);
      }
    };

    const spawnVolunteersForChapter = (chapterNum: number) => {
      if (chapterNum === 4) return;
      VOLUNTEER_CHARACTERS.filter((v) => v.chapters.includes(chapterNum)).forEach((vol) => {
        const vMesh = createVolunteerCharacterMesh(vol, crescentTex);
        scene.add(vMesh);
        volunteerMeshes.push({ vol, mesh: vMesh });
      });
    };

    // Exact 2023 Models & World Builders from kizilay__3__745db3a5.html
    const createMaskedLooterModel = () => {
      const grp = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 1.32, 0.52),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
      );
      torso.position.y = 0.66;
      grp.add(torso);

      const lootBag = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.38, 1),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 })
      );
      lootBag.position.set(0, 0.92, -0.36);
      grp.add(lootBag);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 })
      );
      head.position.y = 1.6;
      grp.add(head);

      const beanie = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.28, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: 0x27272a })
      );
      beanie.position.y = 1.78;
      grp.add(beanie);

      const eyeSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      eyeSlot.position.set(0, 1.63, 0.25);
      grp.add(eyeSlot);

      const armPivot = new THREE.Group();
      armPivot.position.set(0.5, 1.18, 0.1);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.65, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x18181b })
      );
      arm.position.set(0, -0.25, 0.15);
      arm.rotation.x = -Math.PI / 3;
      armPivot.add(arm);

      const crowbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.7 })
      );
      crowbar.position.set(0, -0.45, 0.45);
      crowbar.rotation.x = Math.PI / 4;
      armPivot.add(crowbar);
      grp.add(armPivot);

      return { grp, armPivot };
    };

    const createZabitaModel = () => {
      const grp = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 1.32, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 })
      );
      torso.position.y = 0.66;
      grp.add(torso);

      const vestStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.89, 0.22, 0.53),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      vestStripe.position.y = 0.85;
      grp.add(vestStripe);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9b38c })
      );
      head.position.y = 1.58;
      grp.add(head);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.26, 0.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x172554 })
      );
      cap.position.y = 1.78;
      grp.add(cap);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.04, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x09090b })
      );
      visor.position.set(0, 1.7, 0.22);
      grp.add(visor);

      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.1, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      badge.position.set(0, 1.79, 0.27);
      grp.add(badge);

      const armPivot = new THREE.Group();
      armPivot.position.set(0.5, 1.18, 0.1);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.65, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
      );
      arm.position.set(0, -0.25, 0.15);
      arm.rotation.x = -Math.PI / 3;
      armPivot.add(arm);

      const baton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 })
      );
      baton.position.set(0, -0.42, 0.45);
      baton.rotation.x = Math.PI / 4;
      armPivot.add(baton);
      grp.add(armPivot);

      return { grp, armPivot };
    };

    const spawnMaskedLooter = (idx: number) => {
      const { grp, armPivot } = createMaskedLooterModel();
      const lx = -24 + (idx % 5) * 12 + (Math.random() * 6 - 3);
      const lz = 14 - idx * 11;
      grp.position.set(lx, 0, lz);
      scene.add(grp);
      looterList.push({ mesh: grp, armPivot, alive: true, hp: 3, hitCooldown: 0, swingPhase: Math.random() * 6 });
    };

    const spawnZabitaOfficer = (idx: number) => {
      const { grp, armPivot } = createZabitaModel();
      const zx = -20 + idx * 13;
      const zz = 24 - idx * 9;
      grp.position.set(zx, 0, zz);
      scene.add(grp);
      zabitaList.push({ mesh: grp, armPivot, alive: true, hp: 6, hitCooldown: 0, swingPhase: Math.random() * 6 });
    };

    const spawnDoctorNPCs = () => {
      const docPositions = [
        [-6, 56],
        [6, 56],
        [-10, 44],
        [10, 44]
      ];
      docPositions.forEach(([dx, dz]) => {
        const grp = new THREE.Group();
        const coat = new THREE.Mesh(
          new THREE.BoxGeometry(0.84, 1.32, 0.48),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        );
        coat.position.y = 0.66;
        grp.add(coat);

        const badge = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.52),
          new THREE.MeshBasicMaterial({ map: crescentTex })
        );
        badge.position.set(0.2, 0.95, 0);
        grp.add(badge);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xd9b38c })
        );
        head.position.y = 1.58;
        grp.add(head);

        const mask = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.14, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
        );
        mask.position.set(0, 1.52, 0.2);
        grp.add(mask);

        grp.position.set(dx, 0, dz);
        grp.lookAt(0, 0, 20);
        scene.add(grp);
        doctorNpcList.push({ mesh: grp });
      });
    };

    const buildTentSalesCenter = () => {
      tentSalesBooth = new THREE.Group();
      const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

      const boothBody = new THREE.Mesh(new THREE.BoxGeometry(9.0, 3.8, 5.5), redMat);
      boothBody.position.y = 1.9;
      boothBody.castShadow = true;
      tentSalesBooth.add(boothBody);

      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 1.4, 0.25),
        new THREE.MeshStandardMaterial({ map: crescentTex })
      );
      signBoard.position.set(0, 4.3, -2.7);
      tentSalesBooth.add(signBoard);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.1, 1.4), woodMat);
      counter.position.set(0, 0.55, -3.2);
      tentSalesBooth.add(counter);

      const stdTent = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 4), whiteMat);
      stdTent.position.set(-7.5, 1.2, 1.5);
      stdTent.rotation.y = Math.PI / 4;
      tentSalesBooth.add(stdTent);

      const winTent = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
      );
      winTent.position.set(-12.5, 1.4, 1.5);
      tentSalesBooth.add(winTent);

      const vipTent = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 2.6, 3.8),
        new THREE.MeshStandardMaterial({ map: crescentTex })
      );
      vipTent.position.set(-18.5, 1.3, 1.5);
      tentSalesBooth.add(vipTent);

      const saleRing = new THREE.Mesh(
        new THREE.RingGeometry(4.5, 5.2, 32),
        new THREE.MeshBasicMaterial({ color: 0xe6b800, side: THREE.DoubleSide })
      );
      saleRing.rotation.x = -Math.PI / 2;
      saleRing.position.set(0, 0.08, -3.5);
      tentSalesBooth.add(saleRing);

      tentSalesBooth.position.set(-22, 0, 52);
      scene.add(tentSalesBooth);

      const buyerColors = [0x0284c7, 0x059669, 0xd97706, 0x7c3aed, 0xdb2777];
      for (let i = 0; i < 5; i++) {
        const bGrp = new THREE.Group();
        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 1.28, 0.44),
          new THREE.MeshStandardMaterial({ color: buyerColors[i] })
        );
        torso.position.y = 0.64;
        bGrp.add(torso);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xd9b38c })
        );
        head.position.y = 1.52;
        bGrp.add(head);
        bGrp.position.set(-26 + i * 2.1, 0, 44.5);
        bGrp.lookAt(-22, 0, 52);
        scene.add(bGrp);
        tentBuyerList.push({ mesh: bGrp });
      }
    };

    const buildEarthquakeRubbleField = (rubbleSpotsList: number[][]) => {
      const concreteDarkMat = new THREE.MeshStandardMaterial({ color: 0x3f4756, roughness: 0.95 });
      const concreteLightMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
      const brickWallMat = new THREE.MeshStandardMaterial({ color: 0x7c4a3a, roughness: 0.92 });
      const rebarMat = new THREE.MeshStandardMaterial({ color: 0x5c2d16, metalness: 0.8, roughness: 0.4 });
      const windowHoleMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });

      rubbleSpotsList.forEach(([rx, rz], idx) => {
        const rGrp = new THREE.Group();

        const buildingBase = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.2, 6.2), concreteDarkMat);
        buildingBase.position.set(0, 1.1, 0);
        buildingBase.rotation.y = (idx % 4) * 0.4;
        buildingBase.castShadow = true;
        buildingBase.receiveShadow = true;
        rGrp.add(buildingBase);

        const tiltDir = idx % 2 === 0 ? 1 : -1;
        for (let floor = 1; floor <= 3; floor++) {
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(6.4 - floor * 0.4, 0.45, 5.8 - floor * 0.3),
            floor % 2 === 0 ? concreteLightMat : concreteDarkMat
          );
          slab.position.set(tiltDir * floor * 0.4, 1.8 + floor * 1.15, (idx % 3 - 1) * 0.3);
          slab.rotation.z = tiltDir * (0.18 + floor * 0.08);
          slab.rotation.x = (idx % 2 === 0 ? 0.12 : -0.12);
          slab.castShadow = true;
          rGrp.add(slab);
        }

        const facadeWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.8, 0.45), brickWallMat);
        facadeWall.position.set(-tiltDir * 1.6, 2.8, 2.4);
        facadeWall.rotation.z = -tiltDir * 0.22;
        facadeWall.castShadow = true;
        for (let wx = -1.4; wx <= 1.4; wx += 2.8) {
          for (let wy = -1.0; wy <= 1.0; wy += 2.0) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.52), windowHoleMat);
            win.position.set(wx, wy, 0);
            facadeWall.add(win);
          }
        }
        rGrp.add(facadeWall);

        for (let k = 0; k < 7; k++) {
          const chunk = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.65 + (k % 3) * 0.35, 0),
            k % 2 === 0 ? concreteLightMat : brickWallMat
          );
          const angle = (k / 7) * Math.PI * 2;
          const dist = 2.4 + (k % 2) * 1.1;
          chunk.position.set(Math.cos(angle) * dist, 0.45 + (k % 2) * 0.3, Math.sin(angle) * dist);
          chunk.rotation.set(k, k * 0.7, 0);
          chunk.castShadow = true;
          rGrp.add(chunk);
        }

        for (let r = 0; r < 5; r++) {
          const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), rebarMat);
          rebar.position.set((r - 2) * 0.9, 3.6, (r % 2 === 0 ? 1 : -1) * 1.2);
          rebar.rotation.set(0.45 * (r % 2 === 0 ? 1 : -1), r * 0.5, (r - 2) * 0.25);
          rGrp.add(rebar);
        }

        rGrp.position.set(rx, 0, rz);
        scene.add(rGrp);
        environmentProps.push(rGrp);
        coverHitboxes.push({ x: rx, z: rz, halfW: 3.9, halfD: 3.9, mesh: rGrp });
      });

      const barrelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.5 });
      const firePositions = [
        [-12, 48],
        [14, 46],
        [-8, 22],
        [10, 20],
        [-18, -2],
        [18, -4],
        [0, -18]
      ];
      firePositions.forEach(([fx, fz]) => {
        const bGrp = new THREE.Group();
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12), barrelMat);
        drum.position.y = 0.58;
        drum.castShadow = true;
        bGrp.add(drum);

        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.36, 0.9, 8),
          new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        flame.position.y = 1.45;
        bGrp.add(flame);

        const fireLight = new THREE.PointLight(0xff7700, 1.8, 18);
        fireLight.position.set(0, 1.9, 0);
        bGrp.add(fireLight);

        bGrp.position.set(fx, 0, fz);
        scene.add(bGrp);
        environmentProps.push(bGrp);
        fireBarrelsList.push({ flame, light: fireLight });
      });

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      [
        [-18, 38],
        [20, 36],
        [-22, -14],
        [22, -16]
      ].forEach(([tx, tz]) => {
        const tGrp = new THREE.Group();
        const genBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.1, 1.0),
          new THREE.MeshStandardMaterial({ color: 0xd97706 })
        );
        genBox.position.y = 0.55;
        tGrp.add(genBox);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7.5, 8), poleMat);
        mast.position.y = 3.75;
        tGrp.add(mast);

        const headLamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.4), lampBulbMat);
        headLamp.position.set(0, 7.6, 0);
        tGrp.add(headLamp);

        tGrp.position.set(tx, 0, tz);
        scene.add(tGrp);
        environmentProps.push(tGrp);
      });

      const soupTruck = new THREE.Group();
      const truckBody = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 2.8, 7.2),
        new THREE.MeshStandardMaterial({ map: crescentTex })
      );
      truckBody.position.set(0, 1.8, 0);
      truckBody.castShadow = true;
      soupTruck.add(truckBody);

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.12, 6.4),
        new THREE.MeshStandardMaterial({ color: 0xd91414 })
      );
      awning.position.set(-2.4, 2.9, 0);
      awning.rotation.z = 0.25;
      soupTruck.add(awning);

      soupTruck.position.set(25, 0, 52);
      scene.add(soupTruck);
      environmentProps.push(soupTruck);
      coverHitboxes.push({ x: 25, z: 52, halfW: 2.0, halfD: 4.0, mesh: soupTruck });
    };

    const spawnArtilleryBatteries = (chpNum: number) => {
      const chp = CHAPTERS_DATA[chpNum];
      gameRef.current.artillerySilenced = false;
      if (!chp || !chp.hasArtillery) {
        gameRef.current.artilleryAliveCount = 0;
        return;
      }
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x272a30, metalness: 0.8, roughness: 0.3 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a321a, roughness: 0.8 });

      [
        [-22, -74],
        [0, -78],
        [22, -74]
      ].forEach(([bx, bz]) => {
        const grp = new THREE.Group();
        [-1.0, 1.0].forEach((wx) => {
          const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.14, 14), woodMat);
          wh.rotation.z = Math.PI / 2;
          wh.position.set(wx, 0.65, 0);
          grp.add(wh);
        });
        const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.12), ironMat);
        shield.position.set(0, 0.95, 0.35);
        grp.add(shield);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.7, 12), ironMat);
        barrel.rotation.x = Math.PI / 2.6;
        barrel.position.set(0, 1.15, 0.85);
        grp.add(barrel);

        const flash = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff9900 })
        );
        flash.position.set(0, 1.55, 2.15);
        flash.visible = false;
        grp.add(flash);

        const { grp: gunnerMesh } = createSoldierModel(chp.enemyColor, chp.enemyHatColor, 'enemy');
        gunnerMesh.position.set(0, 0, -1.1);
        grp.add(gunnerMesh);

        const targetRing = new THREE.Mesh(
          new THREE.RingGeometry(1.4, 1.8, 20),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
        );
        targetRing.rotation.x = -Math.PI / 2;
        targetRing.position.y = 0.08;
        grp.add(targetRing);

        grp.position.set(bx, 0, bz);
        const batObj = { mesh: grp, gunnerMesh, flash, alive: true, hp: 2 };
        tagGroupWithRef(grp, 'artilleryRef', batObj);
        scene.add(grp);
        artilleryBatteriesList.push(batObj);
      });
      gameRef.current.artilleryAliveCount = artilleryBatteriesList.length;
    };

    const spawnWoundedSoldier = (idx: number, isEarthquake = false, spotList: number[][] = []) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.4, 1.8),
        new THREE.MeshStandardMaterial({ color: isEarthquake ? 0x334155 : 0x4a4235, roughness: 0.8 })
      );
      body.position.y = 0.2;
      grp.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xd9b38c })
      );
      head.position.set(0, 0.35, -0.7);
      grp.add(head);

      const hat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.22, 10),
        new THREE.MeshStandardMaterial({ color: isEarthquake ? 0xf59e0b : 0xaa1111 })
      );
      hat.position.set(0, 0.56, -0.7);
      grp.add(hat);

      const sRing = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.6, 20),
        new THREE.MeshBasicMaterial({ color: 0xe6b800, side: THREE.DoubleSide })
      );
      sRing.rotation.x = -Math.PI / 2;
      sRing.position.y = 0.06;
      grp.add(sRing);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xe6b800, transparent: true, opacity: 0.28 })
      );
      beam.position.y = 5.0;
      grp.add(beam);

      let safeX = 0;
      let safeZ = 0;
      if (isEarthquake && spotList.length > 0) {
        const spot = spotList[idx % spotList.length];
        const sideOffset = spot[0] < 0 ? 4.8 : -4.8;
        safeX = spot[0] + sideOffset;
        safeZ = spot[1] + 1.5;
      } else {
        safeX = (idx % 2 === 0 ? -1 : 1) * (8 + (idx % 6) * 5 + Math.random() * 2);
        safeZ = 4 - (idx % 7) * 14;
      }
      grp.position.set(safeX, 0, safeZ);
      scene.add(grp);
      woundedList.push({ mesh: grp, rescued: false, isRubble: isEarthquake });
    };

    const spawnEnemySoldier = (
      chpNum: number,
      idx: number,
      customX?: number,
      customZ?: number,
      customName?: string
    ) => {
      const chp = CHAPTERS_DATA[chpNum];
      const { grp, flash } = createSoldierModel(chp.enemyColor, chp.enemyHatColor, 'enemy');
      const ex = customX !== undefined ? customX : -30 + (idx % 7) * 9 + (Math.random() * 4 - 2);
      const ez = customZ !== undefined ? customZ : -26 - (idx % 6) * 7;
      grp.position.set(ex, 0, ez);

      const isWeakenedGreek = chpNum === 5 && gameRef.current.kurtulusPhase === 4;
      const enemyObj = {
        mesh: grp,
        flash,
        alive: true,
        hp: isWeakenedGreek ? 1 : 2,
        shootTimer: isWeakenedGreek ? 3.4 + Math.random() * 2.0 : 1.7 + Math.random() * 2.0,
        name: customName || chp.enemyName
      };
      tagGroupWithRef(grp, 'enemyRef', enemyObj);
      scene.add(grp);
      enemyList.push(enemyObj);
    };

    const spawnAllySoldier = (chpNum: number, idx: number) => {
      const chp = CHAPTERS_DATA[chpNum];
      const hatStyle = chp.allyHelmet ? 'helmet' : 'fes';
      const coatCol = chp.allyHelmet ? 0x3b4a34 : 0x283828;
      const { grp, flash } = createSoldierModel(coatCol, 0xaa1111, hatStyle);
      const ax = -20 + idx * 10;
      const az = 29;
      grp.position.set(ax, 0, az);
      grp.lookAt(ax, 0, az - 50);

      const allyObj = {
        mesh: grp,
        flash,
        alive: true,
        hp: 4,
        shootTimer: 1.8 + Math.random() * 1.5
      };
      tagGroupWithRef(grp, 'allyRef', allyObj);
      scene.add(grp);
      allyList.push(allyObj);
    };

    const buildKurtulusPhaseWorld = (phaseNum: number) => {
      clearSceneCollections();
      const st = gameRef.current;
      st.kurtulusPhase = phaseNum;
      st.kurtulusPhaseProgress = 0;
      st.carryingSoldier = false;
      st.carryingMedicalCrate = false;
      st.drivingCarriage = false;
      st.drivingSupplyTruck = false;
      st.stealthSuspicion = 0;
      st.truckLoadedCrates = 0;
      carriedSoldierVisual.visible = false;
      carriedCrateVisual.visible = false;
      weaponGroup.visible = true;

      let ground = scene.getObjectByName('battle_ground') as THREE.Mesh | undefined;
      if (!ground) {
        ground = new THREE.Mesh(
          new THREE.PlaneGeometry(760, 760),
          new THREE.MeshStandardMaterial({ color: 0x36332e, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'battle_ground';
        scene.add(ground);
      }

      spawnCloudsAndShops();
      spawnVolunteersForChapter(5);

      if (phaseNum === 1) {
        st.kurtulusPhaseTarget = 6;
        CHAPTERS_DATA[5].orgEra =
          'KUVA-Yİ MİLLİYE & HİLÂL-İ AHMER · 1. KATMAN: GİZLİ İSTANBUL ANTREPO SOYGUNU & KAMYON NAKLİYESİ';
        CHAPTERS_DATA[5].title =
          '1. Katman: 10 İlçeli İstanbul (Malları Dikkat Çekmeden Çal & Nakliye Kamyonuna Yükle)';
        CHAPTERS_DATA[5].objective =
          '[C] Eğilerek dikkat çekmeden antrepolara gir, 6 Sandığı çal ve [E] ile Mim Mim Nakliye Kamyonuna yükle ([K] Kamyonu Yanına Çağır)!';

        scene.background = new THREE.Color(0x161922);
        scene.fog = new THREE.FogExp2(0x1d222e, 0.0055);
        (ground.material as THREE.MeshStandardMaterial).color.setHex(0x36332e);

        const istResult = buildExpandedIstanbulWorld(scene, crescentTex);
        environmentProps.push(...istResult.props);
        coverHitboxes.push(...istResult.colliders);
        depotInstances = istResult.depots;
        istanbulTramObj = istResult.tramObj;
        istanbulFerriesList = istResult.ferries;

        depotInstances.forEach((inst) => {
          const savedDepot = st.depots.find((d) => d.id === inst.depot.id);
          if (savedDepot) {
            inst.depot.lootCratesRemaining = savedDepot.lootCratesRemaining;
          }
          if (st.unlockedDepotIds.includes(inst.depot.id)) {
            inst.isUnlocked = true;
            inst.doorMesh.position.x = 4.5;
            (inst.statusRing.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
          }
        });

        // Eminönü Secret İnebolu Taka Dock (Z = 65)
        hospitalGroup = new THREE.Group();
        const dockFloor = new THREE.Mesh(
          new THREE.BoxGeometry(18, 1.2, 14),
          new THREE.MeshStandardMaterial({ color: 0x475569 })
        );
        dockFloor.position.y = 0.6;
        hospitalGroup.add(dockFloor);

        const boatHull = new THREE.Mesh(
          new THREE.BoxGeometry(7, 2.5, 16),
          new THREE.MeshStandardMaterial({ color: 0x3d2616 })
        );
        boatHull.position.set(0, 1.2, 9);
        hospitalGroup.add(boatHull);

        const boatCabin = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 2.8, 5),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        boatCabin.position.set(0, 3.6, 8);
        hospitalGroup.add(boatCabin);

        const safeRing = new THREE.Mesh(
          new THREE.RingGeometry(6.5, 7.5, 32),
          new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide })
        );
        safeRing.rotation.x = -Math.PI / 2;
        safeRing.position.set(0, 1.25, 0);
        hospitalGroup.add(safeRing);

        hospitalGroup.position.set(0, 0, 65);
        operatingRoomTriggerPos.set(0, 0, 65);
        scene.add(hospitalGroup);

        // Spawn 1920s Mim Mim & Hilâl-i Ahmer Supply Truck (Nakliye Kamyonu) right outside Sirkeci Depot!
        const {
          truckGrp,
          wheels,
          frontWheelPivots,
          steeringWheel,
          crateSlots,
          updateCargoProgress
        } = createSupplyTruckMesh(crescentTex, st.truckLoadedCrates, st.kurtulusPhaseTarget);
        supplyTruckGroup = truckGrp;
        supplyTruckWheels = wheels;
        supplyTruckFrontPivots = frontWheelPivots;
        supplyTruckSteeringWheel = steeringWheel;
        supplyTruckCrateSlots = crateSlots;
        supplyTruckUpdateProgress = updateCargoProgress;
        supplyTruckGroup.position.set(10, 0, 36);
        st.truckHeading = 0;
        st.truckSpeed = 0;
        st.truckSteerAngle = 0;
        scene.add(supplyTruckGroup);

        // British Destroyers scanning Bosphorus
        const steelNavyMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, metalness: 0.8, roughness: 0.3 });
        const plasterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xe3dcd2, roughness: 0.7 });
        [-38, 12].forEach((sz, dIdx) => {
          const destroyer = new THREE.Group();
          const dHull = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 32), steelNavyMat);
          dHull.position.y = 2.0;
          destroyer.add(dHull);
          const dDeck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 14), plasterWhiteMat);
          dDeck.position.y = 5.2;
          destroyer.add(dDeck);
          destroyer.position.set(76, 0, sz);
          scene.add(destroyer);
          environmentProps.push(destroyer);

          const { grp: spotterMesh } = createSoldierModel(0x8a734e, 0x5c4c32, 'enemy');
          spotterMesh.position.set(0, 6.8, 0);
          destroyer.add(spotterMesh);

          const targetRing = new THREE.Mesh(
            new THREE.RingGeometry(1.1, 1.5, 20),
            new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
          );
          targetRing.rotation.x = -Math.PI / 2;
          targetRing.position.set(0, 6.9, 0);
          destroyer.add(targetRing);

          const spotLightGroup = new THREE.Group();
          const spotDisc = new THREE.Mesh(
            new THREE.CircleGeometry(6.5, 24),
            new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.32 })
          );
          spotDisc.rotation.x = -Math.PI / 2;
          spotDisc.position.y = 0.14;
          spotLightGroup.add(spotDisc);
          spotLightGroup.position.set(0, 0, sz);
          scene.add(spotLightGroup);
          environmentProps.push(spotLightGroup);

          const dObj = {
            mesh: destroyer,
            spotterMesh,
            targetRing,
            spotLightGroup,
            spotDisc,
            baseZ: sz,
            sweepAngle: dIdx * 1.8,
            spotterAlive: true
          };
          tagGroupWithRef(spotterMesh, 'destroyerSpotterRef', dObj);
          targetRing.userData.destroyerSpotterRef = dObj;
          britishDestroyersList.push(dObj);
        });

        // Guards stationed near depots (won't shoot unless player raises suspicion or gets too close standing up!)
        [
          { name: 'Tophane Antrepo Muhafızı', x: 26, z: -38 },
          { name: 'Pera Ecza Nöbetçisi', x: -34, z: -38 },
          { name: 'Sirkeci Gümrük Muhafızı', x: 28, z: 32 },
          { name: 'Selimiye Lojistik Nöbetçisi', x: 142, z: -28 },
          { name: 'Haydarpaşa Silo Muhafızı', x: 142, z: 68 },
          { name: 'Zeytinburnu Antrepo Nöbetçisi', x: -165, z: 84 },
          { name: 'Kasımpaşa Tersane Muhafızı', x: -112, z: -44 }
        ].forEach((g, idx) => {
          spawnEnemySoldier(5, idx, g.x, g.z, g.name);
        });

        for (let i = 0; i < 3; i++) spawnAllySoldier(5, i);

        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(eqHorse, crescentTex, st.horsePassengersCount);
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.set(-8, 0, 52);
        scene.add(transportVehicle);

        camera.position.set(0, 1.8, 50);
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
        showToast(
          'GİZLİ SOYGUN & KAMYON NAKLİYESİ: [C] ile eğilerek dikkat çekmeden antrepolardan sandıkları çalın ve [E] ile Mim Mim Nakliye Kamyonuna yükleyin!',
          '#38bdf8'
        );
      } else if (phaseNum === 2) {
        st.kurtulusPhaseTarget = 4;
        CHAPTERS_DATA[5].orgEra = 'MİLLÎ MÜCADELE · 2. KATMAN: İSTİKLAL YOLU KONVOYU (1921)';
        CHAPTERS_DATA[5].title = '2. Katman: İstiklal Yolu (Şerife Bacı İle Kastamonu-Ilgaz-Ankara Sevkiyatı)';
        CHAPTERS_DATA[5].objective =
          'Heybelerinde antrepo ganimeti taşıyan yüksek kapasiteli Ata [E] bin, karlı dağ geçitlerindeki 4 menzil noktasından geçerek Ankara’ya ulaş!';

        scene.background = new THREE.Color(0x64748b);
        scene.fog = new THREE.FogExp2(0x94a3b8, 0.009);
        (ground.material as THREE.MeshStandardMaterial).color.setHex(0xe2e8f0);

        hospitalGroup = new THREE.Group();
        const ineboluPost = new THREE.Mesh(
          new THREE.BoxGeometry(12, 5, 10),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        ineboluPost.position.y = 2.5;
        hospitalGroup.add(ineboluPost);
        hospitalGroup.position.set(0, 0, 65);
        scene.add(hospitalGroup);

        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(eqHorse, crescentTex, st.horsePassengersCount);
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.set(0, 0, 48);
        scene.add(transportVehicle);

        [
          { x: -10, z: 18, name: '1. Menzil: Küre Dağları Ecevit Hanı Geçidi' },
          { x: 12, z: -15, name: '2. Menzil: Kastamonu - Ilgaz Dağı Hilâl-i Ahmer Noktası' },
          { x: -12, z: -48, name: '3. Menzil: Çankırı Menzil Ambarı' },
          { x: 0, z: -82, name: '4. Menzil: Ankara Hilâl-i Ahmer Umum Karargâhı' }
        ].forEach((wp, idx) => {
          const wpGrp = new THREE.Group();
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(4.2, 5.2, 32),
            new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x2ecc71 : 0xe6b800, side: THREE.DoubleSide })
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.12;
          wpGrp.add(ring);

          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 18, 10),
            new THREE.MeshBasicMaterial({
              color: idx === 0 ? 0x2ecc71 : 0xe6b800,
              transparent: true,
              opacity: 0.35
            })
          );
          pillar.position.y = 9;
          wpGrp.add(pillar);

          wpGrp.position.set(wp.x, 0, wp.z);
          scene.add(wpGrp);
          ankaraWaypointsList.push({ mesh: wpGrp, ring, pillar, x: wp.x, z: wp.z, name: wp.name, reached: false });
        });

        for (let i = 0; i < 6; i++) spawnEnemySoldier(5, i);

        st.drivingCarriage = true;
        weaponGroup.visible = false;
        camera.position.set(0, 2.35, 48);
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
        showToast('2. KATMAN (İSTİKLAL YOLU): Tıbbi malzeme yüklü Atınızla yeşil menzil halkalarından geçerek Ankara’ya ulaşın!', '#2ecc71');
      } else if (phaseNum === 3) {
        st.kurtulusPhaseTarget = 4;
        CHAPTERS_DATA[5].orgEra = 'MİLLÎ MÜCADELE · 3. KATMAN: SAKARYA & POLATLI SATHI MÜDAFAA (1921)';
        CHAPTERS_DATA[5].title = '3. Katman: Sakarya Meydan Muharebesi & Polatlı Hilâl-i Ahmer Sargı Hattı';
        CHAPTERS_DATA[5].objective =
          '[F] Savunma Paneliyle Polatlı sargı hattını tahkim et, topçuları sustur ve Sakarya cephesindeki 4 ağır yaralı neferi kurtar!';
        CHAPTERS_DATA[5].hasArtillery = true;

        scene.background = new THREE.Color(0x524132);
        scene.fog = new THREE.FogExp2(0x695441, 0.009);
        (ground.material as THREE.MeshStandardMaterial).color.setHex(0x78624c);

        hospitalGroup = new THREE.Group();
        const hospBody = new THREE.Mesh(
          new THREE.BoxGeometry(14, 6.0, 14),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        hospBody.position.y = 3.0;
        hospitalGroup.add(hospBody);
        const hospRoof = new THREE.Mesh(
          new THREE.ConeGeometry(10.8, 4.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x992b1e })
        );
        hospRoof.position.y = 8.1;
        hospRoof.rotation.y = Math.PI / 4;
        hospitalGroup.add(hospRoof);
        const safeRing = new THREE.Mesh(
          new THREE.RingGeometry(9.2, 10.2, 32),
          new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide })
        );
        safeRing.rotation.x = -Math.PI / 2;
        safeRing.position.y = 0.08;
        hospitalGroup.add(safeRing);
        hospitalGroup.position.set(0, 0, 65);
        operatingRoomTriggerPos.set(0, 0, 65);
        scene.add(hospitalGroup);

        spawnArtilleryBatteries(5);
        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(eqHorse, crescentTex, st.horsePassengersCount);
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.set(10, 0, 52);
        scene.add(transportVehicle);

        for (let i = 0; i < 4; i++) spawnWoundedSoldier(i, false);
        for (let i = 0; i < 7; i++) spawnEnemySoldier(5, i);
        for (let i = 0; i < 5; i++) spawnAllySoldier(3, i);

        camera.position.set(0, 1.8, 54);
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
        showToast(
          '3. KATMAN (SAKARYA MEYDAN MUHAREBESİ): Yüksek kapasiteli sıhhiye atınızla 4 yaralı Mehmetçiği Polatlı Sahra Hastanesine yetiştirin!',
          '#f59e0b'
        );
      } else {
        st.kurtulusPhaseTarget = 8;
        CHAPTERS_DATA[5].orgEra = 'MİLLÎ MÜCADELE · 4. KATMAN: BÜYÜK TAARRUZ & DUMLUPINAR ZAFERİ (1922)';
        CHAPTERS_DATA[5].title = '4. Katman: Başkomutan Atatürk İle Büyük Taarruz & Yunan Karargâhı Baskını';
        CHAPTERS_DATA[5].objective =
          'Başkomutan Atatürk ile taarruz et, girilebilir Yunan Karargâhını zaptet, topçuları sustur ve 8 yaralı gazimizi kurtar!';
        CHAPTERS_DATA[5].hasArtillery = true;

        scene.background = new THREE.Color(0x4a3b2c);
        scene.fog = new THREE.FogExp2(0x5c4938, 0.009);
        (ground.material as THREE.MeshStandardMaterial).color.setHex(0x6e5a44);

        hospitalGroup = new THREE.Group();
        const hospBody = new THREE.Mesh(
          new THREE.BoxGeometry(14, 6.0, 14),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        hospBody.position.y = 3.0;
        hospitalGroup.add(hospBody);
        const hospRoof = new THREE.Mesh(
          new THREE.ConeGeometry(10.8, 4.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x992b1e })
        );
        hospRoof.position.y = 8.1;
        hospRoof.rotation.y = Math.PI / 4;
        hospitalGroup.add(hospRoof);
        const safeRing = new THREE.Mesh(
          new THREE.RingGeometry(9.2, 10.2, 32),
          new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide })
        );
        safeRing.rotation.x = -Math.PI / 2;
        safeRing.position.y = 0.08;
        hospitalGroup.add(safeRing);
        hospitalGroup.position.set(0, 0, 65);
        operatingRoomTriggerPos.set(0, 0, 65);
        scene.add(hospitalGroup);

        const outpostGrp = new THREE.Group();
        outpostGrp.position.set(0, 0, -60);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 });
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(14, 0.2, 11),
          new THREE.MeshStandardMaterial({ color: 0x57534e })
        );
        floor.position.set(0, 0.1, 0);
        outpostGrp.add(floor);

        const addOutpostWall = (lx: number, lz: number, w: number, h: number, d: number) => {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
          wall.position.set(lx, h / 2, lz);
          outpostGrp.add(wall);
          coverHitboxes.push({ x: lx, z: -60 + lz, halfW: w / 2, halfD: d / 2, maxY: h, mesh: wall });
        };
        addOutpostWall(0, -5.2, 14, 4.6, 0.6);
        addOutpostWall(-6.7, 0, 0.6, 4.6, 11);
        addOutpostWall(6.7, 0, 0.6, 4.6, 11);
        addOutpostWall(-4.5, 5.2, 5.0, 4.6, 0.6);
        addOutpostWall(4.5, 5.2, 5.0, 4.6, 0.6);
        const oRoof = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.5, 11.8), roofMat);
        oRoof.position.set(0, 4.85, 0);
        outpostGrp.add(oRoof);
        scene.add(outpostGrp);
        environmentProps.push(outpostGrp);

        spawnArtilleryBatteries(5);
        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(eqHorse, crescentTex, st.horsePassengersCount);
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.set(10, 0, 52);
        scene.add(transportVehicle);

        for (let i = 0; i < 8; i++) spawnWoundedSoldier(i, false);
        for (let i = 0; i < 9; i++) spawnEnemySoldier(5, i);
        for (let i = 0; i < 6; i++) spawnAllySoldier(3, i);

        const { grp: ataMesh, flash: ataFlash } = createAtaturkModel();
        ataMesh.position.set(0, 0, 24);
        ataMesh.lookAt(0, 0, -68);
        scene.add(ataMesh);
        ataturkHeroObj = { mesh: ataMesh, flash: ataFlash, shootTimer: 0.85 };

        camera.position.set(0, 1.8, 54);
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
        showToast('4. KATMAN (BÜYÜK TAARRUZ): Başkomutan Atatürk ile Yunan Karargâhını basıp 8 yaralı gazimizi kurtarın!', '#ffcc00');
      }
      triggerUiSync();
    };

    const buildWorld = (chapterNum: number) => {
      clearSceneCollections();
      const st = gameRef.current;
      const chp = CHAPTERS_DATA[chapterNum];

      if (chapterNum === 5) {
        buildKurtulusPhaseWorld(st.kurtulusPhase);
        return;
      }

      scene.background = new THREE.Color(chp.skyColor);
      scene.fog = new THREE.FogExp2(chp.fogColor, 0.0085);

      let ground = scene.getObjectByName('battle_ground') as THREE.Mesh | undefined;
      if (!ground) {
        ground = new THREE.Mesh(
          new THREE.PlaneGeometry(760, 760),
          new THREE.MeshStandardMaterial({ color: chp.groundColor, roughness: 0.9 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'battle_ground';
        scene.add(ground);
      } else {
        (ground.material as THREE.MeshStandardMaterial).color.setHex(chp.groundColor);
      }

      hospitalGroup = new THREE.Group();
      if (chapterNum === 4) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const floorTileMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.3 });
        const redLineMat = new THREE.MeshBasicMaterial({ color: 0xd91414 });
        const blueDoorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
        const greenDoorMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.4
        });

        const hospFloor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 38), floorTileMat);
        hospFloor.position.set(0, 0.1, 12);
        hospFloor.receiveShadow = true;
        hospitalGroup.add(hospFloor);

        const guideLine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 34), redLineMat);
        guideLine.position.set(0, 0.12, 11);
        hospitalGroup.add(guideLine);

        const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(8, 8.5, 1.2), wallMat);
        frontLeftWall.position.set(-6.5, 4.25, -6.5);
        frontLeftWall.castShadow = true;
        hospitalGroup.add(frontLeftWall);

        const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(8, 8.5, 1.2), wallMat);
        frontRightWall.position.set(6.5, 4.25, -6.5);
        frontRightWall.castShadow = true;
        hospitalGroup.add(frontRightWall);

        const frontTopHeader = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.0, 1.2), wallMat);
        frontTopHeader.position.set(0, 6.5, -6.5);
        hospitalGroup.add(frontTopHeader);

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.4, 4.0), redLineMat);
        canopy.position.set(0, 4.4, -8.2);
        hospitalGroup.add(canopy);

        const redCrescentSign = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 3.0, 0.4),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        redCrescentSign.position.set(0, 7.0, -7.2);
        hospitalGroup.add(redCrescentSign);

        const leftCorridorWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.5, 36), wallMat);
        leftCorridorWall.position.set(-4.2, 2.75, 11.5);
        hospitalGroup.add(leftCorridorWall);

        const rightCorridorWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.5, 36), wallMat);
        rightCorridorWall.position.set(4.2, 2.75, 11.5);
        hospitalGroup.add(rightCorridorWall);

        [-2, 6, 14].forEach((dz) => {
          const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.92, 3.2, 1.8), blueDoorMat);
          doorL.position.set(-4.15, 1.6, dz);
          hospitalGroup?.add(doorL);

          const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.92, 3.2, 1.8), blueDoorMat);
          doorR.position.set(4.15, 1.6, dz);
          hospitalGroup?.add(doorR);
        });

        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 38), wallMat);
        ceiling.position.set(0, 8.25, 12);
        hospitalGroup.add(ceiling);

        [-2, 6, 14, 22].forEach((lz) => {
          const lamp = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.15, 0.6),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          lamp.position.set(0, 5.3, lz);
          hospitalGroup?.add(lamp);
        });

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 8.5, 1.2), wallMat);
        backWall.position.set(0, 4.25, 30);
        hospitalGroup.add(backWall);

        const opTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 3.2), greenDoorMat);
        opTable.position.set(0, 0.65, 24);
        hospitalGroup.add(opTable);

        const opRing = new THREE.Mesh(
          new THREE.RingGeometry(2.4, 3.0, 32),
          new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
        );
        opRing.rotation.x = -Math.PI / 2;
        opRing.position.set(0, 0.24, 24);
        hospitalGroup.add(opRing);

        operatingRoomTriggerPos.set(0, 0, 89);

        coverHitboxes.push({ x: -6.5, z: 58.5, halfW: 4.0, halfD: 0.8, mesh: frontLeftWall });
        coverHitboxes.push({ x: 6.5, z: 58.5, halfW: 4.0, halfD: 0.8, mesh: frontRightWall });
        coverHitboxes.push({ x: -4.2, z: 76.5, halfW: 0.6, halfD: 18.0, mesh: leftCorridorWall });
        coverHitboxes.push({ x: 4.2, z: 76.5, halfW: 0.6, halfD: 18.0, mesh: rightCorridorWall });
        coverHitboxes.push({ x: 0, z: 95.0, halfW: 11.0, halfD: 0.8, mesh: backWall });
      } else {
        const hospBody = new THREE.Mesh(
          new THREE.BoxGeometry(14, 6.0, 14),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        hospBody.position.y = 3.0;
        hospBody.castShadow = true;
        hospitalGroup.add(hospBody);

        const hospRoof = new THREE.Mesh(
          new THREE.ConeGeometry(10.8, 4.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x992b1e })
        );
        hospRoof.position.y = 8.1;
        hospRoof.rotation.y = Math.PI / 4;
        hospitalGroup.add(hospRoof);

        const safeRing = new THREE.Mesh(
          new THREE.RingGeometry(9.2, 10.2, 32),
          new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide })
        );
        safeRing.rotation.x = -Math.PI / 2;
        safeRing.position.y = 0.08;
        hospitalGroup.add(safeRing);

        operatingRoomTriggerPos.set(0, 0, 65);
      }

      hospitalGroup.position.set(0, 0, 65);
      scene.add(hospitalGroup);

      spawnCloudsAndShops();
      spawnVolunteersForChapter(chapterNum);
      spawnArtilleryBatteries(chapterNum);

      const rubbleSpots = [
        [-20, 32],
        [22, 30],
        [-32, 16],
        [30, 14],
        [-14, 12],
        [15, 8],
        [-26, -6],
        [26, -8],
        [-12, -16],
        [14, -22],
        [-28, -32],
        [28, -34],
        [-14, -44],
        [16, -46],
        [0, -30],
        [-34, -52],
        [32, -54]
      ];

      if (chapterNum === 4) {
        buildEarthquakeRubbleField(rubbleSpots);
        buildTentSalesCenter();
        spawnDoctorNPCs();
        for (let i = 0; i < 5; i++) spawnMaskedLooter(i);
        for (let i = 0; i < 4; i++) spawnZabitaOfficer(i);

        transportVehicle = new THREE.Group();
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xd91414, roughness: 0.4 });
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.6,
          metalness: 0.8
        });

        const ambFloor = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 0.28, 4.4),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        ambFloor.position.set(0, 0.65, 0.6);
        transportVehicle.add(ambFloor);

        const leftWall = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 2.1, 4.4),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        leftWall.position.set(-1.27, 1.75, 0.6);
        transportVehicle.add(leftWall);

        const rightWall = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 2.1, 4.4),
          new THREE.MeshStandardMaterial({ map: crescentTex })
        );
        rightWall.position.set(1.27, 1.75, 0.6);
        transportVehicle.add(rightWall);

        const ambRoof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 4.4), whiteMat);
        ambRoof.position.set(0, 2.75, 0.6);
        transportVehicle.add(ambRoof);

        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 4.44), redMat);
        stripeL.position.set(-1.27, 1.5, 0.6);
        transportVehicle.add(stripeL);
        const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 4.44), redMat);
        stripeR.position.set(1.27, 1.5, 0.6);
        transportVehicle.add(stripeR);

        const stretcherBase = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.25, 2.3),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 })
        );
        stretcherBase.position.set(0, 0.9, 1.0);
        transportVehicle.add(stretcherBase);

        const stretcherBed = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.14, 2.2),
          new THREE.MeshStandardMaterial({ color: 0xeab308 })
        );
        stretcherBed.position.set(0, 1.08, 1.0);
        transportVehicle.add(stretcherBed);

        ambulanceStretcherPatientMesh = new THREE.Group();
        const pBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.28, 1.45),
          new THREE.MeshStandardMaterial({ color: 0x0284c7 })
        );
        pBody.position.set(0, 1.28, 1.15);
        ambulanceStretcherPatientMesh.add(pBody);
        const pHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xd9b38c })
        );
        pHead.position.set(0, 1.35, 0.25);
        ambulanceStretcherPatientMesh.add(pHead);
        ambulanceStretcherPatientMesh.visible = false;
        transportVehicle.add(ambulanceStretcherPatientMesh);

        const rearLoadRing = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 1.45, 24),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
        );
        rearLoadRing.rotation.x = -Math.PI / 2;
        rearLoadRing.position.set(0, 0.08, 3.6);
        transportVehicle.add(rearLoadRing);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.85, 2.0), whiteMat);
        cab.position.set(0, 1.3, -2.3);
        cab.castShadow = true;
        transportVehicle.add(cab);

        const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 0.1), glassMat);
        windshield.position.set(0, 1.65, -3.31);
        transportVehicle.add(windshield);

        sirenLightRed = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.25, 0.35),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        sirenLightRed.position.set(-0.55, 2.9, -1.2);
        transportVehicle.add(sirenLightRed);

        sirenLightBlue = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.25, 0.35),
          new THREE.MeshBasicMaterial({ color: 0x0066ff })
        );
        sirenLightBlue.position.set(0.55, 2.9, -1.2);
        transportVehicle.add(sirenLightBlue);

        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 });
        [-1.38, 1.38].forEach((wx) => {
          [-2.1, 1.6].forEach((wz) => {
            const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.35, 16), wheelMat);
            wh.rotation.z = Math.PI / 2;
            wh.position.set(wx, 0.52, wz);
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 12), rimMat);
            wh.add(rim);
            transportVehicle?.add(wh);
            ambulanceWheels.push(wh);
          });
        });

        transportVehicle.position.set(11, 0, 52);
        st.vehicleHeading = 0;
        st.vehicleSpeed = 0;
        scene.add(transportVehicle);
      } else {
        [-14, 14].forEach((fx) => {
          const flagGrp = new THREE.Group();
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.12, 11, 8),
            new THREE.MeshStandardMaterial({ color: 0xdddddd })
          );
          pole.position.y = 5.5;
          flagGrp.add(pole);
          const turkishFlag = createTurkishFlagMesh();
          turkishFlag.position.set(1.8, 9.8, 0);
          flagGrp.add(turkishFlag);
          flagGrp.position.set(fx, 0, 62);
          scene.add(flagGrp);
          environmentProps.push(flagGrp);
        });

        const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x827053, roughness: 0.85 });
        [
          [-22, 26],
          [-8, 26],
          [8, 26],
          [22, 26],
          [-30, 8],
          [-14, 8],
          [0, 8],
          [14, 8],
          [30, 8],
          [-24, -12],
          [-8, -12],
          [8, -12],
          [24, -12]
        ].forEach(([cx, cz]) => {
          const sMesh = new THREE.Group();
          for (let j = -1; j <= 1; j++) {
            const block = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 0.9), sandbagMat);
            block.position.set(j * 1.55, 0.57, 0);
            sMesh.add(block);
          }
          sMesh.position.set(cx, 0, cz);
          scene.add(sMesh);
          coverHitboxes.push({ x: cx, z: cz, halfW: 2.6, halfD: 0.75, mesh: sMesh });
        });

        st.defenseStructures.forEach((ds) => {
          for (let i = 0; i < ds.builtCount; i++) {
            spawnDefenseMeshInScene(ds.type, i);
          }
        });

        if (chapterNum === 2) {
          aaGunGroup = new THREE.Group();
          const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
          const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.35, 16), steelMat);
          basePlate.position.y = 0.18;
          aaGunGroup.add(basePlate);
          aaGunPivot = new THREE.Group();
          aaGunPivot.position.set(0, 1.65, 0);
          const breech = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.3), steelMat);
          aaGunPivot.add(breech);
          const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 12), steelMat);
          barrelL.rotation.x = Math.PI / 2;
          barrelL.position.set(-0.32, 0.1, -1.9);
          aaGunPivot.add(barrelL);
          const barrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 12), steelMat);
          barrelR.rotation.x = Math.PI / 2;
          barrelR.position.set(0.32, 0.1, -1.9);
          aaGunPivot.add(barrelR);
          aaGunFlashL = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffbb00 })
          );
          aaGunFlashL.position.set(-0.32, 0.1, -3.8);
          aaGunFlashL.visible = false;
          aaGunPivot.add(aaGunFlashL);
          aaGunFlashR = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffbb00 })
          );
          aaGunFlashR.position.set(0.32, 0.1, -3.8);
          aaGunFlashR.visible = false;
          aaGunPivot.add(aaGunFlashR);
          aaGunGroup.add(aaGunPivot);
          aaGunGroup.position.set(-14, 0, 38);
          scene.add(aaGunGroup);

          const sea = new THREE.Mesh(
            new THREE.PlaneGeometry(160, 340),
            new THREE.MeshStandardMaterial({ color: 0x164966, roughness: 0.25, metalness: 0.6 })
          );
          sea.rotation.x = -Math.PI / 2;
          sea.position.set(-140, 0.08, 0);
          scene.add(sea);
          environmentProps.push(sea);

          const gulcemal = new THREE.Group();
          const whiteHull = new THREE.Mesh(
            new THREE.BoxGeometry(10, 5.2, 38),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc })
          );
          whiteHull.position.y = 2.4;
          gulcemal.add(whiteHull);
          const greenBand = new THREE.Mesh(
            new THREE.BoxGeometry(10.2, 0.9, 38.2),
            new THREE.MeshStandardMaterial({ color: 0x10b981 })
          );
          greenBand.position.y = 3.2;
          gulcemal.add(greenBand);
          const gCabin = new THREE.Mesh(
            new THREE.BoxGeometry(6.5, 3.8, 18),
            new THREE.MeshStandardMaterial({ map: crescentTex })
          );
          gCabin.position.y = 6.5;
          gulcemal.add(gCabin);
          gulcemal.position.set(-72, 0, 58);
          scene.add(gulcemal);
          environmentProps.push(gulcemal);

          for (let i = 0; i < 3; i++) {
            const plane = new THREE.Group();
            const fuselage = new THREE.Mesh(
              new THREE.BoxGeometry(1.3, 1.2, 6.8),
              new THREE.MeshStandardMaterial({ color: 0x6e5d45 })
            );
            plane.add(fuselage);
            const topWing = new THREE.Mesh(
              new THREE.BoxGeometry(10.2, 0.18, 1.9),
              new THREE.MeshStandardMaterial({ color: 0xc2b295 })
            );
            topWing.position.set(0, 0.95, 0.6);
            plane.add(topWing);
            const prop = new THREE.Mesh(
              new THREE.BoxGeometry(2.6, 0.25, 0.15),
              new THREE.MeshBasicMaterial({ color: 0x111111 })
            );
            prop.position.set(0, 0, 3.5);
            plane.add(prop);
            plane.position.set(-22 + i * 22, 32 + i * 4, -110 + i * 50);
            scene.add(plane);
            environmentProps.push(plane);
            planesList.push({ mesh: plane, prop, speed: 22 + i * 3, dir: 1 });
          }
        }

        if (chp.hasAtaturk) {
          const { grp: ataMesh, flash: ataFlash } = createAtaturkModel();
          ataMesh.position.set(0, 0, 26);
          ataMesh.lookAt(0, 0, -60);
          scene.add(ataMesh);
          ataturkHeroObj = { mesh: ataMesh, flash: ataFlash, shootTimer: 0.85 };
        }

        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(eqHorse, crescentTex, st.horsePassengersCount);
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.set(11, 0, 52);
        scene.add(transportVehicle);
      }

      for (let i = 0; i < chp.targetSaved; i++) {
        spawnWoundedSoldier(i, Boolean(chp.isEarthquake), rubbleSpots);
      }

      if (chapterNum !== 4) {
        for (let i = 0; i < chp.enemyCount; i++) spawnEnemySoldier(chapterNum, i);
        for (let i = 0; i < chp.allyCount; i++) spawnAllySoldier(chapterNum, i);
      }

      const pCount = 650;
      const pGeo = new THREE.BufferGeometry();
      const pCoords = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i += 3) {
        pCoords[i] = (Math.random() - 0.5) * 200;
        pCoords[i + 1] = Math.random() * 40;
        pCoords[i + 2] = (Math.random() - 0.5) * 200;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pCoords, 3));
      weatherParticles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({
          color: chapterNum === 1 ? 0xffffff : 0xd4b483,
          size: 0.35,
          transparent: true,
          opacity: 0.8
        })
      );
      scene.add(weatherParticles);

      camera.position.set(0, 1.8, 54);
      yaw = 0;
      pitch = 0;
      camera.rotation.set(0, 0, 0);
      triggerUiSync();
    };

    const spawnDefenseMeshInScene = (type: DefenseStructureSpec['type'], indexOffset = 0) => {
      const mesh = createDefenseStructureMesh(type, crescentTex);
      const count = defenseMeshes.length + indexOffset;
      const xPos = -18 + (count % 5) * 9;
      const zPos = type === 'barbed_wire' ? -4 : type === 'field_aid_tent' ? 38 : 18;
      mesh.position.set(xPos, 0, zPos);
      scene.add(mesh);
      defenseMeshes.push(mesh);
    };

    const rebuildReconstructionMeshes = () => {
      reconstructionMeshes.forEach((m) => scene.remove(m));
      reconstructionMeshes = [];
      if (gameRef.current.chapter !== 4) return;
      gameRef.current.reconstructionProjects.forEach((prj) => {
        if (prj.level > 0) {
          const m = createReconstructionFacilityMesh(prj, crescentTex);
          scene.add(m);
          reconstructionMeshes.push(m);
        }
      });
    };

    const unlockDepotInScene = (depotId: string) => {
      const st = gameRef.current;
      if (!st.unlockedDepotIds.includes(depotId)) {
        st.unlockedDepotIds.push(depotId);
      }
      const inst = depotInstances.find((d) => d.depot.id === depotId);
      if (inst && !inst.isUnlocked) {
        inst.isUnlocked = true;
        inst.doorMesh.position.x = 4.6;
        (inst.statusRing.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
        soundEngine.playSfx('lockpick');
        if (st.isCrouching) {
          showToast(
            `${inst.depot.name} kilidi SESSİZCE ve DİKKAT ÇEKMEDEN kırıldı! İçerideki sandıkları çalın!`,
            '#10b981'
          );
        } else {
          st.stealthSuspicion = Math.min(100, st.stealthSuspicion + 22);
          showToast(
            `${inst.depot.name} kapısı açıldı! (Dikkat çekmemek için [C] ile eğilin!)`,
            '#f59e0b'
          );
        }
      }
      triggerUiSync();
    };

    const checkCollision = (px: number, pz: number, pad = 0.65) => {
      for (const c of coverHitboxes) {
        if (Math.abs(px - c.x) < c.halfW + pad && Math.abs(pz - c.z) < c.halfD + pad) {
          return true;
        }
      }
      return false;
    };

    const checkBulletWallCollision = (bx: number, by: number, bz: number) => {
      for (const c of coverHitboxes) {
        const maxH = c.maxY !== undefined ? c.maxY : 4.2;
        if (by <= maxH && Math.abs(bx - c.x) < c.halfW + 0.15 && Math.abs(bz - c.z) < c.halfD + 0.15) {
          return true;
        }
      }
      return false;
    };

    const spawnHitSparks = (pos: THREE.Vector3, colorHex: number) => {
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.12, 0.12),
          new THREE.MeshBasicMaterial({ color: colorHex })
        );
        m.position.copy(pos);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          2 + Math.random() * 4,
          (Math.random() - 0.5) * 6
        );
        scene.add(m);
        particlesList.push({ mesh: m, vel, life: 0.4 });
      }
    };

    const spawnProjectile = (
      fromPos: THREE.Vector3,
      toPos: THREE.Vector3,
      isEnemyBullet: boolean,
      shooterName: string,
      damageVal = 1
    ) => {
      const bMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: isEnemyBullet ? 0xfacc15 : 0xfef08a })
      );
      bMesh.position.copy(fromPos);
      const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
      scene.add(bMesh);
      bulletList.push({
        mesh: bMesh,
        vel: dir.multiplyScalar(54),
        isEnemy: isEnemyBullet,
        shooterName,
        damage: damageVal,
        life: 2.2
      });
    };

    const applyPlayerDamage = (amount: number, cause: string) => {
      const st = gameRef.current;
      if (st.isDead || st.isSurgeryMode) return;
      const reduction = st.chapter === 1 ? Math.min(0.45, st.bastionRating / 220) : 0;
      const finalDmg = Math.max(2, Math.round(amount * (1 - reduction)));
      st.health = Math.max(0, st.health - finalDmg);
      triggerGamepadRumble(0.75, 0.95, 210);
      triggerUiSync();

      if (st.health <= 0) {
        st.isDead = true;
        st.isPlaying = false;
        st.martyrCause = cause;
        soundEngine.stopTruckEngine();
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
        soundEngine.playSfx('martyr');
        setActiveModal('martyr');
      }
    };

    const handleEnemyDamage = (en: (typeof enemyList)[0], dmg: number) => {
      if (!en || !en.alive) return;
      en.hp -= dmg;
      if (en.hp <= 0) {
        en.alive = false;
        en.mesh.rotation.x = -Math.PI / 2;
        en.mesh.position.y = 0.25;
        gameRef.current.points += 55;
        triggerUiSync();
        showToast(`${en.name} etkisiz hale getirildi! (+55 ${getCurrencyName()})`, '#ffcc00');

        if (gameRef.current.chapter !== 5) {
          const deadRef = en;
          window.setTimeout(() => {
            if (gameRef.current.isPlaying && !gameRef.current.isDead && gameRef.current.chapter !== 5) {
              scene.remove(deadRef.mesh);
              const idx = enemyList.indexOf(deadRef);
              if (idx > -1) enemyList.splice(idx, 1);
              spawnEnemySoldier(gameRef.current.chapter, Math.floor(Math.random() * 6));
            }
          }, 6500);
        }
      }
    };

    const eliminateDestroyerSpotter = (destroyerObj: (typeof britishDestroyersList)[0]) => {
      if (!destroyerObj || !destroyerObj.spotterAlive) return;
      destroyerObj.spotterAlive = false;
      destroyerObj.spotterMesh.rotation.x = -Math.PI / 2;
      destroyerObj.spotterMesh.position.y = 4.0;
      destroyerObj.targetRing.visible = false;
      destroyerObj.spotLightGroup.visible = false;

      if (activeSpottingDestroyer === destroyerObj) {
        gameRef.current.destroyerAlertActive = false;
        activeSpottingDestroyer = null;
      }
      gameRef.current.points += 150;
      soundEngine.playSfx('rescued');
      triggerUiSync();
      showToast('İNGİLİZ MUHRİBİ GÖZCÜSÜ VURULDU! Alarm iptal edildi! (+150 Kuruş)', '#2ecc71');
    };

    const shootWeapon = () => {
      const st = gameRef.current;
      if (!st.isPlaying || st.isPaused || st.isDead || st.isSurgeryMode || st.isReloading) return;
      const now = performance.now();
      const wData = st.weapons[st.currentWeaponId] || st.weapons.pistol;
      if (now - st.lastShotTime < wData.fireRateMs) return;
      st.lastShotTime = now;

      // Firing weapon in Istanbul raises stealth suspicion!
      if (st.chapter === 5 && st.kurtulusPhase === 1) {
        st.stealthSuspicion = Math.min(100, st.stealthSuspicion + 35);
      }

      if (st.usingAAGun && aaGunPivot) {
        st.weaponRecoil = 0.35;
        soundEngine.playSfx('cannon');
        if (aaGunFlashL && aaGunFlashR) {
          aaGunFlashL.visible = true;
          aaGunFlashR.visible = true;
          window.setTimeout(() => {
            if (aaGunFlashL) aaGunFlashL.visible = false;
            if (aaGunFlashR) aaGunFlashR.visible = false;
          }, 90);
        }
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        for (let i = planesList.length - 1; i >= 0; i--) {
          const pl = planesList[i];
          if (raycaster.ray.distanceToPoint(pl.mesh.position) < 6.8) {
            spawnHitSparks(pl.mesh.position, 0xffaa00);
            scene.remove(pl.mesh);
            planesList.splice(i, 1);
            st.points += 180;
            triggerUiSync();
            showToast(`UÇAKSAVAR İLE DÜŞMAN UÇAĞI DÜŞÜRÜLDÜ! (+180 ${getCurrencyName()})`, '#2ecc71');
            return;
          }
        }
        return;
      }

      if (st.chapter === 4) {
        st.weaponRecoil = 0.35;
        soundEngine.playSfx('punch');
        const p = camera.position;
        for (const l of looterList) {
          if (l.alive && Math.hypot(p.x - l.mesh.position.x, p.z - l.mesh.position.z) < 4.5) {
            l.hp--;
            spawnHitSparks(l.mesh.position, 0xffaa00);
            if (l.hp <= 0) {
              l.alive = false;
              l.mesh.rotation.x = -Math.PI / 2;
              l.mesh.position.y = 0.25;
              st.points += 120;
              soundEngine.playSfx('rescued');
              triggerUiSync();
              showToast('Kar Maskeli Yağmacı etkisiz hale getirildi! (+120 TL)', '#2ecc71');
              const deadRef = l;
              window.setTimeout(() => {
                if (gameRef.current.isPlaying && !gameRef.current.isDead && gameRef.current.chapter === 4) {
                  scene.remove(deadRef.mesh);
                  const idx = looterList.indexOf(deadRef);
                  if (idx > -1) looterList.splice(idx, 1);
                  spawnMaskedLooter(Math.floor(Math.random() * 5));
                }
              }, 6500);
            } else {
              showToast('Yağmacıya Kızılay Kazması ile darbe indirildi!', '#f59e0b');
            }
            return;
          }
        }
        for (const w of woundedList) {
          if (!w.rescued && w.isRubble && Math.hypot(p.x - w.mesh.position.x, p.z - w.mesh.position.z) < 5.0) {
            tryInteract();
            return;
          }
        }
        return;
      }

      if (st.ammo <= 0) {
        reloadWeapon();
        return;
      }

      st.ammo--;
      st.weaponRecoil = 0.22;
      soundEngine.playSfx('shot');
      triggerGamepadRumble(0.35, 0.65, 90);
      triggerUiSync();

      if (muzzleFlashMesh) {
        muzzleFlashMesh.visible = true;
        window.setTimeout(() => {
          if (muzzleFlashMesh) muzzleFlashMesh.visible = false;
        }, 60);
      }

      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      if (muzzleFlashMesh) {
        muzzleFlashMesh.getWorldPosition(_muzzleWorld);
      } else {
        _muzzleWorld.copy(camera.position);
      }
      _targetWorld.copy(camera.position).addScaledVector(raycaster.ray.direction, 150);
      spawnProjectile(_muzzleWorld, _targetWorld, false, 'Oyuncu', wData.damage);

      const shootableMeshes: THREE.Object3D[] = [];
      enemyList.forEach((e) => {
        if (e.alive) e.mesh.traverse((ch) => { if ((ch as THREE.Mesh).isMesh) shootableMeshes.push(ch); });
      });
      artilleryBatteriesList.forEach((ab) => {
        if (ab.alive) ab.mesh.traverse((ch) => { if ((ch as THREE.Mesh).isMesh) shootableMeshes.push(ch); });
      });
      britishDestroyersList.forEach((d) => {
        if (d.spotterAlive) {
          d.spotterMesh.traverse((ch) => { if ((ch as THREE.Mesh).isMesh) shootableMeshes.push(ch); });
          shootableMeshes.push(d.targetRing);
        }
      });

      const wallMeshes: THREE.Object3D[] = [];
      coverHitboxes.forEach((c) => {
        if (c.mesh) c.mesh.traverse((ch) => { if ((ch as THREE.Mesh).isMesh) wallMeshes.push(ch); });
      });
      const wallHits = raycaster.intersectObjects(wallMeshes, false);
      const closestWallDist = wallHits.length > 0 ? wallHits[0].distance : Infinity;

      const hits = raycaster.intersectObjects(shootableMeshes, false);
      if (hits.length > 0 && hits[0].distance < 190 && hits[0].distance < closestWallDist) {
        const hitMesh = hits[0].object;
        if (hitMesh.userData.artilleryRef) {
          const bat = hitMesh.userData.artilleryRef as (typeof artilleryBatteriesList)[0];
          bat.hp -= wData.damage;
          if (bat.hp <= 0 && bat.alive) {
            bat.alive = false;
            bat.gunnerMesh.rotation.x = -Math.PI / 2;
            bat.gunnerMesh.position.y = 0.25;
            st.points += 160;
            soundEngine.playSfx('rescued');
            const remaining = artilleryBatteriesList.filter((b) => b.alive).length;
            st.artilleryAliveCount = remaining;
            if (remaining === 0) {
              st.artillerySilenced = true;
              showToast(`TÜM DÜŞMAN TOPÇULARI SUSTURULDU! (+160 ${getCurrencyName()})`, '#2ecc71');
            } else {
              showToast(`Düşman Topçu Bataryası İmha Edildi! (Kalan: ${remaining}) (+160 ${getCurrencyName()})`, '#2ecc71');
            }
            triggerUiSync();
          }
          return;
        }
        if (hitMesh.userData.destroyerSpotterRef) {
          eliminateDestroyerSpotter(hitMesh.userData.destroyerSpotterRef);
          return;
        }
        if (hitMesh.userData.enemyRef) {
          handleEnemyDamage(hitMesh.userData.enemyRef, wData.damage);
        }
      }

      if (st.ammo === 0) {
        window.setTimeout(() => reloadWeapon(), 280);
      }
    };

    const reloadWeapon = () => {
      const st = gameRef.current;
      if (st.chapter === 4 || st.isReloading || !st.isPlaying || st.isPaused || st.isSurgeryMode) return;
      const wData = st.weapons[st.currentWeaponId];
      if (st.ammo === wData.maxAmmo) return;
      st.isReloading = true;
      soundEngine.playSfx('reload');
      triggerUiSync();
      window.setTimeout(() => {
        st.ammo = wData.maxAmmo;
        st.isReloading = false;
        triggerUiSync();
      }, 850);
    };

    const start3DInjectionSurgery = (batchCount = 1) => {
      const st = gameRef.current;
      st.pendingBatchHealCount = Math.max(1, batchCount);
      st.isSurgeryMode = true;
      st.isPaused = false;
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
      weaponGroup.visible = false;
      syringeMesh.position.set(0.55, 1.05, 0.2);
      triggerUiSync();
    };

    const advanceKurtulusPhase = () => {
      const st = gameRef.current;
      soundEngine.playSfx('rescued');
      if (st.kurtulusPhase === 1) {
        showToast('NAKLİYE KAMYONU TAMAMEN YÜKLENDİ! Şimdi 2. Katman: Şerife Bacı İle İstiklal Yolu Konvoyu!', '#2ecc71');
        buildKurtulusPhaseWorld(2);
      } else if (st.kurtulusPhase === 2) {
        showToast('2. KATMAN TAMAMLANDI! Şimdi 3. Katman: Sakarya Meydan Muharebesi & Polatlı Sargı Hattı!', '#f59e0b');
        buildKurtulusPhaseWorld(3);
      } else if (st.kurtulusPhase === 3) {
        showToast('3. KATMAN TAMAMLANDI! Şimdi 4. Katman: Başkomutan Atatürk İle Büyük Taarruz!', '#ffcc00');
        buildKurtulusPhaseWorld(4);
      }
    };

    const getAmbulanceRearWorldPos = () => {
      const st = gameRef.current;
      if (!transportVehicle || st.chapter !== 4) return null;
      const rearPos = new THREE.Vector3(0, 0, 3.6);
      rearPos.applyAxisAngle(_upAxis, st.vehicleHeading);
      rearPos.add(transportVehicle.position);
      return rearPos;
    };

    const generateNewCustomer = () => {
      const st = gameRef.current;
      const cur = getCurrencyName(st.chapter);
      const customers: TentCustomer[] = [
        {
          name: 'Ahmet Amca (Depremzede Aile)',
          wantedModel: 'standard',
          hasEnoughMoney: true,
          wallet: 140,
          dialogue: `"Evimiz hasar gördü evladım, ailem için 1 adet Standart Kızılay Çadırı almak istiyorum. 140 ${cur} param hazır."`
        },
        {
          name: 'Dr. Selim (Bölge Koordinatörü)',
          wantedModel: 'winter',
          hasEnoughMoney: true,
          wallet: 280,
          dialogue: `"Gece dondurucu soğuk bekleniyor. Yaşlılarımız için 1 adet Kışlık İzoleli Çadır talep ediyoruz. 280 ${cur} ödeneğimiz tam."`
        },
        {
          name: 'Fırsatçı Karaborsacı Rıza',
          wantedModel: 'vip',
          hasEnoughMoney: false,
          wallet: 95,
          dialogue: `"Bana hemen en pahalısından Geniş Aile Sahra Çadırı ver! Yanımda 95 ${cur} var, üstünü seneye veririz!"`
        },
        {
          name: 'Zeynep Öğretmen (Okul Çadırı)',
          wantedModel: 'vip',
          hasEnoughMoney: true,
          wallet: 450,
          dialogue: `"Çocuklarımızın eğitimi aksamasın diye Geniş Aile Sahra Çadırı kuracağız. 450 ${cur} bağış fonumuz hazır."`
        },
        {
          name: 'Belediye Kriz Masası Yetkilisi',
          wantedModel: 'winter',
          hasEnoughMoney: true,
          wallet: 280,
          dialogue: `"Konteyner kent kurulana kadar Kışlık İzoleli Çadır gerekiyor. 280 ${cur} resmi ödeme hazır."`
        },
        {
          name: 'Cüzdanını Unutan Hamdi',
          wantedModel: 'standard',
          hasEnoughMoney: false,
          wallet: 30,
          dialogue: `"Standart çadır alacağım ama cebimde sadece 30 ${cur} kalmış, yine de satar mısın?"`
        }
      ];
      st.currentCustomer = customers[Math.floor(Math.random() * customers.length)];
      triggerUiSync();
    };
    gameRef.current.generateNewCustomerFn = generateNewCustomer;

    const tryInteract = () => {
      const st = gameRef.current;
      if (!st.isPlaying || st.isDead || st.isSurgeryMode) return;
      const p = camera.position;
      const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;

      // 1. Check Volunteer Characters Interaction
      for (const vm of volunteerMeshes) {
        if (Math.hypot(p.x - vm.vol.x, p.z - vm.vol.z) < 4.5) {
          st.isPaused = true;
          try {
            document.exitPointerLock();
          } catch {
            // Ignore
          }
          setActiveVolunteer(vm.vol);
          return;
        }
      }

      // 2. Weapon Smith & Horse Stable Interaction
      if (
        !st.drivingCarriage &&
        !st.drivingSupplyTruck &&
        weaponSmithBooth &&
        Math.hypot(p.x - weaponSmithBooth.position.x, p.z - (weaponSmithBooth.position.z + 1.0)) < 4.8
      ) {
        st.isPaused = true;
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
        setActiveModal('shop');
        return;
      }

      if (
        !st.drivingCarriage &&
        !st.drivingSupplyTruck &&
        horseStableBooth &&
        Math.hypot(p.x - horseStableBooth.position.x, p.z - (horseStableBooth.position.z + 1.2)) < 5.2
      ) {
        st.isPaused = true;
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
        setActiveModal('horse_stable');
        return;
      }

      // 3. Expanded Istanbul Stealth Depot Heist & Supply Truck Loading (Chapter 5 Phase 1)
      if (st.chapter === 5 && st.kurtulusPhase === 1) {
        if (
          st.carryingMedicalCrate &&
          supplyTruckGroup &&
          Math.hypot(p.x - supplyTruckGroup.position.x, p.z - supplyTruckGroup.position.z) < 7.5
        ) {
          st.carryingMedicalCrate = false;
          carriedCrateVisual.visible = false;
          st.truckLoadedCrates++;
          st.savedCount++;
          st.kurtulusPhaseProgress++;
          if (supplyTruckUpdateProgress) {
            supplyTruckUpdateProgress(st.truckLoadedCrates, st.kurtulusPhaseTarget);
          } else if (supplyTruckCrateSlots[st.truckLoadedCrates - 1]) {
            supplyTruckCrateSlots[st.truckLoadedCrates - 1].visible = true;
          }
          const stealthBonus = st.stealthSuspicion < 45 ? 100 : 0;
          st.points += 140 + stealthBonus;
          soundEngine.playSfx('heist_success');
          triggerUiSync();
          showToast(
            `Çalınan Sandık Nakliye Kamyonuna Yüklendi! (${st.truckLoadedCrates}/${st.kurtulusPhaseTarget})${
              stealthBonus > 0 ? ' +100 Kuruş Dikkat Çekmeden Soygun Bonusu!' : ''
            }`,
            '#2ecc71'
          );
          if (st.kurtulusPhaseProgress >= st.kurtulusPhaseTarget) {
            window.setTimeout(() => advanceKurtulusPhase(), 800);
          }
          return;
        }

        if (
          st.carryingMedicalCrate &&
          Math.hypot(p.x - operatingRoomTriggerPos.x, p.z - operatingRoomTriggerPos.z) < 10.5
        ) {
          st.carryingMedicalCrate = false;
          carriedCrateVisual.visible = false;
          st.truckLoadedCrates++;
          st.savedCount++;
          st.kurtulusPhaseProgress++;
          if (supplyTruckUpdateProgress) {
            supplyTruckUpdateProgress(st.truckLoadedCrates, st.kurtulusPhaseTarget);
          }
          st.points += 140;
          soundEngine.playSfx('heist_success');
          triggerUiSync();
          showToast(
            `Antrepo Sandığı İnebolu Takasına Yüklendi! (${st.kurtulusPhaseProgress}/${st.kurtulusPhaseTarget})`,
            '#2ecc71'
          );
          if (st.kurtulusPhaseProgress >= st.kurtulusPhaseTarget) {
            window.setTimeout(() => advanceKurtulusPhase(), 800);
          }
          return;
        }

        for (const inst of depotInstances) {
          const doorWorldX = inst.depot.x;
          const doorWorldZ = inst.depot.z + inst.depot.depth / 2 + 2.0;
          if (!inst.isUnlocked && Math.hypot(p.x - doorWorldX, p.z - doorWorldZ) < 5.5) {
            unlockDepotInScene(inst.depot.id);
            return;
          }

          if (inst.isUnlocked && !st.carryingMedicalCrate) {
            for (const cMesh of inst.crateMeshes) {
              if (!cMesh.visible) continue;
              const cwX = inst.depot.x + cMesh.position.x;
              const cwZ = inst.depot.z + cMesh.position.z;
              if (Math.hypot(p.x - cwX, p.z - cwZ) < 4.5) {
                cMesh.visible = false;
                inst.depot.lootCratesRemaining = Math.max(0, inst.depot.lootCratesRemaining - 1);
                const stateDepot = st.depots.find((d) => d.id === inst.depot.id);
                if (stateDepot) stateDepot.lootCratesRemaining = inst.depot.lootCratesRemaining;

                st.commodities.forEach((com) => {
                  const bonus = inst.depot.suppliesYield[com.id as keyof typeof inst.depot.suppliesYield] || 1;
                  com.stock += Math.max(1, Math.round(bonus / inst.depot.lootCratesTotal));
                });
                st.points += Math.round(inst.depot.cashReward / inst.depot.lootCratesTotal);
                st.carryingMedicalCrate = true;
                carriedCrateVisual.visible = true;
                if (!st.isCrouching) {
                  st.stealthSuspicion = Math.min(100, st.stealthSuspicion + 18);
                }
                soundEngine.playSfx('heist_success');
                triggerUiSync();
                showToast(
                  `Sandık çalındı! Dışarıdaki Mim Mim Nakliye Kamyonuna [E] ile yükleyin (Kamyonu yanınıza çağırmak için [K] tuşuna basın)!`,
                  '#00e5ff'
                );
                return;
              }
            }
          }
        }
      }

      // 4. AA Gun Toggle
      if (st.usingAAGun && aaGunGroup) {
        st.usingAAGun = false;
        weaponGroup.visible = true;
        camera.position.set(aaGunGroup.position.x + 2.5, 1.8, aaGunGroup.position.z + 2.5);
        pitch = 0;
        triggerUiSync();
        return;
      }
      if (!st.usingAAGun && aaGunGroup && Math.hypot(p.x - aaGunGroup.position.x, p.z - aaGunGroup.position.z) < 5.0) {
        st.usingAAGun = true;
        weaponGroup.visible = false;
        triggerUiSync();
        showToast('Uçaksavar Bataryasına Geçildi! Gökyüzündeki uçakları SOL TIK ile vurun.', '#38bdf8');
        return;
      }

      // 5. Dismount Supply Truck
      if (st.drivingSupplyTruck && supplyTruckGroup) {
        st.drivingSupplyTruck = false;
        st.truckSpeed = 0;
        st.truckSteerAngle = 0;
        st.truckGearLabel = 'N';
        st.truckRpm = 720;
        soundEngine.stopTruckEngine();
        soundEngine.playSfx('brake_hiss');
        weaponGroup.visible = true;
        _rgtVec.set(-2.9, 0, -0.8).applyAxisAngle(_upAxis, st.truckHeading);
        camera.position.set(
          supplyTruckGroup.position.x + _rgtVec.x,
          1.8,
          supplyTruckGroup.position.z + _rgtVec.z
        );
        triggerUiSync();
        return;
      }

      // 6. Dismount Horse/Ambulance or Deliver Wounded on Horse
      const distToOpRoom = Math.hypot(p.x - operatingRoomTriggerPos.x, p.z - operatingRoomTriggerPos.z);
      if (st.drivingCarriage && st.chapter !== 4 && st.horsePassengersCount > 0 && distToOpRoom < 13.5) {
        const batchToHeal = st.horsePassengersCount;
        st.drivingCarriage = false;
        st.horsePassengersCount = 0;
        if (horsePartsRef) {
          horsePartsRef.passengerSlots.forEach((s) => {
            s.visible = false;
          });
        }
        weaponGroup.visible = true;
        start3DInjectionSurgery(batchToHeal);
        return;
      }

      if (st.drivingCarriage && st.chapter !== 4 && st.horsePassengersCount < eqHorse.capacity) {
        for (const w of woundedList) {
          if (!w.rescued && Math.hypot(p.x - w.mesh.position.x, p.z - w.mesh.position.z) < 5.5) {
            w.rescued = true;
            w.mesh.visible = false;
            st.horsePassengersCount++;
            if (horsePartsRef && horsePartsRef.passengerSlots[st.horsePassengersCount - 1]) {
              horsePartsRef.passengerSlots[st.horsePassengersCount - 1].visible = true;
            }
            soundEngine.playSfx('pickup');
            triggerUiSync();
            showToast(
              `Yaralı Mehmetçik Atın Yüksek Kapasiteli Sedyesine Alındı! (${st.horsePassengersCount}/${eqHorse.capacity})`,
              '#2ecc71'
            );
            return;
          }
        }
      }

      if (st.drivingCarriage && transportVehicle) {
        st.drivingCarriage = false;
        st.vehicleSpeed = 0;
        weaponGroup.visible = true;
        const exitOffset = new THREE.Vector3(-2.6, 0, -0.5).applyAxisAngle(
          _upAxis,
          st.chapter === 4 ? st.vehicleHeading : yaw
        );
        camera.position.set(
          transportVehicle.position.x + exitOffset.x,
          1.8,
          transportVehicle.position.z + exitOffset.z
        );
        triggerUiSync();
        showToast(
          st.chapter === 4
            ? st.ambulanceHasPatient
              ? 'Ambulansın arkasına geçip [E] ile yaralıyı kucağınıza alın ve koridordan Ameliyathaneye girin!'
              : 'Kızılay Ambulansından inildi.'
            : 'Attan inildi.',
          '#ccc'
        );
        return;
      }

      // 7. 2023 Tent Sales Desk
      if (
        st.chapter === 4 &&
        !st.drivingCarriage &&
        tentSalesBooth &&
        Math.hypot(p.x - tentSalesBooth.position.x, p.z - (tentSalesBooth.position.z - 3.5)) < 6.5
      ) {
        st.isPaused = true;
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
        if (!st.currentCustomer) {
          generateNewCustomer();
        }
        setActiveModal('tent_sale');
        return;
      }

      // 8. 2023 Load or Unload Patient at the Rear of the Open-Back Ambulance
      if (st.chapter === 4 && !st.drivingCarriage && transportVehicle) {
        const rearPos = getAmbulanceRearWorldPos();
        if (rearPos && Math.hypot(p.x - rearPos.x, p.z - rearPos.z) < 4.2) {
          if (st.carryingSoldier && !st.ambulanceHasPatient) {
            st.carryingSoldier = false;
            carriedSoldierVisual.visible = false;
            st.ambulanceHasPatient = true;
            if (ambulanceStretcherPatientMesh) ambulanceStretcherPatientMesh.visible = true;
            soundEngine.playSfx('pickup');
            triggerUiSync();
            showToast(
              'Yaralı ambulansın arkasındaki sedyeye yatırıldı! Şimdi kabine geçip [E] ile ambulansı sürün!',
              '#2ecc71'
            );
            return;
          } else if (!st.carryingSoldier && st.ambulanceHasPatient) {
            st.ambulanceHasPatient = false;
            if (ambulanceStretcherPatientMesh) ambulanceStretcherPatientMesh.visible = false;
            st.carryingSoldier = true;
            carriedSoldierVisual.visible = true;
            soundEngine.playSfx('pickup');
            triggerUiSync();
            showToast(
              'Yaralı ambulanstan kucağınıza alındı! Kırmızı çizgiyi takip ederek Ameliyathaneye girin!',
              '#00e5ff'
            );
            return;
          }
        }
      }

      // 9. Start Surgery at Hospital
      if (
        (st.carryingSoldier || st.horsePassengersCount > 0) &&
        !st.drivingCarriage &&
        distToOpRoom < (st.chapter === 4 ? 5.5 : 12.0)
      ) {
        const totalBatch = (st.carryingSoldier ? 1 : 0) + st.horsePassengersCount;
        carriedSoldierVisual.visible = false;
        st.carryingSoldier = false;
        st.horsePassengersCount = 0;
        if (horsePartsRef) {
          horsePartsRef.passengerSlots.forEach((s) => {
            s.visible = false;
          });
        }
        start3DInjectionSurgery(totalBatch);
        return;
      }

      // 10. Load carried wounded soldier onto High-Capacity Horse
      if (
        st.carryingSoldier &&
        !st.drivingCarriage &&
        st.chapter !== 4 &&
        transportVehicle &&
        Math.hypot(p.x - transportVehicle.position.x, p.z - transportVehicle.position.z) < 5.8
      ) {
        if (st.horsePassengersCount < eqHorse.capacity) {
          st.carryingSoldier = false;
          carriedSoldierVisual.visible = false;
          st.horsePassengersCount++;
          if (horsePartsRef && horsePartsRef.passengerSlots[st.horsePassengersCount - 1]) {
            horsePartsRef.passengerSlots[st.horsePassengersCount - 1].visible = true;
          }
          soundEngine.playSfx('pickup');
          triggerUiSync();
          showToast(
            `Yaralı Atın Arkasına Yerleştirildi (${st.horsePassengersCount}/${eqHorse.capacity} Yüksek Kapasite)!`,
            '#2ecc71'
          );
          return;
        }
      }

      // 11. Pick up Wounded Soldier on Foot
      if (!st.carryingSoldier && !st.drivingCarriage && !st.drivingSupplyTruck) {
        for (const w of woundedList) {
          if (!w.rescued && Math.hypot(p.x - w.mesh.position.x, p.z - w.mesh.position.z) < 5.0) {
            w.rescued = true;
            w.mesh.visible = false;
            st.carryingSoldier = true;
            carriedSoldierVisual.visible = true;
            soundEngine.playSfx('pickup');
            triggerUiSync();
            showToast(
              w.isRubble
                ? 'Depremzede enkazdan çıkarıldı! Ambulansın arkasına yatırın veya Ameliyathaneye götürün!'
                : `Yaralı sedyeye alındı! ${eqHorse.capacity} kişilik Sıhhiye Atına veya Sahra Hastanesine götürün.`,
              '#00e5ff'
            );
            return;
          }
        }
      }

      // 12. Mount Horse or Ambulance
      if (
        transportVehicle &&
        !st.drivingCarriage &&
        !st.drivingSupplyTruck &&
        Math.hypot(p.x - transportVehicle.position.x, p.z - transportVehicle.position.z) < 5.8
      ) {
        if (st.chapter === 4 && st.carryingSoldier && !st.ambulanceHasPatient) {
          st.carryingSoldier = false;
          carriedSoldierVisual.visible = false;
          st.ambulanceHasPatient = true;
          if (ambulanceStretcherPatientMesh) ambulanceStretcherPatientMesh.visible = true;
        }
        st.drivingCarriage = true;
        st.vehicleSpeed = 0;
        if (st.chapter === 4) {
          st.vehicleHeading = transportVehicle.rotation.y;
          yaw = st.vehicleHeading;
        }
        weaponGroup.visible = false;
        soundEngine.playSfx('hoof');
        triggerUiSync();
        showToast(
          st.chapter === 4
            ? '4 Tekerli Kızılay Ambulansına binildi! (W/S: Gaz-Fren, A/D: Direksiyon, V: Kamera Açısı)'
            : `${eqHorse.name} (${eqHorse.capacity} Kişilik Kapasite) binek atına binildi!`,
          '#e6b800'
        );
      }
    };

    const toggleDriveSupplyTruck = () => {
      const st = gameRef.current;
      if (!supplyTruckGroup || st.chapter !== 5 || st.kurtulusPhase !== 1) return;
      if (st.drivingSupplyTruck) {
        st.drivingSupplyTruck = false;
        st.truckSpeed = 0;
        st.truckSteerAngle = 0;
        st.truckGearLabel = 'N';
        st.truckRpm = 720;
        soundEngine.stopTruckEngine();
        soundEngine.playSfx('brake_hiss');
        weaponGroup.visible = true;
        _rgtVec.set(-2.9, 0, -0.8).applyAxisAngle(_upAxis, st.truckHeading);
        camera.position.set(
          supplyTruckGroup.position.x + _rgtVec.x,
          1.8,
          supplyTruckGroup.position.z + _rgtVec.z
        );
        triggerUiSync();
        showToast('Nakliye Kamyonundan inildi, el freni çekildi.', '#38bdf8');
      } else if (
        Math.hypot(camera.position.x - supplyTruckGroup.position.x, camera.position.z - supplyTruckGroup.position.z) <
        7.5
      ) {
        st.drivingCarriage = false;
        st.drivingSupplyTruck = true;
        st.truckHeading = supplyTruckGroup.rotation.y;
        st.truckSpeed = 0;
        st.truckSteerAngle = 0;
        yaw = st.truckHeading;
        pitch = 0;
        weaponGroup.visible = false;
        soundEngine.startTruckEngine();
        const camInfo = TRUCK_CAMERA_MODES[st.truckCameraMode] || TRUCK_CAMERA_MODES[1];
        triggerUiSync();
        showToast(
          `Mim Mim Nakliye Kamyonu çalıştırıldı! [W/S] Gaz & Fren/Geri · [A/D] Direksiyon · [SPACE] El Freni · [V] Kamera (${camInfo.name})`,
          '#2ecc71'
        );
      } else {
        gameRef.current.summonSupplyTruckNearPlayerFn();
      }
    };

    const cycleTruckCamera = () => {
      const st = gameRef.current;
      st.truckCameraMode = (st.truckCameraMode + 1) % TRUCK_CAMERA_MODES.length;
      const modeObj = TRUCK_CAMERA_MODES[st.truckCameraMode];
      soundEngine.playSfx('pickup');
      triggerUiSync();
      showToast(`Kamyon Kamerası Değiştirildi: ${modeObj.name}`, '#38bdf8');
    };

    const updateInteractionPrompt = () => {
      const st = gameRef.current;
      const p = st.drivingSupplyTruck && supplyTruckGroup ? supplyTruckGroup.position : camera.position;
      let prompt = '';

      if (st.chapter === 5 && st.kurtulusPhase === 1) {
        let closestDist = ISTANBUL_DISTRICTS[0];
        let minD = Infinity;
        for (const d of ISTANBUL_DISTRICTS) {
          const distVal = Math.hypot(p.x - d.centerX, p.z - d.centerZ);
          if (distVal < minD) {
            minD = distVal;
            closestDist = d;
          }
        }
        setCurrentDistrictName(closestDist.name);
      }

      for (const vm of volunteerMeshes) {
        if (Math.hypot(p.x - vm.vol.x, p.z - vm.vol.z) < 4.5) {
          prompt = `[E] Gönüllü ${vm.vol.name} İle Konuş`;
          break;
        }
      }

      if (!prompt && st.chapter === 5 && st.kurtulusPhase === 1) {
        if (st.drivingSupplyTruck) {
          const camObj = TRUCK_CAMERA_MODES[st.truckCameraMode] || TRUCK_CAMERA_MODES[1];
          prompt = `[V] Kamera Değiştir (${camObj.name.split(' (')[0]}) · [E / G] Kamyondan İn`;
        } else if (
          st.carryingMedicalCrate &&
          supplyTruckGroup &&
          Math.hypot(p.x - supplyTruckGroup.position.x, p.z - supplyTruckGroup.position.z) < 7.5
        ) {
          prompt = `[E] Çalınan Sandığı Kamyona Yükle (${st.truckLoadedCrates}/${st.kurtulusPhaseTarget})`;
        } else if (
          !st.carryingMedicalCrate &&
          supplyTruckGroup &&
          Math.hypot(p.x - supplyTruckGroup.position.x, p.z - supplyTruckGroup.position.z) < 6.5
        ) {
          prompt = `[G] Nakliye Kamyonunu Sür (${st.truckLoadedCrates}/${st.kurtulusPhaseTarget} Sandık Yüklü)`;
        } else if (
          st.carryingMedicalCrate &&
          Math.hypot(p.x - operatingRoomTriggerPos.x, p.z - operatingRoomTriggerPos.z) < 10.5
        ) {
          prompt = '[E] Antrepo Sandığını İnebolu Takasına Yükle';
        } else {
          for (const inst of depotInstances) {
            const doorWorldX = inst.depot.x;
            const doorWorldZ = inst.depot.z + inst.depot.depth / 2 + 2.0;
            if (!inst.isUnlocked && Math.hypot(p.x - doorWorldX, p.z - doorWorldZ) < 5.5) {
              prompt = `[E] ${inst.depot.name} Kilidini Sessizce Kır (${st.isCrouching ? 'Gizli Mod' : '[C] Eğil Önerilir'})`;
              break;
            }
            if (inst.isUnlocked && !st.carryingMedicalCrate) {
              for (const cMesh of inst.crateMeshes) {
                if (!cMesh.visible) continue;
                const cwX = inst.depot.x + cMesh.position.x;
                const cwZ = inst.depot.z + cMesh.position.z;
                if (Math.hypot(p.x - cwX, p.z - cwZ) < 4.5) {
                  prompt = `[E] Sandığı Dikkat Çekmeden Çal (Kamyona Yüklemek İçin)`;
                  break;
                }
              }
            }
          }
        }
      }

      if (!prompt) {
        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const distToOpRoom = Math.hypot(p.x - operatingRoomTriggerPos.x, p.z - operatingRoomTriggerPos.z);

        if (
          st.chapter === 4 &&
          !st.drivingCarriage &&
          tentSalesBooth &&
          Math.hypot(p.x - tentSalesBooth.position.x, p.z - (tentSalesBooth.position.z - 3.5)) < 6.5
        ) {
          prompt = '[E] Kızılay Çadır Satış Masasını Aç (Müşteri Taleplerini Karşıla)';
        } else if (st.chapter === 4 && !st.drivingCarriage && transportVehicle) {
          const rearPos = getAmbulanceRearWorldPos();
          if (rearPos && Math.hypot(p.x - rearPos.x, p.z - rearPos.z) < 4.2) {
            if (st.carryingSoldier && !st.ambulanceHasPatient) {
              prompt = '[E] Yaralıyı Ambulansın Arkasındaki Sedyeye Yatır';
            } else if (!st.carryingSoldier && st.ambulanceHasPatient) {
              prompt = '[E] Yaralıyı Ambulanstan Kucağına Al (Ameliyathaneye Götür)';
            }
          }
        }

        if (!prompt) {
          if (
            (st.carryingSoldier || st.horsePassengersCount > 0) &&
            !st.drivingCarriage &&
            distToOpRoom < (st.chapter === 4 ? 5.5 : 13.0)
          ) {
            prompt =
              st.chapter === 4
                ? '[E] Ameliyathane Masasında Cerrahi Müdahaleye Başla'
                : '[E] Sahra Hastanesinde Tedaviye Başla';
          } else if (st.drivingCarriage) {
            prompt =
              st.chapter === 4
                ? '[E] Ambulanstan İn · [V] Kamera Açısını Değiştir'
                : `[E] Araçtan / Attan İn (Yüklü Yaralı: ${st.horsePassengersCount}/${eqHorse.capacity})`;
          } else {
            for (const w of woundedList) {
              if (!w.rescued && Math.hypot(p.x - w.mesh.position.x, p.z - w.mesh.position.z) < 5.0) {
                prompt = w.isRubble ? '[E / SOL TIK] Kazmayla Enkazı Kır ve Kurtar' : '[E] Yaralıyı Sedyeye Al';
                break;
              }
            }
            if (
              !prompt &&
              transportVehicle &&
              Math.hypot(p.x - transportVehicle.position.x, p.z - transportVehicle.position.z) < 5.8
            ) {
              prompt =
                st.chapter === 4
                  ? '[E] Kızılay Ambulansını Sür (Sürücü Kabini)'
                  : `[E] ${eqHorse.name} Bin (${st.horsePassengersCount}/${eqHorse.capacity} Kapasite)`;
            }
          }
        }
      }

      if (st.interactionPrompt !== prompt) {
        st.interactionPrompt = prompt;
        triggerUiSync();
      }
    };

    // Expose engine methods to React UI
    gameRef.current.startChapterFn = (chpNum: number) => {
      const st = gameRef.current;
      st.chapter = chpNum;
      st.savedCount = 0;
      st.targetCount = CHAPTERS_DATA[chpNum].targetSaved;
      st.health = 100;
      st.isInWater = false;
      st.oxygenLevel = 100;
      st.stealthSuspicion = 0;
      st.truckLoadedCrates = 0;
      st.isDead = false;
      st.isPaused = false;
      st.isSurgeryMode = false;
      st.carryingSoldier = false;
      st.carryingMedicalCrate = false;
      st.horsePassengersCount = 0;
      st.drivingCarriage = false;
      st.drivingSupplyTruck = false;
      st.ambulanceHasPatient = false;
      st.ambulanceThirdPerson = false;
      st.vehicleSpeed = 0;
      st.vehicleSteer = 0;
      st.vehicleHeading = 0;
      st.usingAAGun = false;
      if (chpNum === 5) st.kurtulusPhase = 1;
      carriedSoldierVisual.visible = false;
      carriedCrateVisual.visible = false;
      weaponGroup.visible = true;

      if (chpNum === 4) {
        st.currentWeaponId = 'pickaxe';
      } else if (st.currentWeaponId === 'pickaxe') {
        st.currentWeaponId = 'pistol';
      }
      const wData = st.weapons[st.currentWeaponId] || st.weapons.pistol;
      st.ammo = wData.maxAmmo;
      st.maxAmmo = wData.maxAmmo;

      buildWorld(chpNum);
      createWeaponMesh();
      st.isPlaying = true;
      triggerUiSync();
    };

    gameRef.current.rebuildWeaponFn = () => {
      createWeaponMesh();
    };

    gameRef.current.rebuildHorseFn = () => {
      const st = gameRef.current;
      if (transportVehicle && st.chapter !== 4) {
        const oldPos = transportVehicle.position.clone();
        const oldRot = transportVehicle.rotation.y;
        scene.remove(transportVehicle);
        const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
        const { horseGrp, legs, passengerSlots } = createRideableHorseMesh(
          eqHorse,
          crescentTex,
          st.horsePassengersCount
        );
        transportVehicle = horseGrp;
        horsePartsRef = { legs, passengerSlots };
        transportVehicle.position.copy(oldPos);
        transportVehicle.rotation.y = oldRot;
        scene.add(transportVehicle);
      }
    };

    gameRef.current.teleportPlayerFn = (tx: number, tz: number, bringTruck = false) => {
      const st = gameRef.current;
      st.isInWater = false;
      st.oxygenLevel = 100;
      camera.position.set(tx, st.drivingCarriage || st.drivingSupplyTruck ? 2.38 : 1.8, tz);
      if (st.drivingCarriage && transportVehicle) {
        transportVehicle.position.set(tx, 0, tz);
      }
      if (bringTruck && supplyTruckGroup) {
        supplyTruckGroup.position.set(tx + 5.5, 0, tz + 2.0);
      }
      soundEngine.playSfx('hoof');
      triggerUiSync();
    };

    gameRef.current.summonSupplyTruckNearPlayerFn = () => {
      if (!supplyTruckGroup) return;
      const st = gameRef.current;
      const p = st.drivingSupplyTruck ? supplyTruckGroup.position : camera.position;
      supplyTruckGroup.position.set(p.x + 4.2, 0, p.z - 2.5);
      st.truckHeading = yaw;
      st.truckSpeed = 0;
      st.truckSteerAngle = 0;
      supplyTruckGroup.rotation.set(0, yaw, 0);
      soundEngine.playSfx('pickup');
      showToast('Mim Mim Nakliye Kamyonu yanınıza yanaştı! Çaldığınız sandıkları [E] ile yükleyin!', '#2ecc71');
      triggerUiSync();
    };

    gameRef.current.cycleTruckCameraFn = () => {
      cycleTruckCamera();
    };

    gameRef.current.testGamepadRumbleFn = () => {
      triggerGamepadRumble(0.65, 0.9, 280);
      soundEngine.playSfx('pickup');
      showToast('Kontrolcü çift motorlu titreşim (Dual-Rumble) sinyali gönderildi!', '#10b981');
    };

    gameRef.current.unlockDepotInSceneFn = (depotId: string) => {
      unlockDepotInScene(depotId);
    };

    gameRef.current.spawnDefenseMeshFn = (type: DefenseStructureSpec['type']) => {
      spawnDefenseMeshInScene(type);
    };

    gameRef.current.rebuildReconstructionMeshesFn = () => {
      rebuildReconstructionMeshes();
    };

    gameRef.current.completeSurgeryFn = () => {
      const st = gameRef.current;
      const healedCount = Math.max(1, st.pendingBatchHealCount || 1);
      st.pendingBatchHealCount = 1;
      st.isSurgeryMode = false;
      weaponGroup.visible = true;

      st.savedCount += healedCount;
      if (st.chapter === 5 && (st.kurtulusPhase === 3 || st.kurtulusPhase === 4)) {
        st.kurtulusPhaseProgress += healedCount;
      }
      const volBonus = st.claimedVolunteerIds.includes('vol_marko_aziz') ? 60 : 0;
      const rewardPerPatient = 150 + volBonus;
      st.points += rewardPerPatient * healedCount;
      soundEngine.playSfx('rescued');
      showToast(
        `${healedCount} Yaralıya Sahra Cerrahi Müdahalesi Başarılı! (+${rewardPerPatient * healedCount} ${getCurrencyName()})`,
        '#2ecc71'
      );
      triggerUiSync();

      if (st.chapter === 5 && st.kurtulusPhase === 3 && st.kurtulusPhaseProgress >= st.kurtulusPhaseTarget) {
        window.setTimeout(() => advanceKurtulusPhase(), 700);
        return;
      }

      if (!st.isEndless && st.savedCount >= st.targetCount) {
        st.isPlaying = false;
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
        setActiveModal('newspaper');
      }
    };

    // Input Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveFlags.w = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveFlags.s = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveFlags.a = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveFlags.d = true;
      if (e.code === 'ShiftLeft') moveFlags.shift = true;
      if (e.code === 'Space') {
        if (!moveFlags.space && gameRef.current.drivingSupplyTruck && Math.abs(gameRef.current.truckSpeed) > 2.5) {
          soundEngine.playSfx('brake_hiss');
        }
        moveFlags.space = true;
      }

      if (e.code === 'KeyE') tryInteract();
      if (e.code === 'KeyG') toggleDriveSupplyTruck();
      if (e.code === 'KeyV') {
        if (gameRef.current.chapter === 5 && gameRef.current.kurtulusPhase === 1) {
          cycleTruckCamera();
        } else if (gameRef.current.chapter === 4 && gameRef.current.drivingCarriage) {
          gameRef.current.ambulanceThirdPerson = !gameRef.current.ambulanceThirdPerson;
          triggerUiSync();
          showToast(
            gameRef.current.ambulanceThirdPerson
              ? 'Ambulans Dış Kamera (3. Şahıs) Açısına Geçildi'
              : 'Ambulans Sürücü Kabini (1. Şahıs) Açısına Geçildi',
            '#38bdf8'
          );
        }
      }
      if (e.code === 'KeyK' && gameRef.current.chapter === 5 && gameRef.current.kurtulusPhase === 1) {
        gameRef.current.summonSupplyTruckNearPlayerFn();
      }
      if (e.code === 'KeyR') reloadWeapon();
      if (e.code === 'KeyC' && !gameRef.current.drivingCarriage && !gameRef.current.drivingSupplyTruck) {
        gameRef.current.isCrouching = !gameRef.current.isCrouching;
        triggerUiSync();
      }
      if (e.code === 'KeyH') {
        setControlsBarVisible((v) => !v);
      }
      if (e.code === 'KeyJ' && gameRef.current.chapter === 5 && gameRef.current.kurtulusPhase === 1) {
        gameRef.current.isPaused = true;
        soundEngine.stopTruckEngine();
        try { document.exitPointerLock(); } catch { /* ignore */ }
        setActiveModal('istanbul_depots');
      }
      if (e.code === 'KeyN') {
        gameRef.current.isPaused = true;
        soundEngine.stopTruckEngine();
        try { document.exitPointerLock(); } catch { /* ignore */ }
        setActiveModal('economy');
      }
      if (e.code === 'KeyF' && gameRef.current.chapter !== 4) {
        gameRef.current.isPaused = true;
        soundEngine.stopTruckEngine();
        try { document.exitPointerLock(); } catch { /* ignore */ }
        setActiveModal('plevne_defense');
      }
      if (e.code === 'KeyB' && gameRef.current.chapter === 4) {
        gameRef.current.isPaused = true;
        try { document.exitPointerLock(); } catch { /* ignore */ }
        setActiveModal('reconstruction');
      }
      if (e.code === 'KeyM') {
        gameRef.current.isPaused = true;
        soundEngine.stopTruckEngine();
        try { document.exitPointerLock(); } catch { /* ignore */ }
        setActiveModal('shop');
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameRef.current.isPlaying && !gameRef.current.isDead && !gameRef.current.isSurgeryMode) {
          gameRef.current.isPaused = !gameRef.current.isPaused;
          if (gameRef.current.isPaused) {
            soundEngine.stopTruckEngine();
            try { document.exitPointerLock(); } catch { /* ignore */ }
            setActiveModal('pause');
          } else {
            setActiveModal(null);
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveFlags.w = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveFlags.s = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveFlags.a = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveFlags.d = false;
      if (e.code === 'ShiftLeft') moveFlags.shift = false;
      if (e.code === 'Space') moveFlags.space = false;
    };

    const onWindowBlur = () => {
      moveFlags.w = false;
      moveFlags.a = false;
      moveFlags.s = false;
      moveFlags.d = false;
      moveFlags.shift = false;
      moveFlags.space = false;
      soundEngine.stopTruckEngine();
    };

    const onMouseDown = (e: MouseEvent) => {
      const st = gameRef.current;
      if (st.isSurgeryMode && e.button === 0) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, surgeryCamera);
        const hits = raycaster.intersectObjects([veinMeshRef, wrongZoneMeshRef, carotidTrapMeshRef], true);
        if (hits.length > 0) {
          const hitType = hits[0].object.userData.type;
          if (hitType === 'VEIN') {
            soundEngine.playSfx('surgery_step');
            setActiveModal('pressure');
          } else if (hitType === 'CAROTID_TRAP') {
            st.isSurgeryMode = false;
            applyPlayerDamage(100, 'Şah damarına hatalı müdahale');
          } else {
            showToast('Parlak mavi damar üzerine tıklayın!', '#f59e0b');
          }
        }
        return;
      }

      if (!st.isPlaying || st.isPaused || st.isDead) return;
      if (e.button === 2) {
        st.isAds = true;
        triggerUiSync();
        return;
      }
      if (document.pointerLockElement !== renderer.domElement) {
        try {
          renderer.domElement.requestPointerLock();
        } catch {
          // Ignore
        }
      }
      if (e.button === 0 && !st.drivingCarriage && !st.drivingSupplyTruck) shootWeapon();
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        gameRef.current.isAds = false;
        triggerUiSync();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const st = gameRef.current;
      if (st.isSurgeryMode) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, surgeryCamera);
        const dir = raycaster.ray.direction;
        const orig = raycaster.ray.origin;
        if (Math.abs(dir.y) > 0.001) {
          const t = (0.72 - orig.y) / dir.y;
          syringeMesh.position.set(
            THREE.MathUtils.clamp(orig.x + dir.x * t, -2.2, 2.2),
            0.75,
            THREE.MathUtils.clamp(orig.z + dir.z * t, -2.2, 1.5)
          );
        }
        return;
      }

      if (!st.isPlaying || st.isPaused || st.isDead) return;
      if (document.pointerLockElement === renderer.domElement) {
        const sens = st.isAds ? 0.0013 : 0.0023;
        yaw -= e.movementX * sens;
        pitch = THREE.MathUtils.clamp(pitch - e.movementY * sens, -Math.PI / 2.4, Math.PI / 2.4);
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      surgeryCamera.aspect = window.innerWidth / window.innerHeight;
      surgeryCamera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onGamepadConnected = (e: GamepadEvent) => {
      const st = gameRef.current;
      st.gamepadConnected = true;
      st.gamepadName = e.gamepad.id || 'Standart Oyun Kontrolcüsü';
      triggerGamepadRumble(0.4, 0.6, 180);
      triggerUiSync();
      showToast(`Oyun Kontrolcüsü Bağlandı: ${st.gamepadName.slice(0, 38)}`, '#10b981');
    };

    const onGamepadDisconnected = () => {
      const st = gameRef.current;
      st.gamepadConnected = false;
      st.gamepadName = '';
      st.gpLeftStickX = 0;
      st.gpLeftStickY = 0;
      st.gpRightStickX = 0;
      st.gpRightStickY = 0;
      st.gpRightTrigger = 0;
      st.gpLeftTrigger = 0;
      triggerUiSync();
      showToast('Oyun Kontrolcüsü Bağlantısı Kesildi.', '#f59e0b');
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    buildWorld(1);
    createWeaponMesh();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const applyDeadzone = (val: number, dz: number) => {
      if (Math.abs(val) < dz) return 0;
      return (val - Math.sign(val) * dz) / (1 - dz);
    };

    const pollGamepadInput = (dt: number) => {
      if (typeof navigator.getGamepads !== 'function') return;
      const pads = navigator.getGamepads();
      let gp: Gamepad | null = null;
      for (const candidate of pads) {
        if (candidate && candidate.connected) {
          gp = candidate;
          break;
        }
      }

      const st = gameRef.current;
      if (!gp) {
        if (st.gamepadConnected) {
          st.gamepadConnected = false;
          st.gamepadName = '';
          triggerUiSync();
        }
        st.gpLeftStickX = 0;
        st.gpLeftStickY = 0;
        st.gpRightStickX = 0;
        st.gpRightStickY = 0;
        st.gpRightTrigger = 0;
        st.gpLeftTrigger = 0;
        return;
      }

      if (!st.gamepadConnected) {
        st.gamepadConnected = true;
        st.gamepadName = gp.id || 'Standart Oyun Kontrolcüsü';
        triggerUiSync();
      }

      const dz = st.gamepadDeadzone || 0.14;
      const lx = applyDeadzone(gp.axes[0] || 0, dz);
      const ly = applyDeadzone(gp.axes[1] || 0, dz);
      const rx = applyDeadzone(gp.axes[2] || 0, dz);
      const ry = applyDeadzone(gp.axes[3] || 0, dz);
      const ltVal = gp.buttons[6] ? gp.buttons[6].value : 0;
      const rtVal = gp.buttons[7] ? gp.buttons[7].value : 0;

      st.gpLeftStickX = lx;
      st.gpLeftStickY = ly;
      st.gpRightStickX = rx;
      st.gpRightStickY = ry;
      st.gpLeftTrigger = ltVal;
      st.gpRightTrigger = rtVal;

      const isJustPressed = (btnIdx: number) => {
        const cur = Boolean(gp!.buttons[btnIdx]?.pressed);
        const prev = Boolean(prevGamepadButtons[btnIdx]);
        return cur && !prev;
      };

      // 1. Handle Modal / Menu Navigation via Gamepad
      if (st.currentModal !== null || st.currentVolunteer !== null) {
        // Select / Share (Button 8): Toggle Gamepad Help Modal
        if (isJustPressed(8)) {
          if (st.currentModal === 'gamepad_help') {
            setActiveModal(st.isPlaying ? null : 'main_menu');
            if (st.isPlaying) st.isPaused = false;
          } else {
            st.isPaused = true;
            setActiveModal('gamepad_help');
          }
        }
        // A / Cross (Button 0): Confirm / Primary Action in Modals
        else if (isJustPressed(0)) {
          if (st.currentModal === 'pressure') {
            setActiveModal(null);
            st.completeSurgeryFn();
          } else if (st.currentModal === 'briefing') {
            setActiveModal(null);
            st.startChapterFn(st.pendingChapter);
          } else if (st.currentModal === 'main_menu') {
            setActiveModal('briefing');
          } else if (st.currentModal === 'martyr') {
            setActiveModal(null);
            st.startChapterFn(st.chapter);
          } else if (st.currentModal === 'newspaper') {
            const order = [6, 1, 2, 5, 3, 4];
            const idx = order.indexOf(st.chapter);
            if (idx >= 0 && idx < order.length - 1) {
              st.pendingChapter = order[idx + 1];
              setActiveModal('briefing');
            } else {
              setActiveModal('main_menu');
            }
          } else if (st.currentVolunteer !== null) {
            const vol = st.currentVolunteer;
            if (!st.claimedVolunteerIds.includes(vol.id)) {
              st.claimedVolunteerIds.push(vol.id);
              st.points += 150;
              st.health = 100;
              st.commodities.forEach((c) => {
                c.stock += 2;
              });
              soundEngine.playSfx('rescued');
              showToast(`${vol.name} gönüllü desteği aktif edildi!`, '#2ecc71');
            } else {
              st.health = 100;
              soundEngine.playSfx('pickup');
            }
            setActiveVolunteer(null);
            st.isPaused = false;
          }
        }
        // B / Circle (Button 1) or Start (Button 9): Close Modal & Resume
        else if (isJustPressed(1) || isJustPressed(9)) {
          if (st.currentModal !== 'main_menu' && st.currentModal !== 'martyr') {
            setActiveModal(null);
            setActiveVolunteer(null);
            if (st.isPlaying && !st.isDead && !st.isSurgeryMode) {
              st.isPaused = false;
            }
            triggerUiSync();
          }
        }

        // Save button states and exit modal branch
        for (let i = 0; i < gp.buttons.length && i < prevGamepadButtons.length; i++) {
          prevGamepadButtons[i] = Boolean(gp.buttons[i]?.pressed);
        }
        return;
      }

      // 2. Handle 3D Surgery Mode via Gamepad
      if (st.isSurgeryMode) {
        const moveSx = (Math.abs(lx) > Math.abs(rx) ? lx : rx) * 2.8 * dt;
        const moveSz = (Math.abs(ly) > Math.abs(ry) ? ly : ry) * 2.8 * dt;
        if (Math.abs(moveSx) > 0.0001 || Math.abs(moveSz) > 0.0001) {
          syringeMesh.position.x = THREE.MathUtils.clamp(syringeMesh.position.x + moveSx, -2.2, 2.2);
          syringeMesh.position.z = THREE.MathUtils.clamp(syringeMesh.position.z + moveSz, -2.2, 1.5);
        }

        // A (Button 0), RT (Button 7) or Y (Button 3): Inject into vein
        if (isJustPressed(0) || isJustPressed(7) || isJustPressed(3)) {
          const distToVein = Math.hypot(
            syringeMesh.position.x - veinMeshRef.position.x,
            syringeMesh.position.z - veinMeshRef.position.z
          );
          const distToCarotid = Math.hypot(
            syringeMesh.position.x - 0.22,
            syringeMesh.position.z - -1.33
          );
          if (isJustPressed(3) || distToVein < 0.95) {
            soundEngine.playSfx('surgery_step');
            triggerGamepadRumble(0.3, 0.5, 120);
            setActiveModal('pressure');
          } else if (distToCarotid < 0.55) {
            st.isSurgeryMode = false;
            applyPlayerDamage(100, 'Şah damarına hatalı müdahale');
          } else {
            showToast('Sol Çubuk ile şırıngayı Mavi Damar üzerine getirip [A / RT] basın (veya [Y] Otomatik Damar Yolu)!', '#f59e0b');
          }
        }

        for (let i = 0; i < gp.buttons.length && i < prevGamepadButtons.length; i++) {
          prevGamepadButtons[i] = Boolean(gp.buttons[i]?.pressed);
        }
        return;
      }

      // 3. Active 3D Gameplay Controls via Gamepad
      if (st.isPlaying && !st.isPaused && !st.isDead) {
        // Right Stick Camera Look
        if (Math.abs(rx) > 0.001 || Math.abs(ry) > 0.001) {
          const baseLookSpeed = (st.isAds ? 1.45 : 2.65) * st.gamepadSensitivity;
          yaw -= rx * baseLookSpeed * dt;
          pitch = THREE.MathUtils.clamp(pitch - ry * baseLookSpeed * dt, -Math.PI / 2.4, Math.PI / 2.4);
        }

        // Left Trigger (LT / L2 - Button 6): Aim Down Sights when on foot
        if (!st.drivingSupplyTruck && !st.drivingCarriage && st.chapter !== 4) {
          const wantAds = ltVal > 0.25 || Boolean(gp.buttons[6]?.pressed);
          if (wantAds !== st.isAds) {
            st.isAds = wantAds;
            triggerUiSync();
          }
        }

        // Right Trigger (RT / R2 - Button 7): Shoot Weapon when not driving vehicle
        if (!st.drivingSupplyTruck && !st.drivingCarriage && (rtVal > 0.45 || Boolean(gp.buttons[7]?.pressed))) {
          shootWeapon();
        }

        // A / Cross (Button 0): Interact [E]
        if (isJustPressed(0)) {
          tryInteract();
          triggerGamepadRumble(0.25, 0.4, 80);
        }

        // B / Circle (Button 1): Toggle Crouch [C] on foot, or Dismount vehicle
        if (isJustPressed(1)) {
          if (st.drivingSupplyTruck) {
            toggleDriveSupplyTruck();
          } else if (st.drivingCarriage) {
            tryInteract();
          } else {
            st.isCrouching = !st.isCrouching;
            triggerUiSync();
          }
        }

        // X / Square (Button 2): Reload [R]
        if (isJustPressed(2)) {
          reloadWeapon();
        }

        // Y / Triangle (Button 3) or R3 (Button 11): Cycle Truck/Ambulance Camera [V] or Switch Weapon
        if (isJustPressed(3) || isJustPressed(11)) {
          if (st.chapter === 5 && st.kurtulusPhase === 1 && (st.drivingSupplyTruck || isJustPressed(11))) {
            cycleTruckCamera();
          } else if (st.chapter === 4 && st.drivingCarriage) {
            st.ambulanceThirdPerson = !st.ambulanceThirdPerson;
            triggerUiSync();
            showToast(
              st.ambulanceThirdPerson
                ? 'Ambulans Dış Kamera (3. Şahıs) Açısına Geçildi'
                : 'Ambulans Sürücü Kabini (1. Şahıs) Açısına Geçildi',
              '#38bdf8'
            );
          } else {
            cycleOwnedWeapon();
          }
        }

        // RB / R1 (Button 5): Mount/Dismount Supply Truck [G] in Kurtuluş Phase 1, else Switch Weapon
        if (isJustPressed(5)) {
          if (st.chapter === 5 && st.kurtulusPhase === 1) {
            toggleDriveSupplyTruck();
          } else {
            cycleOwnedWeapon();
          }
        }

        // LB / L1 (Button 4): Summon Supply Truck [K] in Kurtuluş Phase 1
        if (isJustPressed(4) && st.chapter === 5 && st.kurtulusPhase === 1) {
          st.summonSupplyTruckNearPlayerFn();
          triggerGamepadRumble(0.3, 0.5, 110);
        }

        // D-Pad Up (Button 12): 10 Districts & Depots [J] or Reconstruction [B]
        if (isJustPressed(12)) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal(st.chapter === 4 ? 'reconstruction' : 'istanbul_depots');
        }

        // D-Pad Right (Button 15): Dynamic Economy [N]
        if (isJustPressed(15)) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal('economy');
        }

        // D-Pad Left (Button 14): Plevne Defense [F]
        if (isJustPressed(14) && st.chapter !== 4) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal('plevne_defense');
        }

        // D-Pad Down (Button 13): Weapon Smith & Shop [M]
        if (isJustPressed(13)) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal('shop');
        }

        // Start / Options (Button 9): Pause Menu
        if (isJustPressed(9)) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal('pause');
        }

        // Select / Share (Button 8): Controller Mapping Help Modal
        if (isJustPressed(8)) {
          st.isPaused = true;
          soundEngine.stopTruckEngine();
          setActiveModal('gamepad_help');
        }
      }

      for (let i = 0; i < gp.buttons.length && i < prevGamepadButtons.length; i++) {
        prevGamepadButtons[i] = Boolean(gp.buttons[i]?.pressed);
      }
    };

    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta());
      const st = gameRef.current;

      // Poll connected Gamepad / Controller every frame
      pollGamepadInput(dt);

      if (st.isSurgeryMode) {
        renderer.render(surgeryScene, surgeryCamera);
      } else {
        if (st.isPlaying && !st.isPaused && !st.isDead) {
          // 1. Player & Vehicle Movement
          if (st.usingAAGun && aaGunGroup && aaGunPivot) {
            aaGunPivot.rotation.y = yaw;
            const clampedPitch = Math.max(-0.12, Math.min(Math.PI / 2.2, pitch));
            aaGunPivot.rotation.x = clampedPitch;
            _moveVec.set(0, 1.35, 2.35).applyAxisAngle(_upAxis, yaw);
            camera.position.set(
              aaGunGroup.position.x + _moveVec.x,
              aaGunGroup.position.y + 1.65 + _moveVec.y,
              aaGunGroup.position.z + _moveVec.z
            );
            camera.rotation.y = yaw;
            camera.rotation.x = clampedPitch;
          } else {
            let isMoving = false;
            const elapsed = clock.getElapsedTime();

            if (st.drivingSupplyTruck && supplyTruckGroup) {
              // ============================================================
              // REAL 1920s HEAVY TRUCK ACKERMANN VEHICLE PHYSICS & ENGINE SFX
              // (Supports Keyboard WASD/Space AND Gamepad Analog Stick + RT/LT!)
              // ============================================================
              const waterDragFactor = st.isInWater ? 0.42 : 1.0;
              const isOverdrive = moveFlags.shift || Boolean(navigator.getGamepads?.()?.[0]?.buttons[10]?.pressed);
              const maxFwdSpeed = (isOverdrive ? 24.5 : 20.5) * waterDragFactor;
              const maxRevSpeed = -8.5 * waterDragFactor;

              const speedRatio = Math.min(1, Math.abs(st.truckSpeed) / 22.0);
              const maxSteer = THREE.MathUtils.lerp(0.56, 0.30, speedRatio);
              let targetSteer = 0;
              if (moveFlags.a) targetSteer += maxSteer;
              if (moveFlags.d) targetSteer -= maxSteer;
              if (Math.abs(st.gpLeftStickX) > 0.01) {
                targetSteer = -st.gpLeftStickX * maxSteer;
              }
              st.truckSteerAngle = THREE.MathUtils.damp(
                st.truckSteerAngle,
                targetSteer,
                targetSteer !== 0 ? 6.5 : 8.5,
                dt
              );

              let accel = 0;
              let isThrottleOn = false;
              let isBraking = false;
              let targetPitch = 0;

              const gpThrottleAmt = Math.max(
                st.gpRightTrigger,
                st.gpLeftStickY < -0.15 ? -st.gpLeftStickY : 0
              );
              const gpBrakeAmt = Math.max(
                st.gpLeftTrigger,
                st.gpLeftStickY > 0.15 ? st.gpLeftStickY : 0
              );

              if (moveFlags.space) {
                isBraking = true;
                if (Math.abs(st.truckSpeed) > 0.25) {
                  const sign = Math.sign(st.truckSpeed);
                  st.truckSpeed -= sign * 30.0 * dt;
                  if (Math.sign(st.truckSpeed) !== sign) st.truckSpeed = 0;
                  targetPitch = -sign * 0.045;
                } else {
                  st.truckSpeed = 0;
                }
              } else if (moveFlags.w || gpThrottleAmt > 0.08) {
                const throttleScale = moveFlags.w ? 1.0 : gpThrottleAmt;
                if (st.truckSpeed < -0.35) {
                  accel = 24.0 * throttleScale;
                  isBraking = true;
                  targetPitch = 0.04;
                } else {
                  const gearTorque = st.truckSpeed < 7.0 ? 13.8 : st.truckSpeed < 14.0 ? 10.2 : 7.8;
                  accel = gearTorque * throttleScale * waterDragFactor;
                  isThrottleOn = true;
                  targetPitch = 0.028 * throttleScale;
                }
                st.truckSpeed = Math.min(maxFwdSpeed, st.truckSpeed + accel * dt);
              } else if (moveFlags.s || gpBrakeAmt > 0.08) {
                const brakeScale = moveFlags.s ? 1.0 : gpBrakeAmt;
                if (st.truckSpeed > 0.35) {
                  accel = -24.5 * brakeScale;
                  isBraking = true;
                  targetPitch = -0.046 * brakeScale;
                } else {
                  accel = -8.4 * brakeScale * waterDragFactor;
                  isThrottleOn = true;
                  targetPitch = -0.022 * brakeScale;
                }
                st.truckSpeed = Math.max(maxRevSpeed, st.truckSpeed + accel * dt);
              } else {
                const rollingDrag = st.isInWater ? 11.0 : 4.4;
                if (Math.abs(st.truckSpeed) > 0.12) {
                  const sign = Math.sign(st.truckSpeed);
                  st.truckSpeed -= sign * rollingDrag * dt;
                  if (Math.sign(st.truckSpeed) !== sign) st.truckSpeed = 0;
                } else {
                  st.truckSpeed = 0;
                }
              }

              const wheelbase = 4.1;
              let angularVel = 0;
              if (Math.abs(st.truckSpeed) > 0.08) {
                angularVel = (st.truckSpeed / wheelbase) * Math.tan(st.truckSteerAngle);
                const headingDelta = angularVel * dt;
                st.truckHeading += headingDelta;
                yaw += headingDelta;
                const yawDiff = Math.atan2(Math.sin(st.truckHeading - yaw), Math.cos(st.truckHeading - yaw));
                yaw += yawDiff * Math.min(1, dt * 3.8);
              }

              isMoving = Math.abs(st.truckSpeed) > 0.1;
              if (isMoving) {
                _fwdVec.set(0, 0, -1).applyAxisAngle(_upAxis, st.truckHeading);
                const stepX = _fwdVec.x * st.truckSpeed * dt;
                const stepZ = _fwdVec.z * st.truckSpeed * dt;
                const nextX = supplyTruckGroup.position.x + stepX;
                const nextZ = supplyTruckGroup.position.z + stepZ;

                const hitX = checkCollision(nextX, supplyTruckGroup.position.z, 1.15);
                const hitZ = checkCollision(supplyTruckGroup.position.x, nextZ, 1.15);

                if (!hitX) supplyTruckGroup.position.x = nextX;
                if (!hitZ) supplyTruckGroup.position.z = nextZ;

                if (hitX && hitZ && Math.abs(st.truckSpeed) > 3.0) {
                  soundEngine.playSfx('punch');
                  triggerGamepadRumble(0.65, 0.9, 190);
                  spawnHitSparks(supplyTruckGroup.position, 0xf59e0b);
                  st.truckSpeed *= -0.25;
                } else if (hitX || hitZ) {
                  st.truckSpeed *= 0.86;
                }
              }

              supplyTruckGroup.position.x = THREE.MathUtils.clamp(supplyTruckGroup.position.x, -230, 230);
              supplyTruckGroup.position.z = THREE.MathUtils.clamp(supplyTruckGroup.position.z, -210, 150);
              supplyTruckGroup.position.y = st.isInWater ? -0.95 : 0;

              const engineVibration = Math.sin(elapsed * (isThrottleOn ? 52 : 34)) * 0.0045;
              const targetRoll = THREE.MathUtils.clamp(-angularVel * 0.055, -0.08, 0.08) + engineVibration;
              st.truckPitchAngle = THREE.MathUtils.damp(st.truckPitchAngle, targetPitch, 7.5, dt);
              st.truckRollAngle = THREE.MathUtils.damp(st.truckRollAngle, targetRoll, 7.5, dt);

              supplyTruckGroup.rotation.set(st.truckPitchAngle, st.truckHeading, st.truckRollAngle);

              supplyTruckFrontPivots.forEach((piv) => {
                piv.rotation.y = st.truckSteerAngle;
              });
              if (supplyTruckSteeringWheel) {
                supplyTruckSteeringWheel.rotation.z = -st.truckSteerAngle * 2.4;
              }
              const wheelSpinDelta = (st.truckSpeed / 0.58) * dt;
              supplyTruckWheels.forEach((wh) => {
                wh.rotation.x -= wheelSpinDelta;
              });

              soundEngine.updateTruckEngine(st.truckSpeed, 22.0, isThrottleOn, isBraking);

              const absSpd = Math.abs(st.truckSpeed);
              if (st.truckSpeed < -0.25) {
                st.truckGearLabel = 'R';
                st.truckRpm = Math.round(850 + (absSpd / 8.5) * 1950);
              } else if (absSpd < 0.25 && !isThrottleOn) {
                st.truckGearLabel = 'N';
                st.truckRpm = 720;
              } else if (absSpd < 7.2) {
                st.truckGearLabel = '1';
                st.truckRpm = Math.round(950 + (absSpd / 7.2) * 2100);
              } else if (absSpd < 14.5) {
                st.truckGearLabel = '2';
                st.truckRpm = Math.round(1150 + ((absSpd - 7.2) / 7.3) * 1950);
              } else {
                st.truckGearLabel = '3';
                st.truckRpm = Math.round(1300 + Math.min(1, (absSpd - 14.5) / 9.5) * 1850);
              }

              truckUiSyncTimer += dt;
              if (truckUiSyncTimer > 0.12) {
                truckUiSyncTimer = 0;
                triggerUiSync();
              }

              const camMode = TRUCK_CAMERA_MODES[st.truckCameraMode] || TRUCK_CAMERA_MODES[1];
              const camHeading = st.truckCameraMode === 0 ? st.truckHeading : yaw;
              _camOffsetVec.copy(camMode.offset).applyAxisAngle(_upAxis, camHeading);
              camera.position.set(
                supplyTruckGroup.position.x + _camOffsetVec.x,
                supplyTruckGroup.position.y + _camOffsetVec.y,
                supplyTruckGroup.position.z + _camOffsetVec.z
              );
              camera.rotation.y = yaw;
              camera.rotation.x = THREE.MathUtils.clamp(
                pitch + camMode.pitchAdd + st.truckPitchAngle * 0.4,
                -Math.PI / 2.2,
                Math.PI / 2.4
              );
            } else if (st.drivingCarriage && st.chapter === 4 && transportVehicle) {
              // ============================================================
              // 2023 KIZILAY AMBULANCE DRIVING PHYSICS (from kizilay__3__745db3a5.html)
              // ============================================================
              const gpThrottle = Math.max(st.gpRightTrigger, st.gpLeftStickY < -0.15 ? -st.gpLeftStickY : 0);
              const gpBrake = Math.max(st.gpLeftTrigger, st.gpLeftStickY > 0.15 ? st.gpLeftStickY : 0);

              const accel = 22.0;
              const maxFwd = 22.0;
              const maxRev = -9.0;

              if (moveFlags.w || gpThrottle > 0.08) {
                st.vehicleSpeed = Math.min(maxFwd, st.vehicleSpeed + accel * dt);
              } else if (moveFlags.s || gpBrake > 0.08) {
                st.vehicleSpeed = Math.max(maxRev, st.vehicleSpeed - accel * dt);
              } else {
                st.vehicleSpeed *= Math.max(0, 1 - 4.5 * dt);
                if (Math.abs(st.vehicleSpeed) < 0.15) st.vehicleSpeed = 0;
              }

              let steerInput = 0;
              if (moveFlags.a) steerInput += 1;
              if (moveFlags.d) steerInput -= 1;
              if (Math.abs(st.gpLeftStickX) > 0.01) steerInput = -st.gpLeftStickX;

              st.vehicleSteer = THREE.MathUtils.lerp(st.vehicleSteer, steerInput, 8 * dt);
              if (Math.abs(st.vehicleSpeed) > 0.3) {
                const dirSign = st.vehicleSpeed >= 0 ? 1 : -1;
                st.vehicleHeading += st.vehicleSteer * 1.9 * dirSign * dt;
              }

              _fwdVec.set(0, 0, -1).applyAxisAngle(_upAxis, st.vehicleHeading);
              const nextX = transportVehicle.position.x + _fwdVec.x * st.vehicleSpeed * dt;
              const nextZ = transportVehicle.position.z + _fwdVec.z * st.vehicleSpeed * dt;

              if (checkCollision(nextX, nextZ, 1.35)) {
                st.vehicleSpeed = 0;
                applyPlayerDamage(100, 'Ambulansla Enkaza Çarparak Ağır Trafik Kazası Yaptınız!');
                return;
              }

              transportVehicle.position.x = THREE.MathUtils.clamp(nextX, -42, 42);
              transportVehicle.position.z = THREE.MathUtils.clamp(nextZ, -68, 72);
              transportVehicle.rotation.y = st.vehicleHeading;

              if (Math.abs(st.vehicleSpeed) > 2.5) {
                for (const l of looterList) {
                  if (
                    l.alive &&
                    Math.hypot(
                      transportVehicle.position.x - l.mesh.position.x,
                      transportVehicle.position.z - l.mesh.position.z
                    ) < 2.6
                  ) {
                    l.alive = false;
                    l.hp = 0;
                    l.mesh.rotation.x = -Math.PI / 2;
                    l.mesh.position.y = 0.25;
                    spawnHitSparks(l.mesh.position, 0xffaa00);
                    soundEngine.playSfx('punch');
                    st.points += 120;
                    triggerUiSync();
                    showToast('Kar Maskeli Yağmacı Ambulansla Etkisiz Hale Getirildi! (+120 TL)', '#2ecc71');
                    const deadRef = l;
                    window.setTimeout(() => {
                      if (gameRef.current.isPlaying && !gameRef.current.isDead && gameRef.current.chapter === 4) {
                        scene.remove(deadRef.mesh);
                        const idx = looterList.indexOf(deadRef);
                        if (idx > -1) looterList.splice(idx, 1);
                        spawnMaskedLooter(Math.floor(Math.random() * 5));
                      }
                    }, 6500);
                  }
                }
              }

              isMoving = Math.abs(st.vehicleSpeed) > 0.3;
              ambulanceWheels.forEach((wh) => {
                wh.rotation.x -= st.vehicleSpeed * dt * 1.4;
              });

              if (sirenLightRed && sirenLightBlue) {
                const blink = Math.sin(elapsed * 18) > 0;
                (sirenLightRed.material as THREE.MeshBasicMaterial).color.setHex(blink ? 0xff0000 : 0x450a0a);
                (sirenLightBlue.material as THREE.MeshBasicMaterial).color.setHex(!blink ? 0x0088ff : 0x172554);
              }

              truckUiSyncTimer += dt;
              if (truckUiSyncTimer > 0.12) {
                truckUiSyncTimer = 0;
                triggerUiSync();
              }

              if (st.ambulanceThirdPerson) {
                const camBack = new THREE.Vector3(0, 4.8, 9.2).applyAxisAngle(_upAxis, st.vehicleHeading);
                camera.position.set(
                  transportVehicle.position.x + camBack.x,
                  transportVehicle.position.y + camBack.y,
                  transportVehicle.position.z + camBack.z
                );
                camera.rotation.y = st.vehicleHeading;
                camera.rotation.x = -0.25;
              } else {
                const cabOffset = new THREE.Vector3(0, 2.2, -2.0).applyAxisAngle(_upAxis, st.vehicleHeading);
                camera.position.set(
                  transportVehicle.position.x + cabOffset.x,
                  transportVehicle.position.y + cabOffset.y,
                  transportVehicle.position.z + cabOffset.z
                );
                yaw = st.vehicleHeading;
                camera.rotation.y = st.vehicleHeading;
                camera.rotation.x = pitch;
              }
            } else {
              const gpL3Sprint = Boolean(navigator.getGamepads?.()?.[0]?.buttons[10]?.pressed);
              let speed = 10.5;
              if (st.drivingCarriage) {
                const eqHorse = st.horses[st.currentHorseId] || st.horses.boz;
                speed = eqHorse.speed * (st.claimedVolunteerIds.includes('vol_serife_baci') ? 1.2 : 1.0);
              } else if ((moveFlags.shift || gpL3Sprint) && !st.isCrouching) {
                speed = 15.0;
              } else if (st.isCrouching) {
                speed = 6.2;
              }

              if (st.isInWater) {
                speed *= 0.45;
              }

              _fwdVec.set(0, 0, -1).applyAxisAngle(_upAxis, yaw);
              _rgtVec.set(1, 0, 0).applyAxisAngle(_upAxis, yaw);
              _moveVec.set(0, 0, 0);
              if (moveFlags.w) _moveVec.add(_fwdVec);
              if (moveFlags.s) _moveVec.sub(_fwdVec);
              if (moveFlags.d) _moveVec.add(_rgtVec);
              if (moveFlags.a) _moveVec.sub(_rgtVec);

              if (Math.abs(st.gpLeftStickX) > 0.01 || Math.abs(st.gpLeftStickY) > 0.01) {
                _moveVec.addScaledVector(_fwdVec, -st.gpLeftStickY);
                _moveVec.addScaledVector(_rgtVec, st.gpLeftStickX);
              }

              const moveLen = _moveVec.length();
              isMoving = moveLen > 0.01;
              if (isMoving) {
                const analogScale = Math.min(1.0, moveLen);
                _moveVec.normalize();
                const nextX = camera.position.x + _moveVec.x * speed * analogScale * dt;
                const nextZ = camera.position.z + _moveVec.z * speed * analogScale * dt;
                if (!checkCollision(nextX, camera.position.z, 0.45)) camera.position.x = nextX;
                if (!checkCollision(camera.position.x, nextZ, 0.45)) camera.position.z = nextZ;
              }
              if (st.chapter === 4) {
                camera.position.x = THREE.MathUtils.clamp(camera.position.x, -42, 42);
                const maxZBound = Math.abs(camera.position.x) < 3.6 ? 93 : 56;
                camera.position.z = THREE.MathUtils.clamp(camera.position.z, -68, maxZBound);
              } else {
                camera.position.x = THREE.MathUtils.clamp(camera.position.x, -230, 230);
                camera.position.z = THREE.MathUtils.clamp(camera.position.z, -210, 150);
              }

              if (st.drivingCarriage && transportVehicle) {
                transportVehicle.position.x = camera.position.x;
                transportVehicle.position.z = camera.position.z;
                transportVehicle.rotation.y = yaw;
                camera.position.y = st.isInWater
                  ? 0.55
                  : 2.38 + (isMoving && st.chapter !== 4 ? Math.abs(Math.sin(elapsed * 11)) * 0.08 : 0);

                if (horsePartsRef) {
                  horsePartsRef.legs.forEach((leg, lIdx) => {
                    leg.rotation.x = isMoving ? Math.sin(lIdx % 2 === 0 ? elapsed * 13 : elapsed * 13 + Math.PI) * 0.55 : 0;
                  });
                  if (isMoving) {
                    hoistSoundTimer += dt;
                    if (hoistSoundTimer > 0.34) {
                      hoistSoundTimer = 0;
                      soundEngine.playSfx('hoof');
                    }
                  }
                }
                camera.rotation.y = yaw;
                camera.rotation.x = pitch;
              } else {
                const targetY = st.isInWater ? 0.38 : st.isCrouching ? 0.95 : 1.8;
                camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 9.0, dt);
                camera.rotation.y = yaw;
                camera.rotation.x = pitch;
              }
            }

            // SEA WATER & DROWNING CHECK ("Denize düştüğümüzde Boğulalım")
            const checkWaterX = st.drivingSupplyTruck && supplyTruckGroup ? supplyTruckGroup.position.x : camera.position.x;
            const checkWaterZ = st.drivingSupplyTruck && supplyTruckGroup ? supplyTruckGroup.position.z : camera.position.z;
            const inSea = isPointInSeaWater(checkWaterX, checkWaterZ, st.chapter, st.kurtulusPhase);
            if (inSea) {
              if (!st.isInWater) {
                st.isInWater = true;
                soundEngine.playSfx('punch');
                showToast(
                  'DENİZE DÜŞTÜNÜZ! Boğulmamak için hemen kıyıya veya köprüye çıkın!',
                  '#ef4444'
                );
              }
              st.oxygenLevel = Math.max(0, st.oxygenLevel - dt * 36);
              st.health = Math.max(0, st.health - dt * 22);
              triggerUiSync();
              if (st.oxygenLevel <= 0 || st.health <= 0) {
                applyPlayerDamage(100, 'Denize düşerek boğulma (Köprüleri ve iskeleleri kullanın)');
              }
            } else if (st.isInWater) {
              st.isInWater = false;
              st.oxygenLevel = 100;
              showToast('Kıyıya çıktınız, boğulma tehlikesi geçti!', '#10b981');
              triggerUiSync();
            } else if (st.oxygenLevel < 100) {
              st.oxygenLevel = Math.min(100, st.oxygenLevel + dt * 40);
            }

            // STEALTH SUSPICION UPDATE (Kurtuluş Savaşı Phase 1)
            if (st.chapter === 5 && st.kurtulusPhase === 1) {
              if (st.isCrouching) {
                st.stealthSuspicion = Math.max(0, st.stealthSuspicion - dt * 16);
              } else if (isMoving && (moveFlags.shift || st.drivingSupplyTruck)) {
                st.stealthSuspicion = Math.min(100, st.stealthSuspicion + dt * 10);
              } else {
                st.stealthSuspicion = Math.max(0, st.stealthSuspicion - dt * 6);
              }
            }

            const wSpec = st.weapons[st.currentWeaponId] || st.weapons.pistol;
            const targetFov =
              st.isAds && st.chapter !== 4 && !st.drivingCarriage && !st.drivingSupplyTruck ? wSpec.zoomFov : 65;
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt);
            camera.updateProjectionMatrix();

            if (st.weaponRecoil > 0) st.weaponRecoil = Math.max(0, st.weaponRecoil - dt * 1.8);
            const targetWx = st.isAds && st.chapter !== 4 ? 0.0 : 0.32;
            const targetWy = st.isAds && st.chapter !== 4 ? -0.16 : -0.28;
            weaponGroup.position.x = THREE.MathUtils.damp(weaponGroup.position.x, targetWx, 14, dt);
            weaponGroup.position.y = THREE.MathUtils.damp(weaponGroup.position.y, targetWy, 14, dt);
            weaponGroup.position.z = -0.55 + st.weaponRecoil * 0.24;

            if (st.chapter === 5 && st.kurtulusPhase === 2 && ankaraWaypointsList.length > 0) {
              const currentWp = ankaraWaypointsList[st.kurtulusPhaseProgress];
              if (currentWp && !currentWp.reached) {
                if (Math.hypot(camera.position.x - currentWp.x, camera.position.z - currentWp.z) < 6.5) {
                  currentWp.reached = true;
                  currentWp.mesh.visible = false;
                  st.savedCount++;
                  st.kurtulusPhaseProgress++;
                  st.points += 150;
                  soundEngine.playSfx('rescued');
                  triggerUiSync();
                  showToast(`${currentWp.name} Geçildi! (+150 Kuruş)`, '#2ecc71');
                  const nextWp = ankaraWaypointsList[st.kurtulusPhaseProgress];
                  if (nextWp) {
                    (nextWp.ring.material as THREE.MeshBasicMaterial).color.setHex(0x2ecc71);
                    (nextWp.pillar.material as THREE.MeshBasicMaterial).color.setHex(0x2ecc71);
                  } else if (st.kurtulusPhaseProgress >= st.kurtulusPhaseTarget) {
                    window.setTimeout(() => advanceKurtulusPhase(), 800);
                  }
                }
              }
            }
          }

          updateInteractionPrompt();

          // 2. Strategic Defense Passive Systems
          const builtAidTents = st.defenseStructures.find((d) => d.id === 'field_aid_tent')?.builtCount || 0;
          if (builtAidTents > 0) {
            fieldAidHealTimer -= dt;
            if (fieldAidHealTimer <= 0) {
              fieldAidHealTimer = 12.0;
              if (st.health < 100) {
                st.health = Math.min(100, st.health + builtAidTents * 8);
                triggerUiSync();
              }
            }
          }

          const builtKrupps = st.defenseStructures.find((d) => d.id === 'krupp_battery')?.builtCount || 0;
          if (builtKrupps > 0 && st.chapter !== 4) {
            kruppBatteriesTimer -= dt;
            if (kruppBatteriesTimer <= 0) {
              kruppBatteriesTimer = Math.max(3.5, 8.5 - builtKrupps * 1.5);
              const aliveEnemies = enemyList.filter((e) => e.alive);
              if (aliveEnemies.length > 0) {
                const targetEn = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                soundEngine.playSfx('cannon');
                spawnHitSparks(targetEn.mesh.position, 0xff9900);
                handleEnemyDamage(targetEn, 2);
              }
            }
          }

          economyTickTimer -= dt;
          if (economyTickTimer <= 0) {
            economyTickTimer = 14.0;
            st.commodities.forEach((c) => {
              const delta = Math.round((Math.random() - 0.44) * 14);
              c.currentPrice = Math.max(30, c.currentPrice + delta);
              c.trend = delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable';
            });
          }

          // 3. AI & Projectiles Update
          if (st.chapter === 4) {
            // 2023 Earthquake Mode: Zabıta Officers vs Masked Looters Melee Combat (from kizilay__3__745db3a5.html)
            const p = camera.position;
            const playerInHospital = p.z > 57 && Math.abs(p.x) < 4.5;

            for (const z of zabitaList) {
              if (!z.alive) continue;
              let closestLooter: (typeof looterList)[0] | null = null;
              let minDist = Infinity;
              for (const l of looterList) {
                if (!l.alive) continue;
                const d = Math.hypot(z.mesh.position.x - l.mesh.position.x, z.mesh.position.z - l.mesh.position.z);
                if (d < minDist) {
                  minDist = d;
                  closestLooter = l;
                }
              }

              if (closestLooter) {
                z.mesh.lookAt(closestLooter.mesh.position.x, 0, closestLooter.mesh.position.z);
                if (minDist > 1.8) {
                  const dx = (closestLooter.mesh.position.x - z.mesh.position.x) / minDist;
                  const dz = (closestLooter.mesh.position.z - z.mesh.position.z) / minDist;
                  z.mesh.position.x += dx * 4.8 * dt;
                  z.mesh.position.z += dz * 4.8 * dt;
                  z.armPivot.rotation.x = Math.sin(clock.getElapsedTime() * 6 + z.swingPhase) * 0.25;
                } else {
                  z.swingPhase += dt * 14;
                  z.armPivot.rotation.x = -Math.PI / 3 + Math.sin(z.swingPhase) * 0.75;
                  z.hitCooldown -= dt;
                  if (z.hitCooldown <= 0) {
                    z.hitCooldown = 1.2 + Math.random() * 0.4;
                    soundEngine.playSfx('punch');
                    spawnHitSparks(
                      closestLooter.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                      0x38bdf8
                    );
                    closestLooter.hp--;
                    if (closestLooter.hp <= 0) {
                      closestLooter.alive = false;
                      closestLooter.mesh.rotation.x = -Math.PI / 2;
                      closestLooter.mesh.position.y = 0.25;
                      st.points += 40;
                      triggerUiSync();
                      showToast('Zabıta ekipleri bir Kar Maskeli Yağmacıyı etkisiz hale getirdi! (+40 TL)', '#38bdf8');
                      const deadLooter = closestLooter;
                      window.setTimeout(() => {
                        if (gameRef.current.isPlaying && !gameRef.current.isDead && gameRef.current.chapter === 4) {
                          scene.remove(deadLooter.mesh);
                          const idx = looterList.indexOf(deadLooter);
                          if (idx > -1) looterList.splice(idx, 1);
                          spawnMaskedLooter(Math.floor(Math.random() * 5));
                        }
                      }, 6500);
                    }
                  }
                }
              }
            }

            for (const l of looterList) {
              if (!l.alive) continue;
              let targetX = p.x;
              let targetZ = p.z;
              let targetZabita: (typeof zabitaList)[0] | null = null;
              let minDist = playerInHospital ? Infinity : Math.hypot(p.x - l.mesh.position.x, p.z - l.mesh.position.z);

              for (const z of zabitaList) {
                if (!z.alive) continue;
                const d = Math.hypot(z.mesh.position.x - l.mesh.position.x, z.mesh.position.z - l.mesh.position.z);
                if (d < minDist) {
                  minDist = d;
                  targetX = z.mesh.position.x;
                  targetZ = z.mesh.position.z;
                  targetZabita = z;
                }
              }

              if (minDist < 60) {
                l.mesh.lookAt(targetX, 0, targetZ);
                if (minDist > 1.8) {
                  const dx = (targetX - l.mesh.position.x) / minDist;
                  const dz = (targetZ - l.mesh.position.z) / minDist;
                  l.mesh.position.x += dx * 4.4 * dt;
                  l.mesh.position.z += dz * 4.4 * dt;
                  l.armPivot.rotation.x = Math.sin(clock.getElapsedTime() * 6 + l.swingPhase) * 0.25;
                } else {
                  l.swingPhase += dt * 14;
                  l.armPivot.rotation.x = -Math.PI / 3 + Math.sin(l.swingPhase) * 0.75;
                  l.hitCooldown -= dt;
                  if (l.hitCooldown <= 0) {
                    l.hitCooldown = 1.4 + Math.random() * 0.5;
                    soundEngine.playSfx('punch');
                    if (targetZabita) {
                      spawnHitSparks(
                        targetZabita.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                        0xef4444
                      );
                      targetZabita.hp--;
                      if (targetZabita.hp <= 0) {
                        targetZabita.alive = false;
                        targetZabita.mesh.rotation.x = -Math.PI / 2;
                        targetZabita.mesh.position.y = 0.25;
                        const deadZ = targetZabita;
                        window.setTimeout(() => {
                          if (gameRef.current.isPlaying && !gameRef.current.isDead && gameRef.current.chapter === 4) {
                            scene.remove(deadZ.mesh);
                            const idx = zabitaList.indexOf(deadZ);
                            if (idx > -1) zabitaList.splice(idx, 1);
                            spawnZabitaOfficer(Math.floor(Math.random() * 4));
                          }
                        }, 7000);
                      }
                    } else if (!playerInHospital) {
                      applyPlayerDamage(12, 'Kar Maskeli Yağmacı saldırısı');
                    }
                  }
                }
              }
            }
          } else {
            const p = camera.position;
            const playerInHospital = hospitalGroup
              ? Math.hypot(p.x - hospitalGroup.position.x, p.z - hospitalGroup.position.z) < 9.5
              : false;

            if (st.chapter === 5 && st.kurtulusPhase === 1 && britishDestroyersList.length > 0) {
              britishDestroyersList.forEach((d, idx) => {
                if (!d.spotterAlive) return;
                d.sweepAngle += dt * (0.65 + idx * 0.2);
                const spotX = Math.sin(d.sweepAngle) * 18;
                const spotZ = d.baseZ + Math.cos(d.sweepAngle * 0.7) * 14;
                d.spotLightGroup.position.set(spotX, 0, spotZ);
                if (Math.hypot(p.x - spotX, p.z - spotZ) < 7.2 && !st.destroyerAlertActive && !playerInHospital) {
                  st.destroyerAlertActive = true;
                  st.destroyerAlertCountdown = 10.0;
                  st.stealthSuspicion = 100;
                  activeSpottingDestroyer = d;
                  (d.spotDisc.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);
                  soundEngine.playSfx('whistle');
                  triggerUiSync();
                  showToast('DİKKAT! İngiliz Muhribi projektörü sizi yakaladı! Gözcüyü 10 sn içinde vurun!', '#ef4444');
                }
              });

              if (st.destroyerAlertActive && activeSpottingDestroyer && activeSpottingDestroyer.spotterAlive) {
                st.destroyerAlertCountdown -= dt;
                triggerUiSync();
                if (st.destroyerAlertCountdown <= 0) {
                  st.destroyerAlertActive = false;
                  (activeSpottingDestroyer.spotDisc.material as THREE.MeshBasicMaterial).color.setHex(0xfef08a);
                  soundEngine.playSfx('cannon');
                  showToast('10 SANİYE DOLDU! İngiliz Takviye Askerleri rıhtıma indi!', '#ff2222');
                  for (let k = 0; k < 3; k++) {
                    spawnEnemySoldier(
                      5,
                      k,
                      22 - k * 5,
                      activeSpottingDestroyer.baseZ + (k - 1) * 4,
                      'İngiliz Bahriye Askeri'
                    );
                  }
                  activeSpottingDestroyer = null;
                }
              }
            }

            if (ataturkHeroObj) {
              const aliveEnemies = enemyList.filter((e) => e.alive);
              if (aliveEnemies.length > 0) {
                const target = aliveEnemies[0];
                ataturkHeroObj.mesh.lookAt(target.mesh.position.x, 0, target.mesh.position.z);
                ataturkHeroObj.shootTimer -= dt;
                if (ataturkHeroObj.shootTimer <= 0) {
                  ataturkHeroObj.shootTimer = 1.5;
                  ataturkHeroObj.flash.visible = true;
                  window.setTimeout(() => {
                    if (ataturkHeroObj) ataturkHeroObj.flash.visible = false;
                  }, 80);
                  soundEngine.playSfx('shot');
                  spawnProjectile(
                    ataturkHeroObj.mesh.position.clone().add(new THREE.Vector3(0, 1.25, 0)),
                    target.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
                    false,
                    'Başkomutan Atatürk',
                    2
                  );
                }
              }
            }

            const wireSlowdown =
              1 + (st.defenseStructures.find((d) => d.id === 'barbed_wire')?.builtCount || 0) * 0.15;

            for (const e of enemyList) {
              if (!e.alive) continue;
              const minDist = Math.hypot(p.x - e.mesh.position.x, p.z - e.mesh.position.z);
              e.mesh.lookAt(p.x, e.mesh.position.y, p.z);
              e.shootTimer -= dt;

              const detectionRange =
                st.chapter === 5 && st.kurtulusPhase === 1
                  ? st.isCrouching && st.stealthSuspicion < 75
                    ? 13.0
                    : 34.0
                  : 68.0;

              if (e.shootTimer <= 0 && minDist < detectionRange && !playerInHospital) {
                e.shootTimer = (2.1 + Math.random()) * wireSlowdown;
                e.flash.visible = true;
                window.setTimeout(() => {
                  e.flash.visible = false;
                }, 65);
                soundEngine.playSfx('shot');
                spawnProjectile(
                  e.mesh.position.clone().add(new THREE.Vector3(0, 1.15, 0)),
                  p.clone(),
                  true,
                  e.name,
                  1
                );
              }
            }

            for (const a of allyList) {
              if (!a.alive) continue;
              const aliveEnemies = enemyList.filter((e) => e.alive);
              if (aliveEnemies.length > 0) {
                const target = aliveEnemies[0];
                a.mesh.lookAt(target.mesh.position.x, a.mesh.position.y, target.mesh.position.z);
                a.shootTimer -= dt;
                if (a.shootTimer <= 0) {
                  a.shootTimer = 2.1 + Math.random();
                  a.flash.visible = true;
                  window.setTimeout(() => {
                    a.flash.visible = false;
                  }, 65);
                  soundEngine.playSfx('shot');
                  spawnProjectile(
                    a.mesh.position.clone().add(new THREE.Vector3(0, 1.15, 0)),
                    target.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
                    false,
                    'Mehmetçik',
                    1
                  );
                }
              }
            }

            for (let i = bulletList.length - 1; i >= 0; i--) {
              const b = bulletList[i];
              b.life -= dt;
              b.mesh.position.addScaledVector(b.vel, dt);
              let hit = false;

              if (checkBulletWallCollision(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z)) {
                spawnHitSparks(b.mesh.position, 0x94a3b8);
                hit = true;
              } else if (b.isEnemy) {
                if (!playerInHospital && Math.hypot(b.mesh.position.x - p.x, b.mesh.position.z - p.z) < 0.75) {
                  applyPlayerDamage(9, `${b.shooterName} ateşi`);
                  hit = true;
                }
              } else {
                for (const d of britishDestroyersList) {
                  if (d.spotterAlive) {
                    d.spotterMesh.getWorldPosition(_spotterWorld);
                    if (
                      Math.hypot(b.mesh.position.x - _spotterWorld.x, b.mesh.position.z - _spotterWorld.z) < 1.6 &&
                      Math.abs(b.mesh.position.y - (_spotterWorld.y + 1.0)) < 1.8
                    ) {
                      eliminateDestroyerSpotter(d);
                      hit = true;
                      break;
                    }
                  }
                }
                if (!hit) {
                  for (const en of enemyList) {
                    if (
                      en.alive &&
                      Math.hypot(b.mesh.position.x - en.mesh.position.x, b.mesh.position.z - en.mesh.position.z) <
                        0.95 &&
                      Math.abs(b.mesh.position.y - 1.1) < 1.2
                    ) {
                      handleEnemyDamage(en, b.damage || 1);
                      hit = true;
                      break;
                    }
                  }
                }
              }

              if (hit || b.life <= 0) {
                scene.remove(b.mesh);
                bulletList.splice(i, 1);
              }
            }
          }

          // 4. Environmental Effects
          if (istanbulTramObj) {
            istanbulTramObj.z += istanbulTramObj.dir * dt * 8.5;
            if (istanbulTramObj.z > 42) istanbulTramObj.dir = -1;
            if (istanbulTramObj.z < -48) istanbulTramObj.dir = 1;
            istanbulTramObj.mesh.position.z = istanbulTramObj.z;
          }

          if (istanbulFerriesList.length > 0) {
            const elapsed = clock.getElapsedTime();
            istanbulFerriesList.forEach((f, idx) => {
              f.mesh.position.z = f.baseZ + Math.sin(elapsed * 0.35 + idx) * 26;
            });
          }

          cloudsList.forEach((cl) => {
            cl.group.position.x += cl.speed * dt;
            if (cl.group.position.x > 180) cl.group.position.x = -180;
          });

          planesList.forEach((pl) => {
            pl.prop.rotation.z += 25 * dt;
            pl.mesh.position.z += pl.speed * pl.dir * dt;
            if (pl.mesh.position.z > 90) {
              pl.mesh.position.z = -120;
              pl.mesh.position.x = (Math.random() - 0.5) * 60;
            }
          });

          if (fireBarrelsList.length > 0) {
            const t = clock.getElapsedTime();
            fireBarrelsList.forEach((fb, idx) => {
              fb.flame.scale.y = 0.85 + Math.sin(t * 14 + idx * 2) * 0.25;
              fb.flame.rotation.y += dt * 4;
              fb.light.intensity = 1.5 + Math.sin(t * 18 + idx) * 0.4;
            });
          }

          for (let i = particlesList.length - 1; i >= 0; i--) {
            const pt = particlesList[i];
            pt.life -= dt;
            pt.mesh.position.addScaledVector(pt.vel, dt);
            if (pt.life <= 0) {
              scene.remove(pt.mesh);
              particlesList.splice(i, 1);
            }
          }

          if (weatherParticles) {
            const pos = weatherParticles.geometry.attributes.position as THREE.BufferAttribute;
            for (let i = 1; i < pos.count * 3; i += 3) {
              pos.array[i] -= 6.5 * dt;
              if (pos.array[i] < 0) pos.array[i] = 40;
            }
            pos.needsUpdate = true;
          }
        }

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundEngine.stopTruckEngine();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  const st = gameRef.current;
  const chp = CHAPTERS_DATA[st.chapter] || CHAPTERS_DATA[1];
  const curName = getCurrencyName(st.chapter);
  const currentWeapon = st.weapons[st.currentWeaponId] || st.weapons.pistol;
  const currentHorse = st.horses[st.currentHorseId] || st.horses.boz;

  const closeModalAndResume = () => {
    setActiveModal(null);
    setActiveVolunteer(null);
    if (st.isPlaying && !st.isDead && !st.isSurgeryMode) {
      st.isPaused = false;
      window.setTimeout(() => {
        try {
          const canvas = canvasContainerRef.current?.querySelector('canvas');
          canvas?.requestPointerLock();
        } catch {
          // Ignore
        }
      }, 80);
    }
    triggerUiSync();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* Underwater Drowning Vignette OR Blood Damage Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-10 transition-all duration-200"
        style={{
          background: st.isInWater ? 'rgba(6, 55, 95, 0.58)' : 'transparent',
          boxShadow: st.isInWater
            ? 'inset 0 0 120px rgba(2, 132, 199, 0.95)'
            : st.health < 100
            ? `inset 0 0 ${(100 - st.health) * 2.1}px rgba(220, 0, 0, 0.82)`
            : 'inset 0 0 0px rgba(220, 0, 0, 0)'
        }}
      />

      {/* Isolated Three.js WebGL Canvas Container */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Crosshair */}
      {!st.isSurgeryMode && activeModal === null && (
        <div id="crosshair" className={st.isAds ? 'ads' : ''} />
      )}

      {/* SEA DROWNING ALERT BANNER */}
      {st.isInWater && !st.isDead && (
        <div
          className="fixed top-28 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-xl border-2 border-sky-300 text-center shadow-2xl"
          style={{ background: 'rgba(7, 42, 74, 0.96)' }}
        >
          <div className="text-sm font-black text-sky-200 tracking-wide">
            DENİZE DÜŞTÜNÜZ! BOĞULMA TEHLİKESİ!
          </div>
          <div className="text-xs text-white mt-1 font-mono-num">
            Kalan Nefes / Oksijen: <strong className="text-amber-300">%{Math.round(st.oxygenLevel)}</strong> · Hemen kıyıya veya köprüye çıkın!
          </div>
        </div>
      )}

      {/* Center Interaction Prompt */}
      {st.interactionPrompt && !st.isSurgeryMode && activeModal === null && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 rounded-md border-2 border-[#d4a843] text-[#d4a843] text-sm font-bold shadow-xl"
          style={{ top: '58%', background: 'rgba(10, 14, 10, 0.95)' }}
        >
          {st.interactionPrompt}
        </div>
      )}

      {/* Top Perimeter HUD */}
      <div className="fixed top-3 left-3 right-3 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="hud-box flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#c8102e">
              <path d="M12 2a10 10 0 1 0 7.07 17.07A8 8 0 1 1 19.07 4.93 9.96 9.96 0 0 0 12 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-[#d4a843]">{chp.orgEra}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c8102e] text-white font-black tracking-wider">
                V1.5
              </span>
            </div>
            <div className="text-xs font-bold text-white">
              {chp.title}
              {st.chapter === 5 && st.kurtulusPhase === 1 ? ` · İlçe: ${currentDistrictName}` : ''}
            </div>
            <div className="text-[11px] text-[#d4a843] mt-0.5">{chp.objective}</div>
          </div>
        </div>

        <div className="hud-box flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400">DURUŞ & AT KAPASİTESİ</span>
            <span className="text-xs font-bold text-sky-400">
              {st.isCrouching ? 'GİZLİ EĞİLME [C]' : 'AYAKTA'} · At: {st.horsePassengersCount}/{currentHorse.capacity}
            </span>
          </div>

          {st.chapter === 5 && st.kurtulusPhase === 1 && (
            <>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">ŞÜPHE SEVİYESİ</span>
                <span
                  className={`text-xs font-mono-num font-bold ${
                    st.stealthSuspicion < 45 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  %{Math.round(st.stealthSuspicion)} ({st.isCrouching ? 'SESSİZ' : 'DİKKAT'})
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">KAMYON YÜKÜ</span>
                <span className="text-xs font-mono-num font-bold text-amber-300">
                  {st.truckLoadedCrates} / {st.kurtulusPhaseTarget} Sandık
                </span>
              </div>
            </>
          )}

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400">SIHHİYE CAN</span>
            <div className="w-20 h-2.5 bg-slate-800 border border-slate-600 rounded overflow-hidden mt-0.5">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${st.health}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400">KURTARILAN / HEDEF</span>
            <span className="text-xs font-mono-num font-bold text-emerald-400">
              {st.savedCount} / {st.targetCount}
            </span>
          </div>

          {st.chapter !== 4 && (
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">MERMİ ({currentWeapon.name.split(' ')[0]})</span>
              <span className="text-xs font-mono-num font-bold text-amber-400">
                {st.isReloading ? 'DOLUYOR...' : `${st.ammo} / ${st.maxAmmo}`}
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400">{curName.toUpperCase()}</span>
            <span className="text-xs font-mono-num font-bold text-[#d4a843]">
              {st.points} {curName}
            </span>
          </div>

          {st.chapter === 5 && st.kurtulusPhase === 1 && (
            <>
              <button
                onClick={() => {
                  st.isPaused = true;
                  try { document.exitPointerLock(); } catch { /* ignore */ }
                  setActiveModal('istanbul_depots');
                }}
                className="btn-action"
                style={{ padding: '5px 10px', fontSize: '11px', background: '#b45309' }}
              >
                <i className="fa-solid fa-warehouse" /> 10 İlçe & Antrepo [J]
              </button>
              <button
                onClick={() => st.summonSupplyTruckNearPlayerFn()}
                className="btn-action"
                style={{ padding: '5px 10px', fontSize: '11px', background: '#0369a1' }}
              >
                <i className="fa-solid fa-truck" /> Kamyonu Çağır [K]
              </button>
            </>
          )}

          <button
            onClick={() => {
              st.isPaused = true;
              try { document.exitPointerLock(); } catch { /* ignore */ }
              setActiveModal('economy');
            }}
            className="btn-action"
            style={{ padding: '5px 10px', fontSize: '11px', background: '#15803d' }}
          >
            <i className="fa-solid fa-coins" /> Borsa [N]
          </button>

          {st.chapter !== 4 ? (
            <button
              onClick={() => {
                st.isPaused = true;
                try { document.exitPointerLock(); } catch { /* ignore */ }
                setActiveModal('plevne_defense');
              }}
              className="btn-action"
              style={{ padding: '5px 10px', fontSize: '11px', background: '#7c2d12' }}
            >
              <i className="fa-solid fa-shield-halved" /> Tabya [F]
            </button>
          ) : (
            <button
              onClick={() => {
                st.isPaused = true;
                try { document.exitPointerLock(); } catch { /* ignore */ }
                setActiveModal('reconstruction');
              }}
              className="btn-action"
              style={{ padding: '5px 10px', fontSize: '11px', background: '#0284c7' }}
            >
              <i className="fa-solid fa-building-flag" /> Yeniden İnşa [B]
            </button>
          )}

          <button
            onClick={() => {
              st.isPaused = true;
              try { document.exitPointerLock(); } catch { /* ignore */ }
              setActiveModal('shop');
            }}
            className="btn-action"
            style={{ padding: '5px 9px', fontSize: '11px', background: '#263326' }}
          >
            <i className="fa-solid fa-gun" /> Silahçı
          </button>

          <button
            onClick={() => {
              st.isPaused = true;
              try { document.exitPointerLock(); } catch { /* ignore */ }
              setActiveModal('horse_stable');
            }}
            className="btn-action"
            style={{ padding: '5px 9px', fontSize: '11px', background: '#422006' }}
          >
            <i className="fa-solid fa-horse" /> Seyis (4-10 Kişilik)
          </button>

          <button
            onClick={() => {
              st.isPaused = true;
              soundEngine.stopTruckEngine();
              try { document.exitPointerLock(); } catch { /* ignore */ }
              setActiveModal('gamepad_help');
            }}
            className="btn-action"
            style={{
              padding: '5px 9px',
              fontSize: '11px',
              background: st.gamepadConnected ? '#059669' : '#1e293b',
              borderColor: st.gamepadConnected ? '#34d399' : undefined
            }}
            title={st.gamepadConnected ? `Bağlı Kontrolcü: ${st.gamepadName}` : 'Kontrolcü Ayarları & Tuş Şeması'}
          >
            <i className="fa-solid fa-gamepad" /> {st.gamepadConnected ? 'Kontrolcü Aktif' : 'Kontrolcü'}
          </button>

          <button
            onClick={() => {
              const muted = soundEngine.toggleMute();
              setIsAudioMuted(muted);
            }}
            className="btn-action"
            style={{ padding: '5px 9px', fontSize: '11px', background: '#1e293b' }}
          >
            <i className={`fa-solid ${isAudioMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
          </button>

          <button
            onClick={() => {
              st.isPaused = true;
              soundEngine.stopTruckEngine();
              try { document.exitPointerLock(); } catch { /* ignore */ }
              setActiveModal('pause');
            }}
            className="btn-action"
            style={{ padding: '5px 9px', fontSize: '11px', background: '#334155' }}
          >
            <i className="fa-solid fa-bars" /> Menü
          </button>
        </div>
      </div>

      {/* British Destroyer 10-Second Spotlight Alert Banner */}
      {st.destroyerAlertActive && (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-6 py-2.5 rounded-lg border-2 border-yellow-400 text-center shadow-2xl"
          style={{ background: 'rgba(153, 27, 27, 0.96)' }}
        >
          <div className="text-xs font-black text-yellow-300 tracking-wide">
            İNGİLİZ MUHRİBİ PROJEKTÖRÜNE YAKALANDINIZ!
          </div>
          <div className="text-xs text-white mt-0.5 font-mono-num">
            Muhripteki Gözcüyü <strong className="text-yellow-300">{st.destroyerAlertCountdown.toFixed(1)}</strong> sn içinde vuramazsanız takviye inecek!
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none w-11/12 max-w-xl">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-2 rounded border text-xs font-medium text-[#f5eedc] shadow-lg text-center"
            style={{ background: 'rgba(12, 16, 12, 0.96)', borderColor: t.color }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* 2023 Kızılay Ambulance Telemetry HUD (from kizilay__3__745db3a5.html) */}
      {st.chapter === 4 && st.drivingCarriage && (
        <div
          className="fixed bottom-14 right-4 z-20 p-3.5 rounded-xl border-2 border-sky-400 shadow-2xl w-72 pointer-events-auto"
          style={{ background: 'rgba(8, 15, 26, 0.95)' }}
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-1.5 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-sky-400">
              KIZILAY AMBULANS TELEMETRİSİ
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">
              SİREN AKTİF
            </span>
          </div>
          <div className="text-lg font-mono-num font-black text-white">
            HIZ: <span className="text-emerald-400">{Math.round(Math.abs(st.vehicleSpeed) * 4.2)}</span> KM/S
          </div>
          <div className="text-xs font-bold mt-1" style={{ color: st.ambulanceHasPatient ? '#2ecc71' : '#f59e0b' }}>
            ARKA KABİN: {st.ambulanceHasPatient ? 'YARALI YÜKLÜ (HASTANEYE SÜR!)' : 'SEDYE BOŞ'}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-300">
              [W/S] Gaz/Fren · [A/D] Direksiyon · [E] İn
            </span>
            <button
              onClick={() => {
                st.ambulanceThirdPerson = !st.ambulanceThirdPerson;
                showToast(
                  st.ambulanceThirdPerson ? 'Kamera: 3. Şahıs Dış Sürüş' : 'Kamera: 1. Şahıs Kokpit İçi',
                  '#38bdf8'
                );
                triggerUiSync();
              }}
              className="btn-action"
              style={{ padding: '4px 8px', fontSize: '10px', background: '#0284c7' }}
            >
              Kamera [V]
            </button>
          </div>
        </div>
      )}

      {/* Mim Mim Supply Truck Telemetry, Speed/RPM/Gear, Progress Bar & Multi-Camera Panel (Kurtuluş Savaşı Phase 1) */}
      {st.chapter === 5 && st.kurtulusPhase === 1 && (
        <div
          className="fixed bottom-14 right-4 z-20 p-3.5 rounded-xl border-2 border-[#d4a843] shadow-2xl w-76 pointer-events-auto"
          style={{ background: 'rgba(11, 15, 19, 0.95)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#d4a843]">
              MİM MİM NAKLİYE KAMYONU
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                st.drivingSupplyTruck ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {st.drivingSupplyTruck ? `VİTES: ${st.truckGearLabel}` : 'PARK HALİNDE'}
            </span>
          </div>

          {/* Speedometer & Engine RPM Indicator */}
          <div className="mt-2 flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-700/80">
            <div>
              <div className="text-[9px] text-slate-400">HIZ (ACKERMANN SÜRÜŞ)</div>
              <div className="text-sm font-mono-num font-black text-sky-300">
                {Math.round(Math.abs(st.truckSpeed) * 3.6)} KM/S{' '}
                {st.truckSpeed < -0.3 ? <span className="text-rose-400 text-[10px]">(GERİ)</span> : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-slate-400">MOTOR DEVRİ</div>
              <div className="text-xs font-mono-num font-bold text-amber-400">
                {st.drivingSupplyTruck ? `${st.truckRpm} RPM` : 'STOP'}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">Yüklenen Sandık:</span>
            <span className="font-mono-num font-bold text-amber-300">
              {st.truckLoadedCrates} / {st.kurtulusPhaseTarget} (%
              {Math.round((st.truckLoadedCrates / Math.max(1, st.kurtulusPhaseTarget)) * 100)})
            </span>
          </div>

          {/* 6-Segment Progress Bar matching the 3D Truck Roof Bar */}
          <div className="mt-1.5 grid grid-cols-6 gap-1 bg-slate-900 p-1 rounded border border-slate-700">
            {Array.from({ length: st.kurtulusPhaseTarget }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2.5 rounded-sm transition-all duration-200 ${
                  idx < st.truckLoadedCrates
                    ? st.truckLoadedCrates >= st.kurtulusPhaseTarget
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="mt-2 text-[11px] text-sky-300 flex items-center justify-between gap-2">
            <span className="truncate">
              <i className="fa-solid fa-video mr-1" />
              {(TRUCK_CAMERA_MODES[st.truckCameraMode] || TRUCK_CAMERA_MODES[1]).name.split(' (')[0]}
            </span>
          </div>

          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => st.cycleTruckCameraFn()}
              className="btn-action flex-1"
              style={{ padding: '5px 8px', fontSize: '10px', background: '#0284c7' }}
            >
              <i className="fa-solid fa-camera-rotate" /> Kamera Açısı [V]
            </button>
            <button
              onClick={() => st.summonSupplyTruckNearPlayerFn()}
              className="btn-action"
              style={{ padding: '5px 8px', fontSize: '10px', background: '#334155' }}
            >
              Çağır [K]
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Unified Bottom Control Dock */}
      {controlsBarVisible && (
        <div
          className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full border border-[#d4a843]/40 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-200 whitespace-nowrap"
          style={{ background: 'rgba(11, 15, 19, 0.95)' }}
        >
          <span><strong className="text-[#d4a843]">WASD / Sol Çubuk</strong> Hareket & Direksiyon</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">C / (B)</strong> Sessiz Eğilme</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">E / (A)</strong> Çal / Yükle / Ambulans</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">K / (LB)</strong> Kamyonu Çağır</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">G / (RB)</strong> Kamyonu Sür</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">V / (Y)</strong> Kamera</span>
          <span>·</span>
          <span><strong className="text-[#d4a843]">H</strong> Gizle</span>
        </div>
      )}

      {/* 3D Surgery & Live ECG Overlay */}
      {st.isSurgeryMode && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-3xl rounded-xl border-2 border-[#d4a843] p-4 flex flex-wrap items-center justify-between gap-4 pointer-events-auto shadow-2xl"
            style={{ background: 'rgba(14, 20, 14, 0.96)' }}
          >
            <div className="flex-1 min-w-[250px]">
              <h3 className="text-sm font-bold text-[#f5eedc]">
                3B SAHRA CERRAHİ VE SEFALİK DAMAR YOLU MERKEZİ
              </h3>
              <p className="text-xs text-[#d4a843] mt-1">
                Fareyi hareket ettirerek şırıngayı hastanın kolundaki PARLAK MAVİ DAMAR üzerine getirin ve SOL TIKLAYIN (Boyundaki Kırmızı Şah Damarına dikkat!).
              </p>
              <div className="mt-1.5 flex gap-4 text-[11px]">
                <span className="text-sky-400">Mavi Bölge: Doğru Damar Yolu</span>
                <span className="text-rose-400">Kırmızı Boyun: Şah Damarı (Ölümcül!)</span>
              </div>
            </div>
            <div className="bg-[#060c10] border border-emerald-500/40 rounded-lg p-2 flex flex-col items-center">
              <div className="flex justify-between w-full text-[10px] text-emerald-400 font-bold mb-1 font-mono-num">
                <span>CANLI EKG</span>
                <span>118 BPM</span>
              </div>
              <canvas ref={ecgCanvasRef} width={160} height={46} className="rounded border border-slate-800" />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => {
                soundEngine.playSfx('surgery_step');
                setActiveModal('pressure');
              }}
              className="btn-action"
              style={{ background: '#1d4ed8', padding: '12px 24px', fontSize: '13px' }}
            >
              <i className="fa-solid fa-hand-holding-medical" /> OTOMATİK DAMAR YOLU AÇ (BAŞHEMŞİRE SAFİYE HÜSEYİN DESTEĞİ)
            </button>
          </div>
        </div>
      )}

      {/* Blood Pressure Gauge Mini-Game Modal */}
      {activeModal === 'pressure' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(6, 9, 13, 0.94)' }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-7 shadow-2xl text-white text-center space-y-5">
            <div className="text-xs font-bold text-emerald-400 tracking-wider">
              HİLÂL-İ AHMER & KIZILAY KAN TRANSFÜZYON MERKEZİ
            </div>
            <h3 className="text-2xl font-bold">Kan Basıncı ve Serum Ayarı</h3>
            <p className="text-xs text-slate-300">
              Şırınga başarıyla damara yerleştirildi! Şimdi kan akış basıncını yeşil hedef aralığında (28 - 72 PSI) tutarak sabitleyin.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono-num">
                <span>Basınç Göstergesi</span>
                <span>{Math.round(pressureVal)} PSI</span>
              </div>
              <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden p-1 border border-slate-700 relative">
                <div className="absolute top-1 bottom-1 left-[28%] right-[28%] bg-emerald-500/30 border border-emerald-500 rounded" />
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    pressureVal >= 28 && pressureVal <= 72 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${pressureVal}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                setActiveModal(null);
                st.completeSurgeryFn();
              }}
              className="btn-action w-full py-3.5 text-sm"
              style={{ background: '#059669' }}
            >
              Basıncı Sabitle ve Tedaviyi Tamamla
            </button>
          </div>
        </div>
      )}

      {/* MAIN MENU MODAL */}
      {activeModal === 'main_menu' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-center shadow-2xl my-auto">
            <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="#c8102e">
                <path d="M12 2a10 10 0 1 0 7.07 17.07A8 8 0 1 1 19.07 4.93 9.96 9.96 0 0 0 12 2z" />
              </svg>
            </div>
            <div className="text-xs font-bold tracking-widest text-[#d4a843]">
              EMKA TECH • RESMÎ SÜRÜM V1.5 — 1868 HİLÂL-İ AHMER’DEN 2023 TÜRK KIZILAYI’NA
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-[#f5eedc] tracking-wider mt-1">
              KIZILAY: ASIRLIK ŞEFKAT V1.5
            </h1>
            <p className="text-xs text-slate-300 mt-1 mb-4">
              Sürüm V1.5 · 2023 Kahramanmaraş Enkaz & Ambulans Haritası · Gizli Antrepo Soygunu & Kamyon · Kontrolcü (Gamepad) Desteği
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left mb-4">
              <div
                onClick={() => {
                  st.pendingChapter = 6;
                  setActiveModal('briefing');
                }}
                className="rounded-lg border border-white/15 bg-[#1b221b] hover:border-[#d4a843] p-3.5 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-lime-400">
                    KURULUŞ DÖNEMİ · 11 HAZİRAN 1868 (MECRUHÎN-İ ASKERİYYE)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    1868 Kuruluş - Dersaadet & Sınır Sıhhiye Tatbikatı
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Dr. Marko Paşa ve Kırımlı Dr. Aziz İdris Bey’in kurduğu ilk seyyar sıhhiye çadırında yaralı neferleri yüksek kapasiteli atlarla kurtar.
                  </div>
                </div>
                <div className="text-xs font-bold text-[#d4a843] mt-2">GÖREV BRİFİNGİNİ AÇ →</div>
              </div>

              <div
                onClick={() => {
                  st.pendingChapter = 1;
                  setActiveModal('briefing');
                }}
                className="rounded-lg border border-white/15 bg-[#1b221b] hover:border-[#d4a843] p-3.5 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-sky-400">
                    1. DÖNEM · 1877 (93 HARBİ STRATEJİK TABYA MÜDAFAASI)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    93 Harbi - Plevne ve Şıpka Tabya Savunması
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    İlk Kırmızı Hilâl sancağı altında Kum Torbası Tabyaları, Krupp Topu ve İleri Sargı Çadırı kurarak Rus hücumlarını durdur!
                  </div>
                </div>
                <div className="text-xs font-bold text-[#d4a843] mt-2">GÖREV BRİFİNGİNİ AÇ →</div>
              </div>

              <div
                onClick={() => {
                  st.pendingChapter = 2;
                  setActiveModal('briefing');
                }}
                className="rounded-lg border border-white/15 bg-[#1b221b] hover:border-[#d4a843] p-3.5 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-amber-400">
                    2. DÖNEM · 1915 (OSMANLI HİLÂL-İ AHMER & GÜLCEMAL GEMİSİ)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Çanakkale - Arıburnu & Ağadere Sargı Yeri
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Atatürk ve Başhemşire Safiye Hüseyin ile omuz omuza çarpış, Gülcemal Hastane Gemisi desteğinde yaralıları yaşat.
                  </div>
                </div>
                <div className="text-xs font-bold text-[#d4a843] mt-2">GÖREV BRİFİNGİNİ AÇ →</div>
              </div>

              <div
                onClick={() => {
                  st.pendingChapter = 4;
                  setActiveModal('briefing');
                }}
                className="rounded-lg border border-white/15 bg-[#1b221b] hover:border-[#d4a843] p-3.5 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-cyan-400">
                    5. DÖNEM · 2023 (AFET KURTARMA & LOJİSTİK — V1.5 HARİTASI)
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    2023 Kahramanmaraş Depremi & Çadır Tedariki
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Yıkılan binaların enkazından kazma ile depremzede kurtar, arkası açık Kızılay Ambulansına yükle, Zabıta ile yağmacıları durdur ve Çadır Satış Merkezini işlet!
                  </div>
                </div>
                <div className="text-xs font-bold text-[#d4a843] mt-2">GÖREV BRİFİNGİNİ AÇ →</div>
              </div>

              <div
                onClick={() => {
                  st.pendingChapter = 5;
                  setActiveModal('briefing');
                }}
                className="md:col-span-2 rounded-lg border border-rose-500/50 bg-[#261717] hover:border-[#d4a843] p-4 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-rose-300">
                    <span>DESTANSI 4 KATMANLI BÖLÜM · GİZLİ ANTREPO SOYGUNU & NAKLİYE KAMYONU (1919–1922)</span>
                    <span className="text-[#d4a843]">SESSİZ SOYGUN [C] · KAMYON YÜKLEME [E]</span>
                  </div>
                  <div className="text-base font-black text-white mt-1">
                    KURTULUŞ SAVAŞI: 10 İLÇEDE MALLARI DİKKAT ÇEKMEDEN ÇAL, KAMYONA YÜKLE & BÜYÜK TAARRUZ
                  </div>
                  <div className="text-xs text-slate-200 mt-1 leading-relaxed">
                    <strong>1. Katman:</strong> 10 ilçedeki büyük antrepolara [C] eğilerek dikkat çekmeden gir, çaldığın malları Mim Mim Nakliye Kamyonuna yükle ·{' '}
                    <strong>2. Katman:</strong> Şerife Bacı ile İstiklal Yolu konvoyu ·{' '}
                    <strong>3. Katman:</strong> Sakarya/Polatlı Sathı Müdafaa ·{' '}
                    <strong>4. Katman:</strong> Atatürk ile Büyük Taarruz!
                  </div>
                </div>
                <div className="text-xs font-bold text-[#d4a843] mt-2">
                  4 KATMANLI KURTULUŞ SAVAŞI BRİFİNGİNİ AÇ →
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setActiveModal('timeline')} className="btn-action" style={{ background: '#c8102e' }}>
                <i className="fa-solid fa-clock-rotate-left" /> Zaman Tüneli (1868–2023)
              </button>
              <button onClick={() => setActiveModal('map')} className="btn-action" style={{ background: '#0c4a6e' }}>
                <i className="fa-solid fa-map-location-dot" /> Tarih Haritası
              </button>
              <button onClick={() => setActiveModal('archive')} className="btn-action" style={{ background: '#1e293b' }}>
                <i className="fa-solid fa-landmark" /> Arşiv Müzesi
              </button>
              <button onClick={() => setActiveModal('economy')} className="btn-action" style={{ background: '#15803d' }}>
                <i className="fa-solid fa-coins" /> Dinamik İkmal Borsası
              </button>
              <button onClick={() => setActiveModal('shop')} className="btn-action" style={{ background: '#263326' }}>
                <i className="fa-solid fa-gun" /> Silahçı (8 Dönem Silahı)
              </button>
              <button onClick={() => setActiveModal('horse_stable')} className="btn-action" style={{ background: '#422006' }}>
                <i className="fa-solid fa-horse" /> Seyis (4-6-8-10 Kişilik Atlar)
              </button>
              <button onClick={() => setActiveModal('gamepad_help')} className="btn-action" style={{ background: '#0369a1' }}>
                <i className="fa-solid fa-gamepad" /> Kontrolcü (Gamepad) Ayarları
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISSION BRIEFING MODAL */}
      {activeModal === 'briefing' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          {(() => {
            const bChp = CHAPTERS_DATA[st.pendingChapter] || CHAPTERS_DATA[1];
            return (
              <div className="w-full max-w-xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-center shadow-2xl">
                <div className="text-xs font-bold text-[#d4a843] tracking-wider">{bChp.orgEra}</div>
                <h2 className="font-display text-2xl font-bold text-white mt-1">{bChp.title}</h2>
                <p className="text-xs text-slate-200 leading-relaxed my-4">{bChp.briefingDesc}</p>
                <div className="bg-[#1b221b] border border-[#d4a843]/30 p-3.5 rounded-lg text-left mb-5">
                  <div className="text-[11px] font-bold text-[#d4a843]">TARİHSEL NOT VE GERÇEKLİK:</div>
                  <div className="text-xs text-slate-200 italic mt-1">“{bChp.briefingFact}”</div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      st.startChapterFn(st.pendingChapter);
                    }}
                    className="btn-action flex-1 py-3.5 text-sm"
                  >
                    <i className="fa-solid fa-play" /> SAHAYA İN VE GÖREVE BAŞLA
                  </button>
                  <button
                    onClick={() => setActiveModal('main_menu')}
                    className="btn-action"
                    style={{ background: '#334155' }}
                  >
                    Geri
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SHOP MODAL */}
      {activeModal === 'shop' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-center shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-2xl font-bold text-[#d4a843]">
              KIZILAY İKMAL, SİLAHÇI & ÇADIR STOK MAĞAZASI
            </h2>
            <p className="text-xs text-slate-300 mt-1 mb-4">
              Mevcut Hazine: <strong className="text-[#d4a843]">{st.points} {curName}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-left">
              {Object.values(st.weapons)
                .filter((w) => w.id !== 'pickaxe')
                .map((w) => (
                  <div
                    key={w.id}
                    className="rounded-lg border p-3.5 flex flex-col justify-between gap-2"
                    style={{
                      background: w.owned ? '#132417' : '#1b221b',
                      borderColor: w.owned ? '#2ecc71' : '#334433'
                    }}
                  >
                    <div>
                      <div className="text-[10px] font-bold text-sky-400">{w.historicalModel}</div>
                      <div className="text-sm font-bold text-white mt-0.5">{w.name}</div>
                      <div className="text-[11px] text-slate-300 mt-1">{w.desc}</div>
                      <div className="text-xs text-[#d4a843] font-mono-num mt-1.5">
                        Hasar: {w.damage} · Şarjör: {w.maxAmmo}
                      </div>
                    </div>
                    {w.owned ? (
                      <button
                        onClick={() => {
                          st.currentWeaponId = w.id;
                          st.ammo = w.maxAmmo;
                          st.maxAmmo = w.maxAmmo;
                          st.rebuildWeaponFn();
                          triggerUiSync();
                        }}
                        className="btn-action w-full"
                        style={{ background: '#15803d' }}
                      >
                        {st.currentWeaponId === w.id ? 'KUŞANILDI' : 'KUŞAN'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (st.points >= w.price) {
                            st.points -= w.price;
                            w.owned = true;
                            st.currentWeaponId = w.id;
                            st.ammo = w.maxAmmo;
                            st.maxAmmo = w.maxAmmo;
                            st.rebuildWeaponFn();
                            showToast(`${w.name} satın alındı!`, '#2ecc71');
                            triggerUiSync();
                          } else {
                            showToast(`Yeterli ${curName} yok!`, '#ff4444');
                          }
                        }}
                        className="btn-action w-full"
                      >
                        {w.price} {curName} Satın Al
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {/* Kızılay Tent Stock Section (for 2023 Tent Sales Center) */}
            <div className="border-t border-white/15 pt-4 mb-5 text-left">
              <div className="text-xs font-bold text-[#d4a843] mb-2">
                KIZILAY AFET ÇADIRI STOK TEDARİKİ (2023 Çadır Satış Merkezi İçin)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['standard', 'winter', 'vip'] as const).map((key) => {
                  const m = TENT_MODELS_CATALOG[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-white/15 bg-[#1b221b] p-3 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{m.name}</div>
                        <div className="text-[11px] text-slate-300 mt-1">{m.desc}</div>
                        <div className="text-xs text-sky-400 font-mono-num mt-1">
                          Stok: <strong>{st.tentsInventory[key]} Adet</strong> · Satış: {m.sellPrice} {curName}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (st.points >= m.buyCost) {
                            st.points -= m.buyCost;
                            st.tentsInventory[key]++;
                            soundEngine.playSfx('pickup');
                            showToast(`1 adet ${m.name} stoğa eklendi!`, '#2ecc71');
                            triggerUiSync();
                          } else {
                            showToast(`Yeterli ${curName} yok! (${m.buyCost} gerekli)`, '#ff4444');
                          }
                        }}
                        className="btn-action w-full text-xs"
                        style={{ background: '#0369a1' }}
                      >
                        +1 Stok Al ({m.buyCost} {curName})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={closeModalAndResume} className="btn-action">
              SAHAYA GERİ DÖN
            </button>
          </div>
        </div>
      )}

      {/* HORSE STABLE MODAL (YÜKSEK KAPASİTELİ 4, 6, 8, 10 KİŞİLİK ATLAR) */}
      {activeModal === 'horse_stable' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-center shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-2xl font-bold text-[#d4a843]">
              HİLÂL-İ AHMER SEYİS & YÜKSEK KAPASİTELİ SIHHİYE ATLARI (4, 6, 8 VE 10 KİŞİLİK)
            </h2>
            <p className="text-xs text-slate-300 mt-1 mb-4">
              Mevcut Hazine: <strong className="text-[#d4a843]">{st.points} {curName}</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-left">
              {Object.values(st.horses).map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border p-4 flex flex-col justify-between gap-2"
                  style={{
                    background: h.owned ? '#132417' : '#1b221b',
                    borderColor: h.owned ? '#2ecc71' : '#334433'
                  }}
                >
                  <div>
                    <div className="text-xs font-bold text-amber-400">{h.breed}</div>
                    <div className="text-base font-bold text-white mt-0.5">{h.name}</div>
                    <div className="text-xs text-slate-300 mt-1">{h.desc}</div>
                    <div className="text-xs text-sky-300 font-mono-num mt-1.5">
                      Sürat: {h.speed} KM/S · Yüksek Kapasite: {h.capacity} Yaralı
                    </div>
                  </div>
                  {h.owned ? (
                    <button
                      onClick={() => {
                        st.currentHorseId = h.id;
                        st.rebuildHorseFn();
                        triggerUiSync();
                      }}
                      className="btn-action w-full"
                      style={{ background: '#d97706' }}
                    >
                      {st.currentHorseId === h.id ? 'AKTİF BİNEK ATINIZ' : 'BU ATI SEÇ & ÇAĞIR'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (st.points >= h.price) {
                          st.points -= h.price;
                          h.owned = true;
                          st.currentHorseId = h.id;
                          st.rebuildHorseFn();
                          showToast(`${h.name} (${h.capacity} Kişilik) satın alındı ve eyerlendi!`, '#2ecc71');
                          triggerUiSync();
                        } else {
                          showToast(`Yeterli ${curName} yok!`, '#ff4444');
                        }
                      }}
                      className="btn-action w-full"
                    >
                      {h.price} {curName} Satın Al
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={closeModalAndResume} className="btn-action">
              SAHAYA GERİ DÖN
            </button>
          </div>
        </div>
      )}

      {/* TENT SALE MODAL (2023 - from kizilay__3__745db3a5.html) */}
      {activeModal === 'tent_sale' && st.currentCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-2xl rounded-xl border border-[#d4a843] bg-[#141814] p-6 text-center shadow-2xl">
            <div className="text-xs font-bold text-[#d4a843]">KIZILAY AFET LOJİSTİK & ÇADIR SATIŞ MERKEZİ</div>
            <h2 className="font-display text-2xl font-bold text-white mt-1">Gelen Müşteri Talebi</h2>
            <div className="bg-[#1b221b] border border-white/15 p-4 rounded-lg text-left my-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-2">
                <span className="text-base font-bold text-[#d4a843]">{st.currentCustomer.name}</span>
                <span
                  className={`text-xs font-mono-num font-bold ${
                    st.currentCustomer.hasEnoughMoney ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Cüzdanı: {st.currentCustomer.wallet} TL {st.currentCustomer.hasEnoughMoney ? '(YETERLİ)' : '(YETERSİZ!)'}
                </span>
              </div>
              <p className="text-sm text-slate-200 italic">{st.currentCustomer.dialogue}</p>
              <div className="text-xs text-sky-400 font-bold mt-2">
                İstediği Model: {TENT_MODELS_CATALOG[st.currentCustomer.wantedModel].name} (
                {TENT_MODELS_CATALOG[st.currentCustomer.wantedModel].sellPrice} TL)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {(['standard', 'winter', 'vip'] as const).map((key) => {
                const m = TENT_MODELS_CATALOG[key];
                return (
                  <div key={key} className="rounded-lg border border-white/15 bg-[#1b221b] p-3 flex flex-col gap-2">
                    <div className="text-xs font-bold text-white">{m.name}</div>
                    <div className="text-xs text-slate-300 font-mono-num">
                      Stok: <strong>{st.tentsInventory[key]}</strong> Adet
                    </div>
                    <div className="text-xs text-[#d4a843] font-bold">{m.sellPrice} TL</div>
                    <button
                      onClick={() => {
                        const c = st.currentCustomer!;
                        if (!c.hasEnoughMoney) {
                          showToast(
                            'Bu müşterinin parası yetmiyor! "PARASI YETMEYENİ REDDET" butonuna basın!',
                            '#ff4444'
                          );
                          return;
                        }
                        if (key !== c.wantedModel) {
                          showToast(
                            `Müşteri ${m.name} istemiyor! İstediği modeli (${TENT_MODELS_CATALOG[c.wantedModel].name}) seçin!`,
                            '#f59e0b'
                          );
                          return;
                        }
                        if (st.tentsInventory[key] <= 0) {
                          showToast(
                            `Stokta ${m.name} kalmadı! Silahçı/Mağazadan stok satın alın!`,
                            '#ff4444'
                          );
                          return;
                        }
                        st.tentsInventory[key]--;
                        st.points += m.sellPrice;
                        st.tentsSold++;
                        soundEngine.playSfx('rescued');
                        showToast(
                          `${c.name} adlı müşteriye ${m.name} satıldı! (+${m.sellPrice} TL)`,
                          '#2ecc71'
                        );
                        st.generateNewCustomerFn();
                        triggerUiSync();
                      }}
                      className="btn-action w-full text-xs"
                    >
                      BU MODELİ SAT
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  const c = st.currentCustomer;
                  if (c && c.hasEnoughMoney) {
                    showToast('DİKKAT: Parası yeten müşteriyi reddettiniz! (-20 TL İtibar Kaybı)', '#ff4444');
                    st.points = Math.max(0, st.points - 20);
                  } else {
                    soundEngine.playSfx('pickup');
                    showToast('Parası yetmeyen müşteri kibarca reddedildi. Sıradaki müşteri alındı.', '#38bdf8');
                  }
                  st.generateNewCustomerFn();
                  triggerUiSync();
                }}
                className="btn-action"
                style={{ background: '#b45309' }}
              >
                PARASI YETMEYENİ REDDET (SIRADAKİ MÜŞTERİ)
              </button>
              <button onClick={closeModalAndResume} className="btn-action" style={{ background: '#334155' }}>
                Masadan Ayrıl [E]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE MODAL */}
      {activeModal === 'timeline' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/15 pb-3 mb-4">
              <div>
                <div className="text-xs font-bold text-[#c8102e]">KRONOLOJİK TARİHÇE (1868 – 2023)</div>
                <h2 className="font-display text-2xl font-bold text-white">Kızılay Zaman Tüneli</h2>
              </div>
              <button onClick={closeModalAndResume} className="btn-action">
                Kapat
              </button>
            </div>
            <div className="space-y-3">
              {KIZILAY_ARCHIVES.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-[#d4a843]/30 bg-[#18130f] p-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs font-bold text-[#d4a843]">
                      {item.year} · {item.officialName}
                    </span>
                    <button
                      onClick={() => {
                        st.pendingChapter = item.chapterId;
                        setActiveModal('briefing');
                      }}
                      className="btn-action text-xs py-1 px-3"
                    >
                      Bu Dönemi Oyna →
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{item.eraTitle}</h3>
                  <p className="text-xs text-slate-300 mt-1">{item.summary}</p>
                  <div className="text-xs text-amber-300/90 italic mt-1">
                    Tarihî Dönüm Noktası: {item.milestone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL MAP MODAL */}
      {activeModal === 'map' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-5xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/15 pb-3 mb-4">
              <div>
                <div className="text-xs font-bold text-[#c8102e]">COĞRAFİ ARŞİV VE SAHA LOJİSTİĞİ</div>
                <h2 className="font-display text-2xl font-bold text-white">
                  Kızılay Etkileşimli Tarihsel Operasyon Haritası
                </h2>
              </div>
              <button onClick={closeModalAndResume} className="btn-action">
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative bg-[#111c26] border-2 border-[#d4a843]/40 rounded-lg min-h-[340px] overflow-hidden">
                <svg viewBox="0 0 1000 650" className="w-full h-full opacity-85">
                  <rect width="1000" height="650" fill="#0d1824" />
                  <path
                    d="M 80 60 L 340 60 L 360 190 L 290 250 L 200 280 L 90 240 Z"
                    fill="#2b2319"
                    stroke="#d4a843"
                    strokeWidth="2"
                  />
                  <path
                    d="M 160 220 L 350 200 L 580 150 L 890 190 L 940 390 L 860 510 L 620 530 L 540 500 L 260 470 L 180 390 Z"
                    fill="#33291d"
                    stroke="#d4a843"
                    strokeWidth="2.5"
                  />
                  <text x="460" y="355" fill="#f5ebd6" opacity="0.25" fontSize="30" fontFamily="Georgia">
                    ANADOLU
                  </text>
                </svg>
                {KIZILAY_MAP_LOCATIONS.map((pin) => {
                  const isSel = selectedMapPin.id === pin.id;
                  return (
                    <button
                      key={pin.id}
                      onClick={() => setSelectedMapPin(pin)}
                      style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full font-bold cursor-pointer flex items-center justify-center transition-transform ${
                        isSel
                          ? 'w-9 h-9 bg-[#c8102e] text-white border-2 border-white scale-110 z-20'
                          : 'w-7 h-7 bg-[#1c1510] text-amber-300 border border-[#d4a843] z-10'
                      }`}
                    >
                      ☪
                    </button>
                  );
                })}
              </div>
              <div className="bg-[#1b1510] border border-[#d4a843]/40 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[#c8102e]">
                    {selectedMapPin.year} · {selectedMapPin.eraName}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedMapPin.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedMapPin.description}</p>
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs font-bold text-[#d4a843]">
                    {selectedMapPin.stats}
                  </div>
                </div>
                <button
                  onClick={() => {
                    st.pendingChapter = selectedMapPin.chapterId;
                    setActiveModal('briefing');
                  }}
                  className="btn-action w-full mt-4"
                >
                  BU CEPHEYE GİT ({selectedMapPin.year}) →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {activeModal === 'archive' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/15 pb-3 mb-4">
              <div>
                <div className="text-xs font-bold text-[#d4a843]">KIZILAY TARİH ARŞİVİ VE KRONOLOJİSİ</div>
                <h2 className="font-display text-2xl font-bold text-white">
                  1868’den Günümüze Hilâl-i Ahmer & Türk Kızılayı
                </h2>
              </div>
              <button onClick={closeModalAndResume} className="btn-action">
                Kapat
              </button>
            </div>
            <div className="space-y-3">
              {KIZILAY_ARCHIVES.map((item, idx) => (
                <div key={idx} className="bg-[#0b0f13] border border-slate-700 p-4 rounded-lg">
                  <div className="flex justify-between text-xs font-bold text-[#d4a843]">
                    <span>{item.year}</span>
                    <span>{item.officialName}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{item.eraTitle}</h3>
                  <p className="text-xs text-slate-300 mt-1">{item.summary}</p>
                  <div className="text-xs text-emerald-400 mt-1">Dönüm Noktası: {item.milestone}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Öncü İsimler: {item.figures.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {activeModal === 'pause' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.92)' }}
        >
          <div className="w-full max-w-sm rounded-xl border border-[#d4a843]/40 bg-[#141814] p-6 text-center shadow-2xl space-y-3">
            <h2 className="font-display text-xl font-bold text-[#d4a843]">OYUN DURAKLATILDI</h2>
            <p className="text-xs text-slate-300">Hazır olduğunuzda göreve veya stratejik panellere dönebilirsiniz.</p>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={closeModalAndResume} className="btn-action w-full">
                GÖREVE DEVAM ET
              </button>
              <button onClick={() => setActiveModal('economy')} className="btn-action w-full" style={{ background: '#15803d' }}>
                DİNAMİK İKMAL BORSASI [N]
              </button>
              <button onClick={() => setActiveModal('shop')} className="btn-action w-full" style={{ background: '#253225' }}>
                LOJİSTİK & SİLAH MAĞAZASI [M]
              </button>
              <button onClick={() => setActiveModal('gamepad_help')} className="btn-action w-full" style={{ background: '#0369a1' }}>
                <i className="fa-solid fa-gamepad" /> KONTROLCÜ (GAMEPAD) ŞEMASI & AYARLARI
              </button>
              <button
                onClick={() => {
                  st.isPlaying = false;
                  setActiveModal('main_menu');
                }}
                className="btn-action w-full"
                style={{ background: '#334155' }}
              >
                ANA MENÜYE DÖN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMEPAD / CONTROLLER SUPPORT & MAPPING MODAL */}
      {activeModal === 'gamepad_help' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="w-full max-w-4xl rounded-xl border-2 border-[#d4a843] bg-[#141814] p-6 text-left shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/15 pb-3 mb-4">
              <div>
                <div className="text-xs font-bold text-sky-400 tracking-wider">
                  XBOX · PLAYSTATION (DUALSENSE / DUALSHOCK) · USB / BLUETOOTH GAMEPAD DESTEĞİ
                </div>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  Oyun Kontrolcüsü (Gamepad) Tuş Şeması ve Hassasiyet Ayarları
                </h2>
              </div>
              <button onClick={closeModalAndResume} className="btn-action">
                Kapat [B / ESC]
              </button>
            </div>

            {/* Connection Status Banner */}
            <div
              className={`p-3.5 rounded-lg border mb-4 flex flex-wrap items-center justify-between gap-3 ${
                st.gamepadConnected
                  ? 'bg-emerald-950/60 border-emerald-500/70'
                  : 'bg-slate-900/90 border-amber-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <i
                  className={`fa-solid fa-gamepad text-2xl ${
                    st.gamepadConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    {st.gamepadConnected
                      ? `BAĞLI KONTROLCÜ: ${st.gamepadName}`
                      : 'KONTROLCÜ ALGILANMADI (Kontrolcünüzü bağlayıp herhangi bir tuşa basın)'}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Sol Çubuk: Hareket & Kamyon Analog Direksiyon · Sağ Çubuk: 360° Kamera & Nişan · RT/LT: Ateş / Analog Gaz & Fren
                  </div>
                </div>
              </div>
              <button
                onClick={() => st.testGamepadRumbleFn()}
                className="btn-action text-xs"
                style={{ background: '#059669', padding: '6px 12px' }}
              >
                <i className="fa-solid fa-bolt" /> Titreşimi Test Et (Rumble)
              </button>
            </div>

            {/* Sensitivity & Haptic Vibration Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-[#1b221b] border border-white/15 rounded-lg p-3.5">
                <div className="flex justify-between text-xs font-bold text-[#d4a843] mb-2">
                  <span>Sağ Analog Kamera Hassasiyeti</span>
                  <span>{st.gamepadSensitivity.toFixed(1)}x</span>
                </div>
                <div className="flex gap-2">
                  {[0.6, 0.8, 1.0, 1.3, 1.6, 2.0].map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        st.gamepadSensitivity = val;
                        triggerUiSync();
                      }}
                      className="btn-action flex-1 text-xs py-1"
                      style={{
                        background: Math.abs(st.gamepadSensitivity - val) < 0.05 ? '#0284c7' : '#334155',
                        padding: '4px 6px'
                      }}
                    >
                      {val.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#1b221b] border border-white/15 rounded-lg p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#d4a843]">Çift Motorlu Titreşim (Dual-Rumble)</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Ateş etme, hasar alma ve kamyon çarpışmalarında titreşim geri bildirimi
                  </div>
                </div>
                <button
                  onClick={() => {
                    st.gamepadVibrationEnabled = !st.gamepadVibrationEnabled;
                    if (st.gamepadVibrationEnabled) st.testGamepadRumbleFn();
                    triggerUiSync();
                  }}
                  className="btn-action text-xs"
                  style={{
                    background: st.gamepadVibrationEnabled ? '#15803d' : '#475569',
                    padding: '6px 14px'
                  }}
                >
                  {st.gamepadVibrationEnabled ? 'AÇIK' : 'KAPALI'}
                </button>
              </div>
            </div>

            {/* Controller Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#1b221b] border border-[#d4a843]/30 rounded-lg p-3.5 space-y-2">
                <div className="font-bold text-[#d4a843] border-b border-white/10 pb-1.5">
                  1. YAYA, CEPHE & GİZLİ SOYGUN
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sol Çubuk:</span>
                  <span className="text-white font-semibold">Yürüme / Koşma (Analog)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sağ Çubuk:</span>
                  <span className="text-white font-semibold">Kamera & Nişan Bakışı</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RT / R2:</span>
                  <span className="text-amber-300 font-semibold">Silah Ateşle / Müdahale</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LT / L2:</span>
                  <span className="text-sky-300 font-semibold">Dürbün / Nişan (ADS)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">A / Çarpı (✕):</span>
                  <span className="text-emerald-400 font-semibold">Etkileşim / Çal / Ata Bin [E]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">B / Yuvarlak (◯):</span>
                  <span className="text-white font-semibold">Sessiz Eğilme (Gizli Mod) [C]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">X / Kare (▢):</span>
                  <span className="text-white font-semibold">Şarjör Doldur [R]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">L3 (Sol Çubuk Bas):</span>
                  <span className="text-white font-semibold">Depar / Hızlı Koş [Shift]</span>
                </div>
              </div>

              <div className="bg-[#1b221b] border border-[#d4a843]/30 rounded-lg p-3.5 space-y-2">
                <div className="font-bold text-sky-400 border-b border-white/10 pb-1.5">
                  2. MİM MİM NAKLİYE KAMYONU SÜRÜŞÜ
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RB / R1:</span>
                  <span className="text-emerald-400 font-semibold">Kamyona Bin / İn [G]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LB / L1:</span>
                  <span className="text-amber-300 font-semibold">Kamyonu Yanına Çağır [K]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sol Çubuk (Sağ/Sol):</span>
                  <span className="text-white font-semibold">Hassas Analog Direksiyon</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RT / R2 (Analog):</span>
                  <span className="text-emerald-400 font-semibold">Gaz Pedalı (İleri Tork)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">LT / L2 (Analog):</span>
                  <span className="text-rose-400 font-semibold">Kampana Fren & Geri Vites</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Y / Üçgen (△) / R3:</span>
                  <span className="text-sky-300 font-semibold">4 Kamera Açısı Değiştir [V]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">A / Çarpı (✕):</span>
                  <span className="text-white font-semibold">Sandık Yükle / Kamyondan İn</span>
                </div>
              </div>

              <div className="bg-[#1b221b] border border-[#d4a843]/30 rounded-lg p-3.5 space-y-2">
                <div className="font-bold text-emerald-400 border-b border-white/10 pb-1.5">
                  3. 3B CERRAHİ & STRATEJİK MENÜLER
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cerrahi Sol/Sağ Çubuk:</span>
                  <span className="text-white font-semibold">3B Şırıngayı Hareket Ettir</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cerrahi A / RT / Y:</span>
                  <span className="text-emerald-400 font-semibold">Damara Gir & Basıncı Sabitle</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">D-Pad Yukarı:</span>
                  <span className="text-amber-300 font-semibold">10 İlçe & Antrepo [J] / İnşa [B]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">D-Pad Sağ:</span>
                  <span className="text-white font-semibold">Dinamik İkmal Borsası [N]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">D-Pad Sol:</span>
                  <span className="text-white font-semibold">Stratejik Tabya Savunması [F]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">D-Pad Aşağı:</span>
                  <span className="text-white font-semibold">Silahçı & Lojistik [M]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Start / Options:</span>
                  <span className="text-white font-semibold">Duraklatma Menüsü</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MARTYR / DROWNING MODAL */}
      {activeModal === 'martyr' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(50, 6, 6, 0.95)' }}
        >
          <div className="w-full max-w-md rounded-xl border border-rose-500 bg-[#141814] p-6 text-center shadow-2xl space-y-4">
            <h2 className="font-display text-2xl font-bold text-rose-400">
              {st.martyrCause.includes('boğul')
                ? 'DENİZE DÜŞEREK BOĞULDUNUZ!'
                : st.chapter === 4
                ? 'GÖREV BAŞARISIZ'
                : 'ŞEHİT DÜŞTÜNÜZ'}
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              {st.martyrCause} nedeniyle görev tamamlanamadı.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setActiveModal(null);
                  st.startChapterFn(st.chapter);
                }}
                className="btn-action"
              >
                AYNI GÖREVDE YENİDEN BAŞLA
              </button>
              <button
                onClick={() => setActiveModal('main_menu')}
                className="btn-action"
                style={{ background: '#334155' }}
              >
                ANA MENÜ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEWSPAPER VICTORY MODAL */}
      {activeModal === 'newspaper' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 7, 9, 0.94)' }}
        >
          <div className="newspaper-paper rounded">
            <div className="text-center border-b-2 border-[#332211] pb-2.5 mb-3">
              <div className="text-[10px] tracking-widest">
                DEVLET-İ ALİYYE / TÜRKİYE CUMHURİYETİ RESMÎ HAVADİSİ
              </div>
              <h1 className="text-3xl font-black tracking-wider text-[#1a1108]">{chp.newsMasthead}</h1>
              <div className="flex justify-between text-[11px] italic border-t border-[#443322] mt-1.5 pt-1">
                <span>{chp.newsDate}</span>
                <span>HİLÂL-İ AHMER & KIZILAY TARİH ARŞİVİ</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-[#8b0000] my-3">{chp.newsHeadline}</h2>
            <p className="text-sm leading-relaxed text-justify">{chp.newsBody}</p>
            <div className="text-center mt-5">
              <button
                onClick={() => {
                  const order = [6, 1, 2, 5, 3, 4];
                  const idx = order.indexOf(st.chapter);
                  if (idx >= 0 && idx < order.length - 1) {
                    st.pendingChapter = order[idx + 1];
                    setActiveModal('briefing');
                  } else {
                    setActiveModal('main_menu');
                  }
                }}
                className="btn-action"
                style={{ background: '#332211', color: '#f5eedc' }}
              >
                SONRAKİ DÖNEME İLERLE →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRATEGIC MODALS */}
      <IstanbulDistrictModal
        isOpen={activeModal === 'istanbul_depots'}
        onClose={closeModalAndResume}
        depots={st.depots}
        unlockedDepotIds={st.unlockedDepotIds}
        currencyName={curName}
        onTeleportTo={(x, z, label, bringTruck) => {
          st.teleportPlayerFn(x, z, bringTruck);
          showToast(
            `${label} önüne Nakliye Kamyonunuzla birlikte intikal edildi! [C] ile eğilerek dikkat çekmeden soyun!`,
            '#38bdf8'
          );
        }}
        onRemoteLockpickDepot={(depotId) => {
          st.unlockDepotInSceneFn(depotId);
        }}
      />

      <DynamicEconomyModal
        isOpen={activeModal === 'economy'}
        onClose={closeModalAndResume}
        commodities={st.commodities}
        points={st.points}
        currencyName={curName}
        warMorale={st.warMorale}
        onDispatchToFront={(id) => {
          const item = st.commodities.find((c) => c.id === id);
          if (!item || item.stock <= 0) return;
          item.stock--;
          st.points += item.currentPrice;
          st.warMorale = Math.min(100, st.warMorale + 3);
          soundEngine.playSfx('rescued');
          showToast(`${item.name} cepheye sevk edildi! (+${item.currentPrice} ${curName})`, '#2ecc71');
          triggerUiSync();
        }}
        onBuyCommodity={(id) => {
          const item = st.commodities.find((c) => c.id === id);
          if (!item) return;
          const cost = Math.round(item.currentPrice * 0.85);
          if (st.points < cost) {
            showToast(`Yeterli ${curName} yok!`, '#ff4444');
            return;
          }
          st.points -= cost;
          item.stock++;
          soundEngine.playSfx('pickup');
          showToast(`${item.name} envantere eklendi!`, '#38bdf8');
          triggerUiSync();
        }}
        onLaunchDonationCampaign={() => {
          st.points += 140;
          st.commodities.forEach((c) => {
            if (c.id === 'bandage' || c.id === 'kinin') c.stock += 2;
          });
          soundEngine.playSfx('rescued');
          showToast(
            `Hilâl-i Ahmer Şefkat Bağışı Kampanyası ile +140 ${curName}, +2 Kinin ve +2 Sargı Balyası toplandı!`,
            '#2ecc71'
          );
          triggerUiSync();
        }}
      />

      <PlevneDefenseModal
        isOpen={activeModal === 'plevne_defense'}
        onClose={closeModalAndResume}
        structures={st.defenseStructures}
        points={st.points}
        currencyName={curName}
        bastionRating={st.bastionRating}
        onBuildStructure={(id) => {
          const struct = st.defenseStructures.find((s) => s.id === id);
          if (!struct || struct.builtCount >= struct.maxCount) return;
          if (st.points < struct.cost) {
            showToast(`Yeterli ${curName} yok!`, '#ff4444');
            return;
          }
          st.points -= struct.cost;
          struct.builtCount++;
          st.bastionRating = Math.min(100, st.bastionRating + 14);
          st.spawnDefenseMeshFn(struct.type);
          soundEngine.playSfx('build');
          showToast(`${struct.name} cepheye inşa edildi! (Tabya Gücü: %${st.bastionRating})`, '#2ecc71');
          triggerUiSync();
        }}
      />

      <ReconstructionModal
        isOpen={activeModal === 'reconstruction'}
        onClose={closeModalAndResume}
        projects={st.reconstructionProjects}
        points={st.points}
        welfareScore={st.welfareScore}
        onUpgradeProject={(id) => {
          const prj = st.reconstructionProjects.find((p) => p.id === id);
          if (!prj || prj.level >= prj.maxLevel) return;
          const discount = st.claimedVolunteerIds.includes('vol_zeynep_emre_2023') ? 0.85 : 1.0;
          const finalCost = Math.round(prj.cost * discount);
          if (st.points < finalCost) {
            showToast('Yeterli TL fonu yok! Çadır satışı veya İkmal Borsası ile fon sağlayın.', '#ff4444');
            return;
          }
          st.points -= finalCost;
          prj.level++;
          st.welfareScore = Math.min(100, st.welfareScore + Math.round(prj.welfareImpact / 2));
          st.savedCount++;
          st.rebuildReconstructionMeshesFn();
          soundEngine.playSfx('build');
          showToast(
            `${prj.name} (Seviye ${prj.level}) inşa edildi! Afetzede Refah Endeksi: %${st.welfareScore}`,
            '#2ecc71'
          );
          triggerUiSync();
        }}
      />

      <VolunteerDialogModal
        volunteer={activeVolunteer}
        onClose={closeModalAndResume}
        onClaimVolunteerSupport={(vol) => {
          if (!st.claimedVolunteerIds.includes(vol.id)) {
            st.claimedVolunteerIds.push(vol.id);
            st.points += 150;
            st.health = 100;
            st.commodities.forEach((c) => {
              c.stock += 2;
            });
            soundEngine.playSfx('rescued');
            showToast(
              `${vol.name} gönüllü desteği aktif edildi! (+150 ${curName}, Tam Can ve +2 Tıbbi Stok)`,
              '#2ecc71'
            );
          } else {
            st.health = 100;
            soundEngine.playSfx('pickup');
            showToast(`${vol.name} sıhhiye çantasından pansuman yaptı (Can %100 yenilendi).`, '#38bdf8');
          }
          closeModalAndResume();
        }}
      />
    </div>
  );
}
