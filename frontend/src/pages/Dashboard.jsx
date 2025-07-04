// DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaComment, FaSignOutAlt, FaBook } from "react-icons/fa";
import SubjectWiseChart from "../components/ChatStatsChart";

const SidebarLayout = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const user       = JSON.parse(localStorage.getItem("user") || "{}");
  const [userRole, setUserRole] = useState(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    // Fetch user role from token or API
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
        });
        const data = await res.json();
        setUserRole(data.role || 'student');
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole('student'); // Default to student
      }
    };
    
    fetchUserRole();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Debug function to check chat data
  const debugChatData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/debug-chat-data`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      const data = await res.json();
      console.log("=== DEBUG CHAT DATA ===");
      console.log(JSON.stringify(data, null, 2));
      alert("Check console for debug data");
    } catch (err) {
      console.error("Error fetching debug data:", err);
    }
  };

  return (
    <div className="d-flex">
      {/* ───── Sidebar ───── */}
      <aside
        className="bg-dark text-light d-flex flex-column p-3"
        style={{ width: 220, minHeight: "100vh" }}
      >
        <h5 className="mb-4">Classroom Assistant</h5>

        <nav className="flex-grow-1">
          <ul className="list-unstyled">

            <li className="mb-3">
              <Link
                to="/dashboard"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/dashboard") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaHome className="me-2" />
                Dashboard
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/subjects"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/subjects") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaBook className="me-2" />
                Subjects
              </Link>
            </li>

            <li className="mb-3">
              {/* 👉 both `to` and active‑check use /chat */}
              <Link
                to="/teacher-chat"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/chat") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaComment className="me-2" />
                Chat Assistant
              </Link>
            </li>

            <li className="mt-4">
              <button
                onClick={handleLogout}
                className="btn btn-link p-0 text-danger d-flex align-items-center"
              >
                <FaSignOutAlt className="me-2" />
                Logout
              </button>
            </li>

          </ul>
        </nav>

        <footer className="small text-secondary">
          © 2025 OpenVINO™ Assistant
        </footer>
      </aside>

      {/* ───── Main content ───── */}
      <main className="flex-grow-1 p-4" style={{ background: "#000", color: "#fff" }}>
        <div className="mb-4">
          <h2 className="text-white mb-2">📊 Dashboard</h2>
          {userRole === 'teacher' ? (
            <p className="text-muted">
              View aggregated statistics of all student questions by subject. This shows the overall learning trends across your classroom. Teacher conversations are excluded from these statistics.
            </p>
          ) : (
            <p className="text-muted">
              Track your questions and doubts by subject. The "General" category includes questions asked without a specific subject context.
            </p>
          )}
          
          {/* Temporary debug button */}
          <button 
            onClick={debugChatData}
            className="btn btn-sm btn-outline-warning"
            style={{ fontSize: "12px" }}
          >
            🔍 Debug Chat Data (Check Console)
          </button>
        </div>
        
        {/* Put <Outlet/> if you want nested routing */}
        <SubjectWiseChart userRole={userRole} />
      </main>
    </div>
  );
};

export default SidebarLayout;
