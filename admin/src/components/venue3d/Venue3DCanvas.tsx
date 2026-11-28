'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Lightbulb, RotateCcw, Eye, MapPin } from 'lucide-react';
import { VENUES_DATA, VenueItem, SportCategory } from './venuesData';
import {
  createSoccerGrassTexture,
  createBadmintonTexture,
  createTennisTexture,
  createBasketballTexture,
  createSwimmingPoolTexture,
  createGroundTexture,
} from './threeTextures';

interface Venue3DCanvasProps {
  selectedVenueId: string | null;
  activeSportFilter: 'ALL' | SportCategory;
  onSelectVenue: (venue: VenueItem) => void;
  lightsOn: boolean;
  onToggleLights: () => void;
}

type CameraPreset = 'overview' | 'football' | 'courts' | 'aquatic';

export default function Venue3DCanvas({
  selectedVenueId,
  activeSportFilter,
  onSelectVenue,
  lightsOn,
  onToggleLights,
}: Venue3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');

  const sceneRefs = useRef<{
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    spotlights: THREE.SpotLight[];
    floodHeads: THREE.Mesh[];
    targetPos: THREE.Vector3 | null;
    targetLook: THREE.Vector3 | null;
    venueMeshes: THREE.Mesh[];
  }>({
    spotlights: [],
    floodHeads: [],
    targetPos: null,
    targetLook: null,
    venueMeshes: [],
  });

  // Update floodlights when lightsOn changes
  useEffect(() => {
    sceneRefs.current.spotlights.forEach((spot) => {
      spot.intensity = lightsOn ? 2.4 : 0;
    });
    sceneRefs.current.floodHeads.forEach((head) => {
      const mat = head.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(lightsOn ? 0x9cff93 : 0x000000);
      mat.emissiveIntensity = lightsOn ? 1.5 : 0;
    });
  }, [lightsOn]);

  // Smoothly focus camera when selectedVenueId changes externally
  useEffect(() => {
    if (!selectedVenueId) return;
    const venue = VENUES_DATA.find((v) => v.id === selectedVenueId);
    if (!venue) return;
    sceneRefs.current.targetPos = new THREE.Vector3(venue.position.x, 24, venue.position.z + 30);
    sceneRefs.current.targetLook = new THREE.Vector3(venue.position.x, 0, venue.position.z);
  }, [selectedVenueId]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    if (preset === 'overview') {
      sceneRefs.current.targetPos = new THREE.Vector3(0, 68, 88);
      sceneRefs.current.targetLook = new THREE.Vector3(0, 0, 0);
    } else if (preset === 'football') {
      sceneRefs.current.targetPos = new THREE.Vector3(-38, 34, 48);
      sceneRefs.current.targetLook = new THREE.Vector3(-38, 0, 0);
    } else if (preset === 'courts') {
      sceneRefs.current.targetPos = new THREE.Vector3(0, 38, 56);
      sceneRefs.current.targetLook = new THREE.Vector3(0, 0, 8);
    } else if (preset === 'aquatic') {
      sceneRefs.current.targetPos = new THREE.Vector3(46, 36, 48);
      sceneRefs.current.targetLook = new THREE.Vector3(46, 0, 6);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#06140c');
    scene.fog = new THREE.FogExp2('#06140c', 0.0065);

    const w = container.clientWidth || 1000;
    const h = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
    camera.position.set(0, 68, 88);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 180;
    controls.target.set(0, 0, 0);

    sceneRefs.current.camera = camera;
    sceneRefs.current.controls = controls;
    sceneRefs.current.spotlights = [];
    sceneRefs.current.floodHeads = [];
    sceneRefs.current.venueMeshes = [];

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xd1fae5, 0x06140c, 0.7);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sunLight.position.set(45, 55, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    const d = 65;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 4 Stadium Floodlight Towers
    const lightPositions = [
      { x: -50, z: -24 },
      { x: -14, z: -24 },
      { x: -50, z: 28 },
      { x: -14, z: 28 },
    ];
    lightPositions.forEach((pos) => {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 18, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8, roughness: 0.2 })
      );
      mast.position.set(pos.x, 9, pos.z);
      mast.castShadow = true;
      scene.add(mast);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.2, 1.6),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: lightsOn ? 0x9cff93 : 0x000000,
          emissiveIntensity: lightsOn ? 1.5 : 0,
        })
      );
      head.position.set(pos.x, 18, pos.z);
      scene.add(head);
      sceneRefs.current.floodHeads.push(head);

      const spot = new THREE.SpotLight(0xffffff, lightsOn ? 2.4 : 0, 85, Math.PI / 3.8, 0.35, 1);
      spot.position.set(pos.x, 18, pos.z);
      spot.target.position.set(pos.x > -32 ? -24 : -40, 0, pos.z > 0 ? 16 : -12);
      scene.add(spot.target);
      spot.castShadow = true;
      scene.add(spot);
      sceneRefs.current.spotlights.push(spot);
    });

    // Ground & Walkway
    const groundTex = createGroundTexture();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 130),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.85, metalness: 0.15 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const walkway = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 120),
      new THREE.MeshStandardMaterial({ color: 0x0d2818, roughness: 0.5 })
    );
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.set(-10, 0.02, 0);
    walkway.receiveShadow = true;
    scene.add(walkway);

    // Trees along perimeter
    const createTree = (x: number, z: number) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 2.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c3d2e })
      );
      trunk.position.set(x, 1.25, z);
      trunk.castShadow = true;
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(2, 4.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 })
      );
      foliage.position.set(x, 4.5, z);
      foliage.castShadow = true;
      scene.add(trunk);
      scene.add(foliage);
    };
    for (let i = -70; i <= 70; i += 18) {
      createTree(i, -54);
      createTree(i, 54);
    }
    for (let j = -44; j <= 44; j += 18) {
      createTree(-76, j);
      createTree(76, j);
    }

    // Builders
    const createGoalpostGroup = (goalLineX: number, z: number, facingRight: boolean) => {
      const g = new THREE.Group();
      g.position.set(goalLineX, 0, z);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        metalness: 0.85,
        roughness: 0.25,
      });
      const gw = 3.0;
      const gh = 2.0;
      const gd = 1.0;
      const r = 0.055;
      const backX = (facingRight ? -1 : 1) * gd;

      const addBar = (len: number, x: number, y: number, zPos: number, rotX = 0, rotZ = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), barMat);
        m.position.set(x, y, zPos);
        m.rotation.set(rotX, 0, rotZ);
        m.castShadow = true;
        g.add(m);
      };

      addBar(gh, 0, gh / 2, -gw / 2);
      addBar(gh, 0, gh / 2, gw / 2);
      addBar(gw, 0, gh, 0, Math.PI / 2);
      addBar(gd, backX / 2, gh, -gw / 2, 0, Math.PI / 2);
      addBar(gd, backX / 2, gh, gw / 2, 0, Math.PI / 2);
      addBar(gw, backX, gh, 0, Math.PI / 2);
      addBar(gd, backX / 2, 0.05, -gw / 2, 0, Math.PI / 2);
      addBar(gd, backX / 2, 0.05, gw / 2, 0, Math.PI / 2);
      addBar(gw, backX, 0.05, 0, Math.PI / 2);
      addBar(gh, backX, gh / 2, -gw / 2);
      addBar(gh, backX, gh / 2, gw / 2);
      return g;
    };

    const createFootballVenue = (data: VenueItem) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({ map: createSoccerGrassTexture(), roughness: 0.65 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(data.dimensions.w + 2, 2.5, data.dimensions.h + 2),
        new THREE.MeshStandardMaterial({
          color: 0x334155,
          wireframe: true,
          transparent: true,
          opacity: 0.25,
        })
      );
      fence.position.y = 1.25;
      group.add(fence);

      group.add(createGoalpostGroup(-15.0625, 0, true));
      group.add(createGoalpostGroup(15.0625, 0, false));

      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
      );
      ball.position.set(0, 0.24, 0);
      group.add(ball);

      const sb = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.6, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x00e676 })
      );
      sb.position.set(-data.dimensions.w / 2 - 1, 3.5, -data.dimensions.h / 2);
      group.add(sb);

      scene.add(group);
    };

    const createBadmintonVenue = (data: VenueItem) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({ map: createBadmintonTexture(), roughness: 0.5 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const roof = new THREE.Mesh(
        new THREE.CylinderGeometry(
          data.dimensions.h / 1.8,
          data.dimensions.h / 1.8,
          data.dimensions.w,
          16,
          1,
          true,
          0,
          Math.PI
        ),
        new THREE.MeshStandardMaterial({
          color: 0x059669,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
        })
      );
      roof.rotation.z = Math.PI / 2;
      roof.position.y = 6.5;
      group.add(roof);

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
      [-data.dimensions.w / 2, data.dimensions.w / 2].forEach((px) => {
        [-data.dimensions.h / 2, data.dimensions.h / 2].forEach((pz) => {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 8), pillarMat);
          p.position.set(px, 3.5, pz);
          group.add(p);
        });
      });

      const netMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.76, data.dimensions.h - 2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.75 })
      );
      netMesh.position.set(0, 1.14, 0);
      group.add(netMesh);

      scene.add(group);
    };

    const createTennisVenue = (data: VenueItem) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({ map: createTennisTexture(), roughness: 0.65 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const netMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.0, data.dimensions.h - 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.75 })
      );
      netMesh.position.set(0, 0.5, 0);
      group.add(netMesh);

      const topTape = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, data.dimensions.h - 0.8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      topTape.position.set(0, 1.02, 0);
      group.add(topTape);

      scene.add(group);
    };

    const createBasketballVenue = (data: VenueItem) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({ map: createBasketballTexture(), roughness: 0.65 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.3 });
      [-data.dimensions.w / 2 + 1.2, data.dimensions.w / 2 - 1.2].forEach((xPos, idx) => {
        const isLeft = idx === 0;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.8, 12), poleMat);
        pole.position.set(xPos + (isLeft ? -0.8 : 0.8), 1.9, 0);
        group.add(pole);

        const bb = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 1.3, 2.0),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
        );
        bb.position.set(xPos, 3.4, 0);
        group.add(bb);

        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.04, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xea580c })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(xPos + (isLeft ? 0.35 : -0.35), 3.05, 0);
        group.add(rim);
      });

      scene.add(group);
    };

    const createPoolVenue = (data: VenueItem, isOlympic: boolean) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({
          map: createSwimmingPoolTexture(isOlympic),
          roughness: 0.25,
          metalness: 0.15,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w - 0.2, data.dimensions.h - 0.2),
        new THREE.MeshStandardMaterial({
          color: isOlympic ? 0x0284c7 : 0x06b6d4,
          transparent: true,
          opacity: 0.72,
          roughness: 0.08,
          metalness: 0.35,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.35;
      group.add(water);

      const numLanes = isOlympic ? 8 : 5;
      const laneStep = data.dimensions.w / numLanes;
      for (let i = 1; i < numLanes; i++) {
        const rope = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, data.dimensions.h - 1, 8),
          new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xea580c : 0xfacc15 })
        );
        rope.rotation.x = Math.PI / 2;
        rope.position.set(-data.dimensions.w / 2 + i * laneStep, 0.36, 0);
        group.add(rope);
      }

      scene.add(group);
    };

    const createBoxBuildingVenue = (data: VenueItem, floorColor: number, wallColor: number, trimColor: number) => {
      const group = new THREE.Group();
      group.position.set(data.position.x, 0.05, data.position.z);

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(data.dimensions.w, data.dimensions.h),
        new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.5, metalness: 0.3 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.receiveShadow = true;
      mesh.userData = { venueData: data };
      group.add(mesh);
      sceneRefs.current.venueMeshes.push(mesh);

      const wallMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        transparent: true,
        opacity: 0.25,
      });
      const w = data.dimensions.w;
      const h = data.dimensions.h;
      const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, 4.8, 0.15), wallMat);
      wallN.position.set(0, 2.4, -h / 2);
      const wallS = new THREE.Mesh(new THREE.BoxGeometry(w, 4.8, 0.15), wallMat);
      wallS.position.set(0, 2.4, h / 2);
      const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.8, h), wallMat);
      wallE.position.set(w / 2, 2.4, 0);
      group.add(wallN, wallS, wallE);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, 0.25, h + 0.4),
        new THREE.MeshBasicMaterial({ color: trimColor })
      );
      trim.position.y = 4.9;
      group.add(trim);

      if (data.category === 'GAMING') {
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        for (let dx = -4.5; dx <= 4.5; dx += 3.0) {
          for (let dz = -5.5; dz <= 5.5; dz += 3.8) {
            const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1), deskMat);
            desk.position.set(dx, 0.45, dz);
            const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), screenMat);
            mon.position.set(dx, 1.15, dz - 0.35);
            group.add(desk, mon);
          }
        }
      } else {
        const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        [-3, 0, 3].forEach((_z, idx) => {
          const deck = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 2.4), padMat);
          deck.position.set(idx * 2 - 2, 0.15, 3.5);
          group.add(deck);
        });
      }

      scene.add(group);
    };

    VENUES_DATA.forEach((v) => {
      if (v.category === 'FOOTBALL') createFootballVenue(v);
      else if (v.category === 'BADMINTON') createBadmintonVenue(v);
      else if (v.category === 'TENNIS') createTennisVenue(v);
      else if (v.category === 'BASKETBALL') createBasketballVenue(v);
      else if (v.category === 'POOL') createPoolVenue(v, v.id === 'pool-olympic');
      else if (v.category === 'GYM') createBoxBuildingVenue(v, 0x091b11, 0x10b981, 0x00e676);
      else if (v.category === 'GAMING') createBoxBuildingVenue(v, 0x06140c, 0x047857, 0x38bdf8);
    });

    // Raycaster for clicking 3D courts
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore drag orbits
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(sceneRefs.current.venueMeshes);
      if (hits.length > 0) {
        const venue = hits[0].object.userData.venueData as VenueItem | undefined;
        if (venue) {
          onSelectVenue(venue);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for responsive container
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw > 0 && nh > 0) {
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Smooth camera transition
      if (sceneRefs.current.targetPos && sceneRefs.current.targetLook) {
        camera.position.lerp(sceneRefs.current.targetPos, 0.08);
        controls.target.lerp(sceneRefs.current.targetLook, 0.08);
        if (camera.position.distanceTo(sceneRefs.current.targetPos) < 0.5) {
          sceneRefs.current.targetPos = null;
          sceneRefs.current.targetLook = null;
        }
      }

      // Project 3D coordinates to HTML markers
      const rect = container.getBoundingClientRect();
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;

      VENUES_DATA.forEach((v) => {
        const el = markersRef.current[v.id];
        if (!el) return;
        const pos3d = new THREE.Vector3(v.position.x, 3.8, v.position.z);
        const projected = pos3d.project(camera);
        if (projected.z < 1 && halfW > 0 && halfH > 0) {
          const x = projected.x * halfW + halfW;
          const y = -(projected.y * halfH) + halfH;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.display = 'flex';
        } else {
          el.style.display = 'none';
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[560px] lg:h-[640px] rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[#06140c]">
      {/* Three.js Canvas Mount */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Projected 3D HTML Markers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {VENUES_DATA.map((v) => {
          const isDimmed = activeSportFilter !== 'ALL' && v.category !== activeSportFilter;
          const isSelected = selectedVenueId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              ref={(el) => {
                markersRef.current[v.id] = el;
              }}
              onClick={() => onSelectVenue(v)}
              style={{ transform: 'translate(-50%, -100%)' }}
              className={`pointer-events-auto absolute items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-opacity ${
                isDimmed ? 'opacity-25' : 'opacity-100'
              } ${
                isSelected
                  ? 'bg-[#00E676] text-[#0C0F0C] border-[#9CFF93] font-bold'
                  : 'bg-[#0C0F0C]/90 text-white border-white/15 hover:border-[#9CFF93]'
              }`}
            >
              <span className="text-[11px] font-semibold whitespace-nowrap">{v.shortName}</span>
              <span
                className={`text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                  isSelected
                    ? 'bg-[#0C0F0C] text-[#9CFF93]'
                    : 'bg-[#9CFF93] text-[#0C0F0C]'
                }`}
              >
                {(v.basePrice / 1000).toFixed(0)}k/h
              </span>
            </button>
          );
        })}
      </div>

      {/* Top-Left Camera Presets & Floodlight Control */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0C0F0C]/90 border border-white/15 backdrop-blur-md">
          {(
            [
              { id: 'overview', label: 'Toàn cảnh' },
              { id: 'football', label: 'Khu bóng đá' },
              { id: 'courts', label: 'Sân đấu' },
              { id: 'aquatic', label: 'Hồ bơi & Gym' },
            ] as { id: CameraPreset; label: string }[]
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyCameraPreset(preset.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                activePreset === preset.id
                  ? 'bg-[#9CFF93] text-[#0C0F0C] font-bold'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleLights}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
            lightsOn
              ? 'bg-amber-400 text-[#0C0F0C] border-amber-300'
              : 'bg-[#0C0F0C]/90 text-slate-200 border-white/15 hover:border-amber-400'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{lightsOn ? 'Đèn sân: Bật' : 'Đèn sân: Tắt'}</span>
        </button>

        <button
          type="button"
          onClick={() => applyCameraPreset('overview')}
          title="Đặt lại góc nhìn"
          className="p-2 rounded-xl bg-[#0C0F0C]/90 text-slate-200 border border-white/15 hover:border-[#9CFF93] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Quick Venue Selector */}
      <div className="hidden lg:flex flex-col gap-1.5 absolute bottom-3 left-3 z-20 w-64 max-h-60 overflow-y-auto p-2.5 rounded-2xl bg-[#0C0F0C]/90 border border-white/15 backdrop-blur-md">
        <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#9CFF93]" />
            Chọn nhanh cụm sân
          </span>
          <span className="text-[10px] text-slate-400 font-heading tabular-nums">9 khu</span>
        </div>
        {VENUES_DATA.filter(
          (v) => activeSportFilter === 'ALL' || v.category === activeSportFilter
        ).map((v) => {
          const isSelected = selectedVenueId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVenue(v)}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-[#9CFF93]/20 text-[#9CFF93] border border-[#9CFF93]/40 font-bold'
                  : 'text-slate-200 hover:bg-white/10 border border-transparent'
              }`}
            >
              <span className="truncate">{v.shortName}</span>
              <span className="text-[10px] font-heading font-bold text-[#9CFF93] shrink-0 tabular-nums">
                {(v.basePrice / 1000).toFixed(0)}k
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom-Right Interaction Hint */}
      <div className="hidden sm:flex items-center gap-2 absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-[#0C0F0C]/85 border border-white/10 text-[11px] text-slate-300">
        <Eye className="w-3.5 h-3.5 text-[#9CFF93]" />
        <span>Kéo để xoay - Cuộn để phóng to - Nhấp vào sân để đặt lịch</span>
      </div>
    </div>
  );
}
