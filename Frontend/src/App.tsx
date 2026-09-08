import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load main Forensic Trauma Workspace
const Simulator = lazy(() => import("./pages/Simulator"));

const LoadingPage = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#0A0F1D",
      fontFamily: "system-ui, -apple-system, sans-serif",
      flexDirection: "column",
      gap: 24,
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solid rgba(59, 130, 246, 0.2)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px",
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
        }}
      />
      <p
        style={{
          color: "#94a3b8",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "0.05em",
        }}
      >
        Khởi tạo Hệ thống Giám định Pháp y (Forensic Trauma Workstation)...
      </p>
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
