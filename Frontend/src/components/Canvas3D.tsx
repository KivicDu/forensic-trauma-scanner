import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ScaleApplicator } from "../utils/ScaleApplicator";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeatPt {
  position: number[];
  normal?: number[];
  score?: number;
  riskTier?: string;
}

interface HeatObj {
  objectId: string;
  objectName: string;
  boundingBox?: any;
  collisions?: HeatPt[];
  collisionPositions?: number[][];
  maxInjuryScore: number;
  heatColor: number[];
  intensity: number;
}

interface Props {
  modelPath?: string;
  sceneData?: any;
  sceneUnitScale?: number;
  simulationPlayback?: any;
  heatmapData?: HeatObj[] | null;
  showHeatmap?: boolean;
  liveAgentPositions?: any;
  selectedAgentId?: number | null;
  onPlaybackUpdate?: (info: { progress: number; action: string; time: number }) => void;
  playbackPaused?: boolean;
  playbackSeek?: number | null;
  enableFloorSnap?: boolean;
  showBoundingBoxes?: boolean;
  isBabyView?: boolean;
  onPointSelect?: (point: { x: number; y: number; z: number; objectName?: string }) => void;
}

export const Canvas3D: React.FC<Props> = ({
  modelPath,
  sceneData,
  sceneUnitScale = 1.0,
  heatmapData,
  showHeatmap = false,
  showBoundingBoxes = false,
  onPointSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const heatmapGroupRef = useRef<THREE.Group | null>(null);
  const bboxGroupRef = useRef<THREE.Group | null>(null);

  // Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene with dark forensic backdrop
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080D1A");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 1000);
    camera.position.set(0, 3, 6);
    cameraRef.current = camera;

    // Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controlsRef.current = controls;

    // Lighting (Medical / Scientific precision)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.6);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 12, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Subtle fill light
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    fillLight.position.set(-6, 4, -5);
    scene.add(fillLight);

    // Ground Grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Groups for modular rendering
    const modelGroup = new THREE.Group();
    const heatmapGroup = new THREE.Group();
    const bboxGroup = new THREE.Group();
    scene.add(modelGroup);
    scene.add(heatmapGroup);
    scene.add(bboxGroup);

    modelGroupRef.current = modelGroup;
    heatmapGroupRef.current = heatmapGroup;
    bboxGroupRef.current = bboxGroup;

    // Raycaster for surface picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      if (!container || !onPointSelect) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(modelGroup.children, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        onPointSelect({
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z,
          objectName: hit.object.name || hit.object.parent?.name || "Surface",
        });
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load 3D Model
  useEffect(() => {
    if (!modelPath || !modelGroupRef.current) return;
    const modelGroup = modelGroupRef.current;

    // Clear old model
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0];
      modelGroup.remove(child);
    }

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Apply scale normalization from metadata
        ScaleApplicator.applyMetadataScale(model, modelPath, sceneUnitScale);

        // Enable shadows and enhance materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });

        // Center scene bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;

        modelGroup.add(model);

        // Adjust camera to frame model
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.set(maxDim * 1.2, maxDim * 1.0, maxDim * 1.5);
          controlsRef.current.target.set(0, size.y / 3, 0);
          controlsRef.current.update();
        }
      },
      undefined,
      (error) => {
        console.error("Error loading 3D model:", error);
      }
    );
  }, [modelPath, sceneUnitScale]);

  // Render Bounding Boxes
  useEffect(() => {
    if (!bboxGroupRef.current) return;
    const group = bboxGroupRef.current;
    while (group.children.length > 0) group.remove(group.children[0]);

    if (!showBoundingBoxes || !sceneData?.objects) return;

    sceneData.objects.forEach((obj: any) => {
      if (!obj.boundingBox) return;
      const { min, max } = obj.boundingBox;
      const size = new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
      const center = new THREE.Vector3(
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2
      );

      const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const edges = new THREE.EdgesGeometry(geom);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
      );
      line.position.copy(center);
      group.add(line);
    });
  }, [showBoundingBoxes, sceneData]);

  // Render Forensic Heatmap & Injury Point Markers
  useEffect(() => {
    if (!heatmapGroupRef.current) return;
    const group = heatmapGroupRef.current;
    while (group.children.length > 0) group.remove(group.children[0]);

    if (!showHeatmap || !heatmapData) return;

    heatmapData.forEach((obj) => {
      const positions = obj.collisionPositions || [];
      const colorArr = obj.heatColor || [1, 0, 0];
      const color = new THREE.Color(colorArr[0], colorArr[1], colorArr[2]);

      positions.forEach((pos) => {
        if (!Array.isArray(pos) || pos.length < 3) return;

        // Marker sphere for impact / hazard point
        const geom = new THREE.SphereGeometry(0.08, 16, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.4,
          roughness: 0.3,
        });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.set(pos[0], pos[1], pos[2]);
        group.add(sphere);

        // Ground target ring
        const ringGeom = new THREE.RingGeometry(0.1, 0.15, 24);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(pos[0], 0.02, pos[2]);
        group.add(ring);
      });
    });
  }, [showHeatmap, heatmapData]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
};

export default Canvas3D;