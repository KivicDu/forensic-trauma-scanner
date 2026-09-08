import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser(null);
      }
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(10, 15, 30, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(59, 130, 246, 0.2)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 20px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo & App Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              boxShadow: "0 0 12px rgba(59, 130, 246, 0.4)",
            }}
          >
            ⚖️
          </div>
          <div>
            <span
              style={{
                fontSize: "1.05rem",
                color: "#f8fafc",
                fontWeight: 700,
                letterSpacing: "0.03em",
                fontFamily: "sans-serif",
              }}
            >
              PFT-Sim
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#38bdf8",
                marginLeft: 8,
                background: "rgba(56, 189, 248, 0.1)",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              Pediatric Forensic Trauma Scanner
            </span>
          </div>
        </div>

        {/* Status Indicator & Offline Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              color: "#4ade80",
              background: "rgba(74, 222, 128, 0.1)",
              padding: "4px 10px",
              borderRadius: 20,
              border: "1px solid rgba(74, 222, 128, 0.3)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 8px #4ade80",
              }}
            />
            Offline Ready
          </div>

          {/* User Profile / Logout */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#cbd5e1",
                }}
              >
                👤 {user.name || user.email || "Bác sĩ / Giám định viên"}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: "0.78rem",
                  transition: "all 0.2s",
                }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "#3b82f6",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 600,
              }}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;

