// DashboardPage.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaComment, FaSignOutAlt } from "react-icons/fa";
import SubjectWiseChart from "../components/ChatStatsChart";

const SidebarLayout = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const user       = JSON.parse(localStorage.getItem("user") || "{}");

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
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
        {/* Put <Outlet/> if you want nested routing */}
        <SubjectWiseChart />
      </main>
    </div>
  );
};

export default SidebarLayout;
