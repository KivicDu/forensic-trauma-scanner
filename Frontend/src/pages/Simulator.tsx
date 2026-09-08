import React, { useState, useRef } from "react";
import Canvas3D, { type MeasurementMetrics } from "../components/Canvas3D";
import { generateForensicTraumaReport } from "../utils/ReportGenerator";
import {
  FolderOpen,
  Ruler,
  Maximize2,
  Minimize2,
  X,
  FileText,
  Spline,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Binary,
  Microscope,
  Scissors,
  Activity,
} from "lucide-react";

export const Simulator: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Case Metadata
  const [caseId, setCaseId] = useState<string>("F2023-047");
  const [subject, setSubject] = useState<string>("J. Doe");
  const [examiner, setExaminer] = useState<string>("Dr. Forensic Pathologist");
  const [scanDate, setScanDate] = useState<string>("2023-11-15");
  const [modelPath, setModelPath] = useState<string>("");
  const [modelName, setModelName] = useState<string>("Anatomical_3D_Skin_Wound_Scan.glb");

  // Measurement State
  const [activeTool, setActiveTool] = useState<
    "select" | "ruler" | "depth" | "slicer" | "curvature" | "calibrate"
  >("ruler");
  const [showSlicerPlane, setShowSlicerPlane] = useState<boolean>(true);
  const [showDepthColormap, setShowDepthColormap] = useState<boolean>(false);
  const [show2DCrossSection, setShow2DCrossSection] = useState<boolean>(true);

  // Metrics Data (Millimeter precision matching approved clinical specifications)
  const [metrics, _setMetrics] = useState<MeasurementMetrics>({
    geodesicLength: 41.2,
    maxWidth: 6.7,
    maxDepth: 14.8,
    meanDepth: 7.2,
    cavityVolume: 2100, // 2.1 cm3
  });

  // Handle Model Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModelName(file.name);
      const url = URL.createObjectURL(file);
      setModelPath(url);
    }
  };

  // Export Forensic PDF Report
  const handleExportPDF = () => {
    generateForensicTraumaReport({
      caseId,
      examiner,
      date: new Date().toLocaleString(),
      modelName,
      metrics,
      marginAnalysis: {
        classification: "Sharp Force Incision",
        confidence: 0.94,
        roughnessRa: 12.5,
        edgeSteepnessDeg: 78.5,
      },
      sha256Hash: "743d4cf891b0ac5b44299dc92e4822fc31d210e01e4a6822",
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans">
      {/* ── 1. NATIVE DESKTOP WINDOW TITLEBAR ── */}
      <div className="h-8 bg-white border-b border-slate-200 flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <div className="w-4 h-4 rounded bg-sky-600 flex items-center justify-center text-[10px] text-white font-bold">
            +
          </div>
          <span>ForensicMorphometry 3D — Trauma Analysis [Case: {caseId}]</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-600 font-mono text-[11px] font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-500" />
            100% Offline Engine
          </span>
          <div className="flex items-center gap-3 text-slate-400">
            <Minimize2 size={13} className="hover:text-slate-700 cursor-pointer" />
            <Maximize2 size={13} className="hover:text-slate-700 cursor-pointer" />
            <X size={13} className="hover:text-red-500 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ── 2. TRADITIONAL CLINICAL DESKTOP MENU BAR ── */}
      <div className="h-7 bg-[#F8FAFC] border-b border-slate-200 flex items-center px-3 gap-6 text-xs text-slate-600 select-none font-medium">
        <span
          className="hover:text-sky-700 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          File
        </span>
        <span className="text-sky-700 border-b-2 border-sky-600 font-semibold cursor-pointer pb-1">
          Home
        </span>
        <span className="hover:text-sky-700 cursor-pointer">Preview</span>
        <span className="hover:text-sky-700 cursor-pointer">Caliper Tools</span>
        <span className="hover:text-sky-700 cursor-pointer">Anatomical Scale</span>
        <span className="hover:text-sky-700 cursor-pointer">Margin Roughness</span>
        <span
          className="hover:text-sky-700 cursor-pointer"
          onClick={handleExportPDF}
        >
          Report
        </span>
        <span className="hover:text-sky-700 cursor-pointer">Help</span>
      </div>

      {/* ── 3. CLINICAL RIBBON ACTION TOOLBAR (Approved Medical Layout) ── */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".glb,.gltf,.obj,.ply,.stl"
            className="hidden"
          />

          {/* Group 1: Import */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-slate-100 text-slate-700 transition"
              title="Load 3D Surface Mesh (.OBJ, .STL, .GLB, .PLY)"
            >
              <FolderOpen size={17} className="text-sky-600" />
              <span className="text-[10px] mt-0.5 font-medium">Import Mesh</span>
            </button>
          </div>

          <div className="h-9 w-px bg-slate-200 mx-1" />

          {/* Group 2: Caliper Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTool("ruler")}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                activeTool === "ruler"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Ruler size={17} className={activeTool === "ruler" ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Caliper Tools</span>
            </button>

            <button
              onClick={() => setActiveTool("depth")}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                activeTool === "depth"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Activity size={17} className={activeTool === "depth" ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Depth Profiler</span>
            </button>
          </div>

          <div className="h-9 w-px bg-slate-200 mx-1" />

          {/* Group 3: Slicing & Culling */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTool("slicer");
                setShowSlicerPlane(!showSlicerPlane);
              }}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                showSlicerPlane
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Spline size={17} className={showSlicerPlane ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Slice Plane</span>
            </button>

            <button
              onClick={() => setShowDepthColormap(!showDepthColormap)}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                showDepthColormap
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Layers size={17} className={showDepthColormap ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Depth Heatmap</span>
            </button>

            <button
              onClick={() => setShow2DCrossSection(!show2DCrossSection)}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                show2DCrossSection
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Activity size={17} className={show2DCrossSection ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">2D Profile</span>
            </button>
          </div>

          <div className="h-9 w-px bg-slate-200 mx-1" />

          {/* Group 4: Forensic Morphometry Analysis */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTool("calibrate")}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                activeTool === "calibrate"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <SlidersHorizontal size={17} className={activeTool === "calibrate" ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Anatomical Scale</span>
            </button>

            <button
              onClick={() => setActiveTool("curvature")}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
                activeTool === "curvature"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 font-semibold"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Microscope size={17} className={activeTool === "curvature" ? "text-sky-600" : "text-slate-600"} />
              <span className="text-[10px] mt-0.5 font-medium">Margin Ra</span>
            </button>
          </div>
        </div>

        {/* Right Ribbon: Report Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <FileText size={15} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── 4. MAIN WORKSTATION 3-COLUMN BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── LEFT PANEL: CASE FILE & SCAN METADATA ── */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-3.5 select-none z-10">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-sky-600" />
                Case File
              </h2>
            </div>

            {/* Case Details Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Case ID
                </label>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 text-xs focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded px-2.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Examiner
                </label>
                <input
                  type="text"
                  value={examiner}
                  onChange={(e) => setExaminer(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded px-2.5 py-1 text-slate-800 text-xs focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Scan Date
                </label>
                <input
                  type="text"
                  value={scanDate}
                  onChange={(e) => setScanDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 text-xs focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Scan Resolution:</span>
                  <span className="font-mono font-semibold text-slate-800">0.05 mm</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Modality:</span>
                  <span className="font-medium text-slate-800">3D Surface Scan</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Mesh Density:</span>
                  <span className="font-mono text-slate-700">142,500 Vertices</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Modality Badge */}
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <Binary size={15} className="text-sky-600" />
            <div>
              <div className="font-semibold text-slate-800">Calibrated Mesh</div>
              <div className="text-[10px] text-slate-500">ABFO Metric Scaled</div>
            </div>
          </div>
        </div>

        {/* ── CENTER: 3D DIAGNOSTIC VIEWPORT + EMBEDDED 2D CROSS-SECTION ── */}
        <div className="flex-1 flex flex-col relative bg-[#EEF2F6] overflow-hidden">
          {/* Active Model Title Tab */}
          <div className="h-7 bg-white/90 border-b border-slate-200 flex items-center px-3 gap-2 text-xs font-medium text-slate-700 z-10">
            <span className="bg-[#EEF2F6] px-2.5 py-0.5 rounded text-sky-800 border border-slate-300 text-[11px] flex items-center gap-1.5">
              Anatomical 3D Skin Wound Scan
              <X size={11} className="hover:text-red-500 cursor-pointer" />
            </span>
          </div>

          {/* 3D WebGL Viewport */}
          <div className="flex-1 relative">
            <Canvas3D
              modelPath={modelPath}
              activeTool={activeTool}
              metrics={metrics}
              showSlicerPlane={showSlicerPlane}
              showDepthColormap={showDepthColormap}
            />
          </div>

          {/* ── 2D CROSS-SECTION DEPTH GRAPH (Docked Clinical Sub-Panel) ── */}
          {show2DCrossSection && (
            <div className="h-40 bg-white border-t border-slate-200 flex flex-col z-10 px-4 py-2 select-none">
              <div className="flex items-center justify-between pb-1 text-xs font-semibold text-slate-700 border-b border-slate-100">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-800">
                  <Spline size={13} className="text-sky-600" />
                  Cross-Sectional Depth Profile (Z vs. Length)
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-slate-500">
                    Cut Plane: Normal X-Z | D_max: -{metrics.maxDepth.toFixed(1)} mm
                  </span>
                  <button
                    onClick={() => setShow2DCrossSection(false)}
                    title="Close Cross-Section"
                    className="hover:text-red-500 text-slate-400 cursor-pointer p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative mt-1 flex items-center justify-center">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 grid grid-rows-3 grid-cols-5 pointer-events-none border-b border-l border-slate-300">
                  <div className="border-t border-r border-slate-100" />
                  <div className="border-t border-r border-slate-100" />
                  <div className="border-t border-r border-slate-100" />
                  <div className="border-t border-r border-slate-100" />
                  <div className="border-t border-r border-slate-100" />
                </div>

                {/* SVG 2D Depth Profile Line */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 80" preserveAspectRatio="none">
                  {/* Skin Baseline (Z = 0) */}
                  <line
                    x1="0"
                    y1="12"
                    x2="500"
                    y2="12"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Wound Deficit Floor Curve */}
                  <path
                    d="M 25 12 C 120 12, 160 70, 250 70 C 340 70, 380 12, 475 12"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                  />
                  {/* Maximum Depth Apex Point */}
                  <circle cx="250" cy="70" r="4.5" fill="#0369a1" />
                </svg>

                {/* Y-Axis Depth Markers */}
                <span className="absolute top-1 left-1.5 text-[9px] font-mono text-slate-500">
                  0 mm (Baseline)
                </span>
                <span className="absolute top-1/2 -translate-y-1/2 left-1.5 text-[9px] font-mono text-slate-400">
                  -5 mm
                </span>
                <span className="absolute bottom-1 left-1.5 text-[9px] font-mono font-semibold text-sky-700">
                  -14.8 mm
                </span>
              </div>

              {/* X-Axis Length Markers */}
              <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-1 px-3">
                <span>0 mm</span>
                <span>10 mm</span>
                <span>20 mm</span>
                <span>30 mm</span>
                <span>40 mm</span>
                <span>50 mm</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: MORPHOMETRY DATA & CLINICAL CLASSIFICATION ── */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between p-4 overflow-y-auto z-10 select-none">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Morphometry Data
              </h2>
              <span className="text-[10px] font-mono text-slate-400">ISO-Forensic</span>
            </div>

            {/* Tabular Morphometry Metrics (Standard Y tế Lâm Sàng) */}
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2.5">
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 text-slate-600 font-medium">Geodesic Length</td>
                    <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                      {metrics.geodesicLength.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 text-slate-600 font-medium">Max Depth</td>
                    <td className="py-1.5 text-right font-mono font-bold text-sky-700">
                      {metrics.maxDepth.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 text-slate-600 font-medium">Avg Width</td>
                    <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                      {metrics.maxWidth.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-1.5 text-slate-600 font-medium">Cavity Volume</td>
                    <td className="py-1.5 text-right font-mono text-slate-800">
                      2.1 cm³
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-600 font-medium">Margin Roughness (Ra)</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-emerald-700">
                      12.5 µm
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Clinical Classification Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                Clinical Classification
              </span>
              <div className="bg-sky-50 border border-sky-200 p-3 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors size={16} className="text-sky-700" />
                  <div>
                    <div className="text-xs font-bold text-sky-950">
                      Sharp Force Trauma
                    </div>
                    <div className="text-[10px] text-sky-700 font-medium">
                      Incised Wound Profile
                    </div>
                  </div>
                </div>
                <span className="bg-white px-2 py-0.5 rounded border border-sky-300 text-[10px] font-mono font-bold text-sky-800">
                  94% Match
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Linear cavity geometry with minimal tissue bridging and clean kerf angle (Ra &lt; 25 µm), consistent with acute blade penetration.
              </p>
            </div>
          </div>

          {/* Bottom Primary Action Button */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleExportPDF}
              className="w-full py-2.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              <FileText size={15} />
              Generate Forensic Report (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulator;