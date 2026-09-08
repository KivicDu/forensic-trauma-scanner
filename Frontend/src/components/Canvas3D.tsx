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
    geodesicLength: 41.2,
    maxWidth: 6.7,
    maxDepth: 14.8,
    meanDepth: 7.2,
    cavityVolume: 2100,
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

  // Initialize Three.js Scene with Clinical Light Medical Theme
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene with neutral soft clinical off-white background (#EEF2F6)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#EEF2F6");
    sceneRef.current = scene;

    // 2. Camera with precise millimeter near/far clipping
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.01, 500);
    camera.position.set(0, 2.3, 3.8);
    cameraRef.current = camera;

    // 3. High-precision WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
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

    // 5. Lighting (Medical High-CRI Pure White Lighting, Zero Color Cast)
    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 12, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.65);
    fillLight.position.set(-6, 6, -5);
    scene.add(fillLight);

    // 6. Metric Grid (Subtle medical millimeter coordinate lines)
    const gridHelper = new THREE.GridHelper(10, 50, 0xcbd5e1, 0xe2e8f0);
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
        // Natural human epidermis tone (#E4BAA0 normalized)
        let r = 0.88, g = 0.72, b = 0.63;

        if (distSq < 1.0) {
          // Cavity depth depression (depth = -0.15m equivalent to 14.8mm normalized)
          const profile = Math.pow(Math.cos((distSq * Math.PI) / 2), 1.4);
          y = -0.15 * profile;

          // Realistic forensic wound bed coloration: deep vascular crimson cavity
          const depthRatio = Math.abs(y) / 0.15;
          r = 0.75 - depthRatio * 0.25;
          g = 0.35 - depthRatio * 0.25;
          b = 0.30 - depthRatio * 0.20;
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
        roughness: 0.52,
        metalness: 0.02,
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

    // 1. Geodesic Length Caliper (Medical Steel Blue #0284C7)
    const lenHalf = (metrics.geodesicLength / 100) / 2;
    const p1 = new THREE.Vector3(-lenHalf, 0.006, 0);
    const p2 = new THREE.Vector3(lenHalf, 0.006, 0);

    const lengthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x, 0.01, -0.26),
      new THREE.Vector3(p1.x, 0.01, 0.04),
      new THREE.Vector3(p1.x, 0.01, -0.26),
      new THREE.Vector3(p2.x, 0.01, -0.26),
      new THREE.Vector3(p2.x, 0.01, -0.26),
      new THREE.Vector3(p2.x, 0.01, 0.04),
    ]);
    const lengthLine = new THREE.LineSegments(
      lengthLineGeom,
      new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 })
    );
    group.add(lengthLine);

    // 2. Width Caliper (Clinical Slate #475569)
    const wHalf = (metrics.maxWidth / 100) / 2;
    const widthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.52, 0.01, -wHalf),
      new THREE.Vector3(-0.42, 0.01, -wHalf),
      new THREE.Vector3(-0.52, 0.01, -wHalf),
      new THREE.Vector3(-0.52, 0.01, wHalf),
      new THREE.Vector3(-0.52, 0.01, wHalf),
      new THREE.Vector3(-0.42, 0.01, wHalf),
    ]);
    const widthLine = new THREE.LineSegments(
      widthLineGeom,
      new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 })
    );
    group.add(widthLine);

    // 3. Depth Vertical Caliper (Medical Steel Blue #0369A1)
    const depthVal = -(metrics.maxDepth / 100);
    const depthLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.52, 0.01, 0),
      new THREE.Vector3(0.52, depthVal, 0),
      new THREE.Vector3(0.46, 0.01, 0),
      new THREE.Vector3(0.56, 0.01, 0),
      new THREE.Vector3(0.46, depthVal, 0),
      new THREE.Vector3(0.56, depthVal, 0),
    ]);
    const depthLine = new THREE.LineSegments(
      depthLineGeom,
      new THREE.LineBasicMaterial({ color: 0x0369a1, linewidth: 2 })
    );
    group.add(depthLine);

    // 4. Landmark Pin Markers on Wound Ends
    const pinGeom = new THREE.SphereGeometry(0.014, 16, 16);
    const pinMatBlue = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const pinMatSlate = new THREE.MeshBasicMaterial({ color: 0x475569 });

    const pin1 = new THREE.Mesh(pinGeom, pinMatBlue);
    pin1.position.set(-lenHalf, 0.01, 0);
    group.add(pin1);

    const pin2 = new THREE.Mesh(pinGeom, pinMatBlue);
    pin2.position.set(lenHalf, 0.01, 0);
    group.add(pin2);

    const pin3 = new THREE.Mesh(pinGeom, pinMatSlate);
    pin3.position.set(0, 0.01, -wHalf);
    group.add(pin3);

    const pin4 = new THREE.Mesh(pinGeom, pinMatSlate);
    pin4.position.set(0, 0.01, wHalf);
    group.add(pin4);

    // 5. Translucent 2D Cross-Section Slicing Plane
    if (showSlicerPlane) {
      const planeGeom = new THREE.PlaneGeometry(0.85, 0.35);
      planeGeom.rotateY(Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.20,
        side: THREE.DoubleSide,
      });
      const slicePlane = new THREE.Mesh(planeGeom, planeMat);
      slicePlane.position.set(0, -0.05, 0);
      group.add(slicePlane);

      // Medical blue slice curve indicator line
      const sliceCurveGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.005, -wHalf),
        new THREE.Vector3(0, depthVal, 0),
        new THREE.Vector3(0, 0.005, wHalf),
      ]);
      const sliceCurve = new THREE.Line(
        sliceCurveGeom,
        new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2.5 })
      );
      group.add(sliceCurve);
    }
  }, [metrics, showSlicerPlane]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating Measurement Tags on Viewport (Clean Medical Style) */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-300 shadow-sm px-3 py-1.5 rounded text-xs font-mono text-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sky-700 font-bold">L:</span>
            <span>{metrics.geodesicLength.toFixed(1)} mm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">W:</span>
            <span>{metrics.maxWidth.toFixed(1)} mm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sky-700 font-bold">Depth:</span>
            <span>{metrics.maxDepth.toFixed(1)} mm</span>
          </div>
        </div>
      </div>

      {/* Metric Calibration Scale Bar (Bottom-Right) */}
      <div className="absolute bottom-5 right-5 pointer-events-none flex flex-col items-center gap-1 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded border border-slate-200 shadow-sm">
        <div className="flex h-2 w-28 border border-slate-700">
          <div className="w-1/2 bg-slate-900" />
          <div className="w-1/2 bg-white" />
        </div>
        <span className="text-[10px] font-mono text-slate-700 font-semibold tracking-wider">
          Metric 10 mm
        </span>
      </div>

      {/* Top-Right 3D ViewCube Gizmo (Clean Clinical Style) */}
      <div className="absolute top-4 right-4 pointer-events-none flex items-center justify-center w-12 h-12 rounded border border-slate-300 bg-white/95 text-[11px] font-bold text-slate-700 shadow-sm">
        <div className="text-center leading-tight">
          TOP<br />
          <span className="text-[9px] text-sky-600 font-mono">Z-UP</span>
        </div>
      </div>

      {/* Optional Right Medical Vertical Colorbar Scale */}
      {showDepthColormap && (
        <div className="absolute top-20 right-4 pointer-events-none flex flex-col items-center gap-1 z-10 bg-white/95 backdrop-blur-sm p-2 rounded border border-slate-200 shadow-sm">
          <span className="text-[9px] text-slate-600 font-mono">0 mm</span>
          <div
            className="w-2.5 h-24 rounded-sm border border-slate-200"
            style={{
              background: "linear-gradient(to bottom, #e4baa0 0%, #b91c1c 100%)",
            }}
          />
          <span className="text-[9px] text-slate-600 font-mono">-{metrics.maxDepth.toFixed(0)} mm</span>
        </div>
      )}
    </div>
  );
};

export default Canvas3D;