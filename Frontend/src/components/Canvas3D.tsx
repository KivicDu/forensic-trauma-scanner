import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ScaleApplicator } from "../utils/ScaleApplicator";

export interface MeasurementMetrics {
  geodesicLength: number; // mm
  maxWidth: number;       // mm
  maxDepth: number;       // mm
  meanDepth: number;      // mm
  cavityVolume: number;   // mm3
}

interface Props {
  modelPath?: string;
  sceneData?: any;
  sceneUnitScale?: number;
  activeTool?: 'select' | 'ruler' | 'depth' | 'slicer' | 'curvature' | 'calibrate';
  metrics?: MeasurementMetrics;
  showSlicerPlane?: boolean;
  showDepthColormap?: boolean;
  onPointSelect?: (point: { x: number; y: number; z: number; normal?: number[] }) => void;
}

export const Canvas3D: React.FC<Props> = ({
  modelPath,
  sceneData: _sceneData,
  sceneUnitScale = 1.0,
  activeTool: _activeTool = 'ruler',
  metrics = {
    geodesicLength: 42.5,
    maxWidth: 18.2,
    maxDepth: 9.4,
    meanDepth: 5.8,
    cavityVolume: 1840,
  },
  showSlicerPlane = true,
  showDepthColormap = true,
  onPointSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const annotationGroupRef = useRef<THREE.Group | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene with neutral dark charcoal gray background (Medical Chromatic Neutrality: #18181B)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#18181B");
    sceneRef.current = scene;

    // 2. Camera with precise millimeter near/far clipping
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 500);
    camera.position.set(0, 2.5, 4.0);
    cameraRef.current = camera;

    // 3. High-precision WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 80;
    controls.minDistance = 0.2;
    controlsRef.current = controls;

    // 5. Lighting (Medical High-CRI Pure White Lighting, No Color Casts)
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(6, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5f9, 0.6);
    fillLight.position.set(-6, 6, -6);
    scene.add(fillLight);

    // 6. Metric Grid (Subtle millimeter coordinate system)
    const gridHelper = new THREE.GridHelper(10, 50, 0x52525b, 0x27272a);
    gridHelper.position.y = -0.001;
    scene.add(gridHelper);

    // 7. Groups
    const modelGroup = new THREE.Group();
    const annotationGroup = new THREE.Group();
    scene.add(modelGroup);
    scene.add(annotationGroup);
    modelGroupRef.current = modelGroup;
    annotationGroupRef.current = annotationGroup;

    // 8. Raycasting on user click
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
        const normalArr = hit.normal ? [hit.normal.x, hit.normal.y, hit.normal.z] : [0, 1, 0];
        onPointSelect({
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z,
          normal: normalArr,
        });
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load Model or Procedural Realistic Wound Tissue Surface
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const modelGroup = modelGroupRef.current;
    while (modelGroup.children.length > 0) modelGroup.remove(modelGroup.children[0]);

    if (modelPath) {
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          ScaleApplicator.applyMetadataScale(model, modelPath, sceneUnitScale);

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.x -= center.x;
          model.position.z -= center.z;
          modelGroup.add(model);
        },
        undefined,
        (err) => console.error("Error loading model:", err)
      );
    } else {
      // Procedural Anatomical Skin Tissue with Incised Wound
      const width = 2.0;
      const depth = 1.4;
      const geom = new THREE.PlaneGeometry(width, depth, 128, 128);
      geom.rotateX(-Math.PI / 2);

      const posAttr = geom.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);

      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);

        // Wound shape: Elliptical incised cavity along X axis (-0.45 to +0.45m)
        const dx = x / 0.45;
        const dz = z / 0.18;
        const distSq = dx * dx + dz * dz;

        let y = 0.0;
        let r = 0.85, g = 0.65, b = 0.55; // Natural human dermis baseline

        if (distSq < 1.0) {
          // Cavity depth depression (depth = -0.12m equivalent to 12mm normalized)
          const profile = Math.pow(Math.cos((distSq * Math.PI) / 2), 1.5);
          y = -0.12 * profile;

          // Depth colormap: Red/crimson wound bed fading to bruised margin
          if (showDepthColormap) {
            const depthRatio = Math.abs(y) / 0.12;
            r = 0.55 + depthRatio * 0.4;
            g = 0.15 - depthRatio * 0.1;
            b = 0.15 - depthRatio * 0.1;
          }
        }

        posAttr.setY(i, y);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }

      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geom.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.05,
      });

      const skinMesh = new THREE.Mesh(geom, mat);
      skinMesh.receiveShadow = true;
      skinMesh.castShadow = true;
      modelGroup.add(skinMesh);
    }
  }, [modelPath, sceneUnitScale, showDepthColormap]);

  // Render Measurement Calipers, Slicer Plane & 3D Annotations
  useEffect(() => {
    if (!annotationGroupRef.current) return;
    const group = annotationGroupRef.current;
    while (group.children.length > 0) group.remove(group.children[0]);

    // 1. Geodesic Length Caliper (Along wound major axis)
    const lenHalf = (metrics.geodesicLength / 100) / 2; // scaled visual unit
    const p1 = new THREE.Vector3(-lenHalf, 0.005, 0);
    const p2 = new THREE.Vector3(lenHalf, 0.005, 0);

    const lengthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x, 0.01, -0.28),
      new THREE.Vector3(p1.x, 0.01, 0.05),
      new THREE.Vector3(p1.x, 0.01, -0.28),
      new THREE.Vector3(p2.x, 0.01, -0.28),
      new THREE.Vector3(p2.x, 0.01, -0.28),
      new THREE.Vector3(p2.x, 0.01, 0.05),
    ]);
    const lengthLine = new THREE.LineSegments(
      lengthLineGeom,
      new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
    );
    group.add(lengthLine);

    // 2. Width Caliper (Minor axis)
    const wHalf = (metrics.maxWidth / 100) / 2;
    const widthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.55, 0.01, -wHalf),
      new THREE.Vector3(-0.45, 0.01, -wHalf),
      new THREE.Vector3(-0.55, 0.01, -wHalf),
      new THREE.Vector3(-0.55, 0.01, wHalf),
      new THREE.Vector3(-0.55, 0.01, wHalf),
      new THREE.Vector3(-0.45, 0.01, wHalf),
    ]);
    const widthLine = new THREE.LineSegments(
      widthLineGeom,
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    group.add(widthLine);

    // 3. Depth Vertical Caliper Arrow
    const depthVal = -(metrics.maxDepth / 100);
    const depthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.55, 0.01, 0),
      new THREE.Vector3(0.55, depthVal, 0),
      new THREE.Vector3(0.48, 0.01, 0),
      new THREE.Vector3(0.58, 0.01, 0),
      new THREE.Vector3(0.48, depthVal, 0),
      new THREE.Vector3(0.58, depthVal, 0),
    ]);
    const depthLine = new THREE.LineSegments(
      depthLineGeom,
      new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 })
    );
    group.add(depthLine);

    // 4. Landmark Pin Markers on Wound Ends
    const pinGeom = new THREE.SphereGeometry(0.016, 16, 16);
    const pinMatGold = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const pinMatCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const pin1 = new THREE.Mesh(pinGeom, pinMatGold);
    pin1.position.set(-lenHalf, 0.01, 0);
    group.add(pin1);

    const pin2 = new THREE.Mesh(pinGeom, pinMatGold);
    pin2.position.set(lenHalf, 0.01, 0);
    group.add(pin2);

    const pin3 = new THREE.Mesh(pinGeom, pinMatCyan);
    pin3.position.set(0, 0.01, -wHalf);
    group.add(pin3);

    const pin4 = new THREE.Mesh(pinGeom, pinMatCyan);
    pin4.position.set(0, 0.01, wHalf);
    group.add(pin4);

    // 5. Translucent 2D Cross-Section Slicing Plane
    if (showSlicerPlane) {
      const planeGeom = new THREE.PlaneGeometry(0.9, 0.35);
      planeGeom.rotateY(Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const slicePlane = new THREE.Mesh(planeGeom, planeMat);
      slicePlane.position.set(0, -0.05, 0);
      group.add(slicePlane);

      // Yellow slice curve indicator line
      const sliceCurveGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.005, -wHalf),
        new THREE.Vector3(0, depthVal, 0),
        new THREE.Vector3(0, 0.005, wHalf),
      ]);
      const sliceCurve = new THREE.Line(sliceCurveGeom, new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 }));
      group.add(sliceCurve);
    }
  }, [metrics, showSlicerPlane]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating Measurement Tags on Viewport */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-6 z-10">
        <div className="bg-black/80 backdrop-blur-md border border-yellow-400/80 px-3 py-1 rounded text-yellow-300 text-xs font-mono font-bold shadow-lg">
          Geodesic Length: {metrics.geodesicLength.toFixed(1)} mm
        </div>
      </div>

      <div className="absolute bottom-24 left-16 pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-md border border-white/70 px-3 py-1 rounded text-white text-xs font-mono font-bold shadow-lg">
          Width: {metrics.maxWidth.toFixed(1)} mm
        </div>
      </div>

      <div className="absolute bottom-24 right-24 pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-md border border-yellow-400/80 px-3 py-1 rounded text-yellow-300 text-xs font-mono font-bold shadow-lg">
          Max Depth: {metrics.maxDepth.toFixed(1)} mm
        </div>
      </div>

      {/* Right Medical Vertical Colorbar Scale */}
      <div className="absolute top-16 right-4 pointer-events-none flex flex-col items-center gap-1 z-10 bg-black/60 backdrop-blur-md p-2 rounded border border-zinc-700">
        <span className="text-[10px] text-zinc-300 font-mono">0 mm</span>
        <div
          className="w-3 h-32 rounded-sm"
          style={{
            background: "linear-gradient(to bottom, #22c55e 0%, #eab308 30%, #ef4444 70%, #7e22ce 100%)",
          }}
        />
        <span className="text-[10px] text-zinc-300 font-mono">-5 mm</span>
        <span className="text-[10px] text-zinc-400 font-mono text-center">-10 mm</span>
        <span className="text-[10px] text-zinc-400 font-mono">-15 mm</span>
      </div>

      {/* Top-Right 3D ViewCube Gizmo */}
      <div className="absolute top-3 right-24 pointer-events-none flex items-center justify-center w-12 h-12 rounded border border-zinc-700 bg-zinc-900/90 text-[11px] font-bold text-zinc-300 shadow-md">
        <div className="text-center leading-tight">
          TOP<br />
          <span className="text-[9px] text-cyan-400 font-mono">Z-UP</span>
        </div>
      </div>
    </div>
  );
};

export default Canvas3D;