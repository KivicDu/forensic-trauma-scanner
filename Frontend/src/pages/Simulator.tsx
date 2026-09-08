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
  ArrowDownToLine,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

export const Simulator: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Case Metadata
  const [caseId, setCaseId] = useState<string>("000100001");
  const [examiner, setExaminer] = useState<string>("Dr. Forensic Pathologist");
  const [modelPath, setModelPath] = useState<string>("");
  const [modelName, setModelName] = useState<string>("Incision_Scan_Sample.glb");

  // Measurement State
  const [activeTool, setActiveTool] = useState<
    "select" | "ruler" | "depth" | "slicer" | "curvature" | "calibrate"
  >("ruler");
  const [showSlicerPlane, setShowSlicerPlane] = useState<boolean>(true);
  const [showDepthColormap, setShowDepthColormap] = useState<boolean>(true);
  const [show2DCrossSection, setShow2DCrossSection] = useState<boolean>(true);

  // Metrics Data (Millimeter precision)
  const [metrics, _setMetrics] = useState<MeasurementMetrics>({
    geodesicLength: 42.5,
    maxWidth: 18.2,
    maxDepth: 9.4,
    meanDepth: 5.8,
    cavityVolume: 1840,
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
        confidence: 0.92,
        roughnessRa: 1.45,
        edgeSteepnessDeg: 78.5,
      },
      sha256Hash: "743d4cf891b0ac5b44299dc92e4822fc31d210e01e4a6822",
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121214] text-zinc-200 overflow-hidden font-sans">
      {/* ── 1. NATIVE DESKTOP WINDOW TITLEBAR ── */}
      <div className="h-8 bg-[#18181B] border-b border-zinc-800 flex items-center justify-between px-3 select-none">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <div className="w-3.5 h-3.5 rounded bg-teal-600 flex items-center justify-center text-[10px] text-white font-bold">
            P
          </div>
          <span>Forensic Trauma Scanner v2.0 (PFT-Sim)</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            100% Offline Engine
          </span>
          <div className="flex items-center gap-3 text-zinc-400">
            <Minimize2 size={13} className="hover:text-white cursor-pointer" />
            <Maximize2 size={13} className="hover:text-white cursor-pointer" />
            <X size={13} className="hover:text-red-400 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ── 2. TRADITIONAL DESKTOP MENU BAR ── */}
      <div className="h-7 bg-[#1C1C1F] border-b border-zinc-800 flex items-center px-3 gap-5 text-xs text-zinc-300 select-none">
        <span
          className="hover:text-white cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          File
        </span>
        <span className="hover:text-white cursor-pointer">Edit</span>
        <span className="hover:text-white cursor-pointer">View</span>
        <span className="hover:text-white cursor-pointer">Measure</span>
        <span className="hover:text-white cursor-pointer">Forensic Analysis</span>
        <span
          className="hover:text-white cursor-pointer"
          onClick={handleExportPDF}
        >
          Reports
        </span>
        <span className="hover:text-white cursor-pointer">Help</span>
      </div>

      {/* ── 3. RIBBON ACTION TOOLBAR ── */}
      <div className="h-14 bg-[#202024] border-b border-zinc-800 flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".glb,.gltf,.obj,.ply,.stl"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center px-3 py-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <FolderOpen size={16} className="text-amber-400" />
            <span className="text-[10px] mt-0.5">Load Scan</span>
          </button>

          <div className="h-8 w-px bg-zinc-700 mx-1" />

          <button
            onClick={() => setActiveTool("calibrate")}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
              activeTool === "calibrate"
                ? "bg-zinc-800 text-teal-400 border border-teal-500/40"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="text-[10px] mt-0.5">ABFO Calibrator</span>
          </button>

          <button
            onClick={() => setActiveTool("ruler")}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
              activeTool === "ruler"
                ? "bg-zinc-800 text-yellow-400 border border-yellow-500/40"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <Ruler size={16} />
            <span className="text-[10px] mt-0.5">Geodesic Ruler</span>
          </button>

          <button
            onClick={() => setActiveTool("depth")}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
              activeTool === "depth"
                ? "bg-zinc-800 text-cyan-400 border border-cyan-500/40"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <ArrowDownToLine size={16} />
            <span className="text-[10px] mt-0.5">Depth Profiler</span>
          </button>

          <button
            onClick={() => {
              setActiveTool("slicer");
              setShowSlicerPlane(!showSlicerPlane);
            }}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
              showSlicerPlane
                ? "bg-zinc-800 text-sky-400 border border-sky-500/40"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <Spline size={16} />
            <span className="text-[10px] mt-0.5">Cross-Section Slicer</span>
          </button>

          <button
            onClick={() => setShowDepthColormap(!showDepthColormap)}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded transition ${
              showDepthColormap
                ? "bg-zinc-800 text-emerald-400 border border-emerald-500/40"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <Layers size={16} />
            <span className="text-[10px] mt-0.5">Depth Colorbar</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold shadow-md transition"
          >
            <FileText size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── 4. MAIN WORKSTATION BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── CENTER: 3D DIAGNOSTIC VIEWPORT ── */}
        <div className="flex-1 relative bg-[#18181B]">
          <Canvas3D
            modelPath={modelPath}
            activeTool={activeTool}
            metrics={metrics}
            showSlicerPlane={showSlicerPlane}
            showDepthColormap={showDepthColormap}
          />

          {/* ── 2D CROSS-SECTION DEPTH GRAPH (FLOATING SUB-WINDOW) ── */}
          {show2DCrossSection && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[480px] bg-[#1C1C20]/95 backdrop-blur-md border border-zinc-700/80 rounded-md shadow-2xl z-20">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-[#232328] text-xs font-mono text-zinc-300">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Spline size={12} className="text-teal-400" />
                  2D Cross-sectional Depth curve of the wound
                </span>
                <X
                  size={13}
                  className="cursor-pointer hover:text-red-400 text-zinc-500"
                  onClick={() => setShow2DCrossSection(false)}
                />
              </div>

              <div className="p-3">
                <div className="relative h-28 w-full border-b border-l border-zinc-700 flex items-center justify-center">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-rows-3 grid-cols-4 pointer-events-none opacity-20 border-t border-r border-zinc-700">
                    <div className="border-b border-r border-zinc-700" />
                    <div className="border-b border-r border-zinc-700" />
                    <div className="border-b border-r border-zinc-700" />
                    <div className="border-b border-zinc-700" />
                  </div>

                  {/* SVG 2D Depth Profile Curve (Parabolic / Incised Profile) */}
                  <svg className="w-full h-full overflow-visible">
                    {/* Baseline da lành (Z = 0) */}
                    <line
                      x1="0"
                      y1="12"
                      x2="450"
                      y2="12"
                      stroke="#71717a"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    {/* Đường cong trắc diện đáy vết thương */}
                    <path
                      d="M 30 12 C 90 12, 130 96, 225 96 C 320 96, 360 12, 420 12"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />
                    {/* Đáy sâu nhất */}
                    <circle cx="225" cy="96" r="4" fill="#facc15" />
                  </svg>

                  {/* Axis Labels */}
                  <span className="absolute top-1 left-1 text-[9px] font-mono text-zinc-400">
                    0 mm (Skin Baseline)
                  </span>
                  <span className="absolute bottom-1 right-2 text-[9px] font-mono text-yellow-400">
                    Dmax: -{metrics.maxDepth.toFixed(1)} mm
                  </span>
                </div>

                <div className="flex justify-between text-[9px] font-mono text-zinc-400 mt-1.5 px-2">
                  <span>-40 mm</span>
                  <span>-20 mm</span>
                  <span>0 mm (Center)</span>
                  <span>+20 mm</span>
                  <span>+40 mm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: FORENSIC PATHOLOGY INSPECTOR ── */}
        <div className="w-80 bg-[#1C1C20] border-l border-zinc-800 flex flex-col justify-between p-4 overflow-y-auto z-10 select-none">
          <div className="space-y-4">
            <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Forensic Pathology Inspector
              </h2>
            </div>

            {/* Case Metadata */}
            <div className="bg-[#24242A] p-2.5 rounded border border-zinc-700/60 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Case Metadata
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Case No:</span>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-28 bg-[#18181B] text-zinc-200 px-2 py-0.5 rounded border border-zinc-700 text-right font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Examiner:</span>
                <input
                  type="text"
                  value={examiner}
                  onChange={(e) => setExaminer(e.target.value)}
                  className="w-36 bg-[#18181B] text-zinc-200 px-2 py-0.5 rounded border border-zinc-700 text-right text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Tabular Morphometry Metrics (Standard Y tế) */}
            <div className="bg-[#24242A] p-2.5 rounded border border-zinc-700/60 space-y-2.5">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Tabular Morphometry Metrics
              </span>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-zinc-800">
                    <td className="py-1.5 text-zinc-400">Geodesic Length</td>
                    <td className="py-1.5 text-right font-mono font-bold text-yellow-300">
                      {metrics.geodesicLength.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-1.5 text-zinc-400">Width</td>
                    <td className="py-1.5 text-right font-mono font-bold text-white">
                      {metrics.maxWidth.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-1.5 text-zinc-400">Max Depth</td>
                    <td className="py-1.5 text-right font-mono font-bold text-yellow-300">
                      {metrics.maxDepth.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-800">
                    <td className="py-1.5 text-zinc-400">Mean Depth</td>
                    <td className="py-1.5 text-right font-mono text-zinc-300">
                      {metrics.meanDepth.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-zinc-400">Cavity Volume</td>
                    <td className="py-1.5 text-right font-mono text-zinc-300">
                      {metrics.cavityVolume.toLocaleString()} mm³
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Margin Edge Analysis */}
            <div className="bg-[#24242A] p-2.5 rounded border border-zinc-700/60 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Margin Edge Analysis
              </span>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Sharp Force Incised</span>
                <span className="text-[10px] text-zinc-500">vs</span>
                <span>Blunt Trauma</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full w-[92%]" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>92% Sharp Force Match</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={handleExportPDF}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
            >
              <FileText size={15} />
              Export Forensic Report (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulator;