import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load main Forensic Trauma Workspace
const Simulator = lazy(() => import("./pages/Simulator"));

const LoadingPage = () => (
  <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#F8FAFC] font-sans">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
      <span className="text-xs font-medium text-slate-500 tracking-wider">
        Loading...
      </span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Simulator />
            </Suspense>
          }
        />
        <Route
          path="/workspace"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Simulator />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
